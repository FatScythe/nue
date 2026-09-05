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
- `portal-service`: Dedicated API for administrative tasks and staff management.
- `worker-service`: Background worker for asynchronous tasks like notifications and transaction processing.

- **Libs:**
- `database`: Centralized schema definitions, migrations, and shared repositories.
- `background-process`: Central contract provider and queue infrastructure shared across services.
- `common`: Shared utilities, DTOs, and global filters.

> **Dependency Rule:** Apps consume Libs (`apps/*` $\rightarrow$ `libs/*`). Libs must **never** import from `apps/*`, and root `package.json` remains strictly for workspace tooling.

---

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
cp .env.example .env

```

### 3. Install Project Dependencies

Run this from the root directory to install all packages across the workspace:

```bash
pnpm install

```

### 4. Running the Application

Nue is built as a monorepo. You can run each service individually in development mode using the following commands:

```bash
# Start the Core Banking Engine (Port 3000)
pnpm run start:dev

# Start the Portal Service
pnpm run start:dev:portal

# Start the Worker Service
pnpm run start:dev:worker

```

### 5. Production Build

To prepare the application for a production environment:

```bash
# Build all services
pnpm run build

# Run the production build for the core service
pnpm run start:prod

```

---

## 📦 Monorepo Workspace Management

Nue strictly enforces package isolation using `pnpm` workspaces. Runtime dependencies belong inside the specific `package.json` of the app or library that consumes them, keeping the root `package.json` reserved strictly for repository-wide development tooling (`typescript`, `eslint`, `prettier`, `jest`).

### 1. Adding and Removing Packages (`pnpm --filter`)

Always target specific packages when managing dependencies using the `--filter` flag with a package name or relative directory path:

#### Adding Dependencies to a Service or Library

```bash
# Target by package name (defined in package.json)
pnpm --filter @lib/background-process add @nestjs/bullmq bullmq

# Target by relative directory path
pnpm --filter ./apps/worker-service add class-validator class-transformer

```

#### Removing Dependencies from a Service or Library

```bash
pnpm --filter @lib/background-process remove bullmq
pnpm --filter ./apps/worker-service remove class-validator

```

#### Managing Root Development Tooling

```bash
# Install shared dev tooling at root (-w / --workspace-root)
pnpm add -Dw typescript eslint prettier

# Remove package accidentally installed at root
pnpm remove -w @nestjs/common bullmq

```

### 2. Generating Workspace Modules

#### Creating a New Application (`apps/`)

To generate a new microservice or standalone application inside `apps/`:

```bash
pnpm exec nest g app <app-name>

```

#### Creating a Shared Library (`libs/`)

To generate a shared library inside `libs/`:

```bash
pnpm exec nest g lib <lib-name>

```

When prompted for the library prefix, enter **`@lib`**:

```text
? What prefix would you like to use for the library? @lib

```

This automatically updates your root `tsconfig.json` path mappings:

```json
"paths": {
  "@lib/your-lib": ["libs/your-lib/src"],
  "@lib/your-lib/*": ["libs/your-lib/src/*"]
}

```

---

## 🗄️ Database Migrations (Drizzle Kit)

Use **Drizzle Kit** for database schema management. Instead of calling the CLI directly, use the provided `pnpm` workspace scripts. These scripts automatically handle environment variable injection from your `_env` files.

### Available Migration Commands

| Action       | Command                              | Description                                                                  |
| ------------ | ------------------------------------ | ---------------------------------------------------------------------------- |
| **Generate** | `pnpm run db:generate --name <name>` | Compares TS schema against the snapshot and creates a `.sql` migration file. |
| **Migrate**  | `pnpm run db:migrate`                | Applies all pending `.sql` migrations to the local PostgreSQL database.      |
| **Studio**   | `pnpm run db:studio`                 | Opens a browser GUI to view and edit database rows.                          |
| **Seed**     | `pnpm run db:seed`                   | Populates initial required system data (e.g., offices, roles, seed users).   |

### Usage Examples

- **Create a new migration (after updating TypeScript schema files):**

```bash
pnpm run db:generate --name add_office_to_users

```

- **Apply pending migrations:**

```bash
pnpm run db:migrate

```

---

## 🔄 Migration Logic & Workflow

Drizzle Kit operates on a **Forward-Only** philosophy.

1. **Schema-First:** Always update your TypeScript schema files in `libs/database/src/lib/schema/` first.
2. **Type Safety:** The generator verifies that foreign key references match exact column types (e.g., `serial` to `integer` or `uuid` to `uuid`).
3. **Environment Injection:** Connection settings are driven by `DATABASE_URL` (e.g., `postgresql://<user>:<pass>@127.0.0.1:5432/<db_name>`).

---

## 🔧 Troubleshooting

1. **Type Mismatch Errors:** Ensure Primary Keys and Foreign Keys share identical types.
2. **Missing Package Filters:** If `pnpm --filter <pkg>` returns _No projects matched_, check the `"name"` property in that module's `package.json` or use relative path syntax (`pnpm --filter ./libs/your-lib ...`).
3. **Connection Refused:** Ensure PostgreSQL is running on port `5432` and use `127.0.0.1` instead of `localhost` on Node.js 18+ to avoid IPv6 resolution issues.
