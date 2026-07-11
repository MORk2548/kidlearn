import argparse
import base64
import hashlib
import hmac
import json
import os
import secrets
import socket
import ssl
import sys
import struct
from pathlib import Path


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def pack_message(msg_type: bytes, payload: bytes) -> bytes:
    return msg_type + struct.pack("!I", len(payload) + 4) + payload


def read_exact(sock: ssl.SSLSocket, length: int) -> bytes:
    chunks = []
    remaining = length
    while remaining > 0:
        chunk = sock.recv(remaining)
        if not chunk:
            raise ConnectionError("unexpected EOF from PostgreSQL server")
        chunks.append(chunk)
        remaining -= len(chunk)
    return b"".join(chunks)


def read_message(sock: ssl.SSLSocket) -> tuple[str, bytes]:
    msg_type = read_exact(sock, 1).decode("ascii")
    length = struct.unpack("!I", read_exact(sock, 4))[0]
    payload = read_exact(sock, length - 4)
    return msg_type, payload


def parse_error(payload: bytes) -> str:
    parts = []
    for field in payload.split(b"\x00"):
        if len(field) > 1:
            parts.append(field[1:].decode("utf-8", "replace"))
    return " | ".join(parts) or "unknown PostgreSQL error"


def parse_scram_fields(message: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for part in message.split(","):
        if "=" in part:
            key, value = part.split("=", 1)
            fields[key] = value
    return fields


def xor_bytes(left: bytes, right: bytes) -> bytes:
    return bytes(a ^ b for a, b in zip(left, right))


class PgClient:
    def __init__(self, host: str, port: int, database: str, user: str, password: str) -> None:
        self.host = host
        self.port = port
        self.database = database
        self.user = user
        self.password = password
        self.sock: ssl.SSLSocket | None = None

    def connect(self) -> None:
        raw_sock = socket.create_connection((self.host, self.port), timeout=20)

        raw_sock.sendall(struct.pack("!II", 8, 80877103))
        ssl_response = read_exact(raw_sock, 1)
        if ssl_response != b"S":
            raw_sock.close()
            raise RuntimeError("server refused SSL")

        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        self.sock = context.wrap_socket(raw_sock, server_hostname=self.host)

        params = (
            b"user\x00" + self.user.encode("utf-8") + b"\x00" +
            b"database\x00" + self.database.encode("utf-8") + b"\x00" +
            b"client_encoding\x00UTF8\x00" +
            b"\x00"
        )
        startup = struct.pack("!I", 196608) + params
        self.sock.sendall(struct.pack("!I", len(startup) + 4) + startup)
        self._authenticate()
        self._drain_until_ready()

    def _authenticate(self) -> None:
        if not self.sock:
            raise RuntimeError("socket not connected")

        expected_server_sig: str | None = None
        while True:
            msg_type, payload = read_message(self.sock)
            if msg_type == "R":
                auth_code = struct.unpack("!I", payload[:4])[0]
                if auth_code == 0:
                    return
                if auth_code == 10:
                    mechanisms = payload[4:].split(b"\x00")
                    if b"SCRAM-SHA-256" not in mechanisms:
                        raise RuntimeError("SCRAM-SHA-256 not offered by server")
                    client_nonce = base64.b64encode(secrets.token_bytes(18)).decode("ascii")
                    client_first_bare = f"n={self.user},r={client_nonce}"
                    self._last_client_first_bare = client_first_bare
                    client_first = f"n,,{client_first_bare}".encode("utf-8")
                    mech = b"SCRAM-SHA-256\x00"
                    ir = struct.pack("!I", len(client_first)) + client_first
                    self.sock.sendall(pack_message(b"p", mech + ir))
                    continue
                if auth_code == 11:
                    server_first = payload[4:].decode("utf-8")
                    fields = parse_scram_fields(server_first)
                    client_nonce = fields["r"]
                    salt = base64.b64decode(fields["s"])
                    iterations = int(fields["i"])
                    client_first_bare = self._last_client_first_bare
                    client_final_wo_proof = f"c=biws,r={client_nonce}"
                    auth_message = f"{client_first_bare},{server_first},{client_final_wo_proof}".encode("utf-8")
                    salted = hashlib.pbkdf2_hmac("sha256", self.password.encode("utf-8"), salt, iterations)
                    client_key = hmac.new(salted, b"Client Key", hashlib.sha256).digest()
                    stored_key = hashlib.sha256(client_key).digest()
                    client_sig = hmac.new(stored_key, auth_message, hashlib.sha256).digest()
                    client_proof = base64.b64encode(xor_bytes(client_key, client_sig)).decode("ascii")
                    server_key = hmac.new(salted, b"Server Key", hashlib.sha256).digest()
                    expected_server_sig = base64.b64encode(
                        hmac.new(server_key, auth_message, hashlib.sha256).digest()
                    ).decode("ascii")
                    client_final = f"{client_final_wo_proof},p={client_proof}".encode("utf-8")
                    self.sock.sendall(pack_message(b"p", client_final))
                    continue
                if auth_code == 12:
                    server_final = payload[4:].decode("utf-8")
                    fields = parse_scram_fields(server_final)
                    if expected_server_sig and fields.get("v") != expected_server_sig:
                        raise RuntimeError("server SCRAM signature mismatch")
                    continue
                raise RuntimeError(f"unsupported auth code {auth_code}")
            if msg_type == "S" or msg_type == "K":
                continue
            if msg_type == "E":
                raise RuntimeError(parse_error(payload))
            if msg_type == "Z":
                return

    @property
    def _last_client_first_bare(self) -> str:
        if not hasattr(self, "__client_first_bare"):
            raise RuntimeError("SCRAM state missing")
        return getattr(self, "__client_first_bare")

    @_last_client_first_bare.setter
    def _last_client_first_bare(self, value: str) -> None:
        setattr(self, "__client_first_bare", value)

    def _drain_until_ready(self) -> None:
        if not self.sock:
            raise RuntimeError("socket not connected")
        while True:
            msg_type, payload = read_message(self.sock)
            if msg_type == "Z":
                return
            if msg_type == "E":
                raise RuntimeError(parse_error(payload))

    def query(self, sql: str) -> dict:
        if not self.sock:
            raise RuntimeError("socket not connected")

        self.sock.sendall(pack_message(b"Q", sql.encode("utf-8") + b"\x00"))
        columns: list[str] = []
        rows: list[dict[str, str | None]] = []
        notices: list[str] = []
        commands: list[str] = []

        while True:
            msg_type, payload = read_message(self.sock)
            if msg_type == "T":
                field_count = struct.unpack("!H", payload[:2])[0]
                idx = 2
                columns = []
                for _ in range(field_count):
                    end = payload.index(b"\x00", idx)
                    columns.append(payload[idx:end].decode("utf-8"))
                    idx = end + 19
            elif msg_type == "D":
                field_count = struct.unpack("!H", payload[:2])[0]
                idx = 2
                row: dict[str, str | None] = {}
                for i in range(field_count):
                    size = struct.unpack("!I", payload[idx:idx + 4])[0]
                    idx += 4
                    if size == 0xFFFFFFFF:
                        row[columns[i]] = None
                    else:
                        row[columns[i]] = payload[idx:idx + size].decode("utf-8")
                        idx += size
                rows.append(row)
            elif msg_type == "C":
                commands.append(payload[:-1].decode("utf-8", "replace"))
            elif msg_type == "N":
                notices.append(parse_error(payload))
            elif msg_type == "E":
                raise RuntimeError(parse_error(payload))
            elif msg_type == "Z":
                return {"rows": rows, "commands": commands, "notices": notices}

    def close(self) -> None:
        if self.sock:
            try:
                self.sock.sendall(pack_message(b"X", b""))
            except OSError:
                pass
            self.sock.close()
            self.sock = None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env", default=str(Path(__file__).resolve().parents[1] / ".env"))
    parser.add_argument("--query")
    parser.add_argument("--file")
    args = parser.parse_args()

    load_env(Path(args.env))
    host = os.environ["DB_HOST"]
    port = int(os.environ.get("DB_PORT", "5432"))
    database = os.environ.get("DB_NAME", "postgres")
    user = os.environ["DB_USER"]
    password = os.environ["DB_PASS"]

    sql = args.query
    if args.file:
        sql = Path(args.file).read_text(encoding="utf-8")
    if not sql and not sys.stdin.isatty():
        sql = sys.stdin.read()
    if not sql:
        raise SystemExit("provide --query or --file")

    client = PgClient(host, port, database, user, password)
    try:
        client.connect()
        result = client.query(sql)
        print(json.dumps({"ok": True, **result}, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return 1
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
