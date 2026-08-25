# Supabase connection

The PHP API reads the `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASS`
environment variables from `.env`.

1. Copy `.env.example` to `.env`.
2. Replace both password placeholders. Use the database password from your
   Supabase project; do not commit this file.
3. If the password has reserved URL characters, percent-encode it only in
   `DATABASE_URL`. `DB_PASS` must retain the original password.

For Docker development, restart the web service after saving:

```powershell
docker compose up -d --force-recreate web
```

The API connects through Supabase's shared pooler with TLS required.
