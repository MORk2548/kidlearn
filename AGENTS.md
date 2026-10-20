# Repository Guidelines

## Project Structure & Modules

KidLearn is a browser based learning app with a PHP API and PostgreSQL/Supabase database support. The root contains the entry pages (`index.html`, `register.html`, `app.html`) and shared `style.css`. Frontend modules live in `js/` (API/auth, game play and editing, routing, and role dashboards); `api/` contains PHP endpoints and database setup scripts. SQL schemas and lesson/question seeds are in the root and `content/`. Game images are in `images/`; Docker configuration is in `docker/` and `docker-compose.yml`; maintenance scripts are in `scripts/`.

## Build, Test, and Development

There is no package manager manifest or frontend build step. Run the app locally with Docker:

```sh
docker compose up -d
docker compose logs -f
docker compose down
```

The site is served at `http://localhost:8080`; check API availability at `/api/backend.php?action=health`. Configure database credentials in a local `.env` using `.env.example` as a reference. Run the existing database/API smoke check from PowerShell with `./scripts/db/smoke-test.ps1` (review its parameters before use).

## Coding Style & Naming

Follow the surrounding file conventions: keep frontend code in the existing plain JavaScript modules, use descriptive camelCase names for JavaScript functions and variables, and use clear snake_case for PHP functions/variables where already established. Indent consistently with nearby code (JavaScript and PHP generally use four spaces). Keep game logic in `js/game.js`, API calls in `js/api.js`, and database operations in the backend rather than duplicating them in page scripts. Use lowercase, descriptive filenames, preserving existing names when editing.

## Testing Guidelines

No unit test framework or coverage requirement is configured. For API or database changes, run the smoke check and verify the health endpoint. For UI/game changes, open the affected page in a browser and exercise the changed flow, including a narrow viewport when layout is affected. Include reproducible verification steps in your change description.

## Commits and Pull Requests

Recent commit subjects are short and task-focused, often written in Thai; use a concise imperative summary that identifies the change. Pull requests should explain the user-visible behavior and implementation, link related issues when available, list checks performed, and include screenshots for visual changes.

## Security and Configuration

Never commit `.env`, credentials, database dumps containing real data, or local backups. Keep secrets in environment variables; use `.env.example` for safe configuration documentation. Treat SQL seeds and schema edits as data migrations and describe their application order.
