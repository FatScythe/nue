# Nue

**Nue** is a modern, scalable **Core Banking Application (CBA)** starter kit. It is built as a modular monorepo designed for financial data precision, architectural clarity, and high-performance transaction processing.

## 🚀 The Stack

- **Framework:** [NestJS](https://nestjs.com/) (Modular Monorepo)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Cache/Queue:** [Redis](https://redis.io/)
- **Language:** TypeScript
- **Package Manager:** `pnpm`

## 🏗️ Architecture

Nue follows a clean, domain-driven structure to separate concerns across banking operations:

- **Apps:**
  - `core-service`: The engine for primary banking logic, ledgers, and transactions.
  - `portal-api`: Dedicated API for administrative tasks and staff management.
  - `worker-service`: Background worker for asynchronous tasks like notifications and transaction processing.
- **Libs:**
  - `database`: Centralized schema definitions, migrations, and shared repositories.
  - `common`: Shared utilities, DTOs, and global filters.

## 🛠️ Getting Started

### 1. Prerequisites

Ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (for running Postgres and Redis)

### 2. Environment Setup

Nue uses environment variables to manage connections. Copy the example file to get started:

```bash
cd _env
```

```bash
cp .env.example .env
```

### 3. Install Project Dependencies

Run this from the root directory to install all packages for the apps and shared libraries:

```bash
pnpm install
```

### 4. Running the Application

Nue is built as a monorepo. You can run each service individually in development mode using the following commands:

```bash
# start the Core Banking Engine (Port 3000)
pnpm run start:dev

# start the Portal Service
pnpm run start:dev:portal

# start the Worker Service
pnpm run start:dev:worker
```

### 5. Production Build

To prepare the application for a production environment:

```bash
# build all services
pnpm run build

# run the production build for the core service
pnpm run start:prod
```

Since you are using a custom wrapper (`db-migrate.mjs`) to handle the environment variables from your `_env` folder, your documentation needs to reflect how to call that script via `pnpm` while still utilizing the power of `dbmate`.

Here is the continuation of your markdown guide:

---

### 6. Database Migrations (Drizzle Kit)

Use **Drizzle Kit** for database schema management. Instead of calling the CLI directly, use the provided `pnpm` scripts. These scripts automatically handle environment variable injection (like `DATABASE_URL` and/or `DATABASE_NAME`) from your `_env/core.env` file using the configuration defined in `drizzle.config.ts`.

#### Available Migration Commands

| Action       | Command                              | Description                                                                             |
| :----------- | :----------------------------------- | :-------------------------------------------------------------------------------------- |
| **Generate** | `pnpm run db:generate --name <name>` | Compares your TS schema to the last snapshot and creates a named `.sql` migration file. |
| **Migrate**  | `pnpm run db:migrate`                | Applies all pending `.sql` migrations to the local PostgreSQL database.                 |
| **Studio**   | `pnpm run db:studio`                 | Opens a GUI in your browser to view and edit your database data.                        |
| **Seed**     | `pnpm run db:seed`                   | Populates the database with initial required data (e.g., system roles, offices).        |

#### Usage Examples

- **To create a new migration (after changing your TypeScript schema):**

  ```bash
  pnpm run db:generate --name add_office_to_users
  ```

  _This generates a versioned `.sql` file in `libs/database/migrations`. Review this file before applying._

- **To apply schema changes to your local database:**

  ```bash
  pnpm run db:migrate
  ```

- **To push changes instantly (Development Only):**
  _Use `drizzle-kit push` if you want to sync the DB without creating migration files (Note: this can be destructive)._

---

### 7. Migration Logic & Workflow

Drizzle Kit operates on a **Forward-Only** philosophy. Unlike `dbmate`, there is no explicit `db:down` command.

1. **Schema-First:** Always update your TypeScript files in `libs/database/src/lib/schema/` first.
2. **Type Safety:** The generator will verify that your foreign key references match (e.g., ensuring `office_id` is an `integer` if it references a `serial` primary key).
3. **Environment Injection:** The toolkit reads the `core.env` file to establish the connection string: `postgresql://<user>:<pass>@localhost:5432/<db_name>`.

---

### 8. Troubleshooting Migrations

If you encounter an `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` or connection errors:

1. **Type Mismatch:** Ensure Primary Keys and Foreign Keys share the exact same data type (e.g., `UUID` to `UUID`, not `UUID` to `Integer`).
2. **Null Violations:** If you `SET NOT NULL` on a column that already has data, the migration will fail. You must clear or update existing rows first.
3. **Connection Refused:**
   - Verify PostgreSQL is running on port `5432`.
   - If using Node 18+, ensure your `DATABASE_URL` uses `127.0.0.1` instead of `localhost` to avoid IPv6 resolution issues.
4. **Out of Sync:** If the migration state becomes corrupted during development, you can safely drop the `public` schema and re-run `db:migrate` to start fresh.

---

### Root package.json Scripts

```json
"scripts": {
  "db:generate": "pnpm --filter ./libs/database run db:generate",
  "db:migrate": "pnpm --filter ./libs/database run db:migrate",
  "db:studio": "pnpm --filter ./libs/database run db:studio",
  "db:seed": "pnpm --filter @lib/database run db:seed"
}
```

```

```
