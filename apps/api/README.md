# Money Flow API

NestJS + TypeORM + PostgreSQL backend for Money Flow.

## Setup

```bash
npm install                       # from the repo root (npm workspaces)
cp .env.example .env              # then fill in your database credentials
```

### Environment

`apps/api/.env` drives both the running app and the database CLI scripts:

| Variable | Default | Notes |
|---|---|---|
| `DB_HOST` | `localhost` | |
| `DB_PORT` | `5432` | |
| `DB_USERNAME` | `postgres` | Must match your Postgres role |
| `DB_PASSWORD` | — | |
| `DB_NAME` | `money_flow` | The database must already exist; migrations do not create it |
| `JWT_SECRET` | — | Use a long random string |
| `JWT_EXPIRES_IN` | `7d` | |
| `PORT` | `3001` | |
| `FRONTEND_URL` | `http://localhost:3000` | CORS origin |
| `NODE_ENV` | `development` | `development` enables SQL query logging |

Create the database once before running migrations:

```bash
createdb money_flow
# or, if Postgres runs in Docker:
docker exec <container> psql -U <user> -c "CREATE DATABASE money_flow"
```

## Database schema (migrations)

The schema is managed **entirely by migrations**. `synchronize` is `false` in
every environment — including development — so the entities never silently
alter your database. Any change to an entity requires a migration.

Run these from `apps/api/` (or from the repo root, where the same four scripts
are proxied to this workspace).

```bash
npm run migration:run                      # apply all pending migrations
npm run migration:show                     # list migrations and their status
npm run migration:revert                   # roll back the most recent migration
npm run migration:generate -- <Name>       # diff entities vs. database, write a migration
```

`migration:generate` requires a name. It becomes a TypeScript class name, so
use PascalCase letters and digits only:

```bash
npm run migration:generate -- AddCurrencyToTransaction   # ✅
npm run migration:generate AddCurrencyToTransaction      # ✅ (npm >= 7)
npm run migration:generate                               # ❌ no name
npm run migration:generate -- add-currency               # ❌ invalid class name
```

The `--` separator is optional on npm 7+ but harmless, and it's required on
npm 6 and older — the docs here use it for portability.

### Typical workflow

1. Edit an entity (e.g. add a column to `transaction.entity.ts`).
2. `npm run migration:generate -- AddFooToTransaction`
   — this diffs your entities against the **current database**, so make sure
   all earlier migrations are applied first.
3. Read the generated file in `src/database/migrations/`. Generated SQL is a
   starting point, not gospel — check the `down()` especially, and edit
   destructive or data-losing statements by hand.
4. `npm run migration:run` to apply it.
5. Commit the migration file alongside the entity change.

Migrations run inside a single transaction, so a failure rolls the whole
migration back.

### First-time setup on an empty database

```bash
npm run migration:run     # creates all 7 tables
npm run seed              # optional demo data
```

The `uuid-ossp` extension is created automatically by the Postgres driver on
connect — no manual `CREATE EXTENSION` needed.

## Seeding

```bash
npm run seed
```

Creates a demo user with the 9 default categories and 8 sample transactions
spread over the last month:

- Email: `demo@moneyflow.test`
- Password: `demo1234`

Override with `SEED_EMAIL` / `SEED_PASSWORD`:

```bash
SEED_EMAIL=me@example.com SEED_PASSWORD=hunter2 npm run seed
```

The seed is **idempotent** — it checks for the demo email first and does
nothing if that user already exists, so re-running is safe. To reseed from
scratch, delete the user (cascades to their categories and transactions) and
run it again.

Note that this CLI seed is separate from `CategoriesService.seedDefaults()`,
which seeds the same 9 default categories for a real user at runtime via the
`categories` controller. The two category lists are kept in sync by hand.

## Running

```bash
npm run start:dev      # watch mode, port 3001
npm run start:prod     # from dist/ — run migration:run during deploy first
npm run build
npm run lint
npm run test
```

## Database tooling internals

`src/database/` holds:

| File | Purpose |
|---|---|
| `data-source-options.ts` | Single source of truth for the connection config and entity list; consumed by both `AppModule` and the CLI |
| `data-source.ts` | `DataSource` for CLI scripts; loads `.env` itself since Nest's `ConfigModule` isn't running |
| `migrate.ts` | The `migration:*` commands |
| `seed.ts` | The `seed` command |
| `migrations/` | Generated migration files — commit these |

### Why not the `typeorm` CLI?

`migrate.ts` reimplements `generate` / `run` / `revert` / `show` on top of the
same DataSource APIs the official CLI uses. This is deliberate: TypeORM 1.0
ships a CommonJS CLI that `require()`s yargs 18, which is ESM-only. Node 20
cannot `require()` an ES module, so `typeorm`, `typeorm-ts-node-commonjs` and
`typeorm-ts-node-esm` all crash with `ERR_REQUIRE_ESM` before reaching any
command.

If this project moves to Node >= 22.12 (which supports `require(esm)`), the
upstream CLI becomes usable and `migrate.ts` can be deleted in favour of the
standard `typeorm -d src/database/data-source.ts <command>` invocations.
