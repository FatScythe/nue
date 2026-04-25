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

### 6. Database Migrations (dbmate)

We use `dbmate` for database schema management. Instead of calling `dbmate` directly, use the provided `pnpm` scripts which automatically load the correct environment variables (like `DATABASE_URL` and `DATABASE_NAME`) from your `_env/core.env` file.

#### Available Migration Commands

| Action         | Command                  | Description                                                     |
| :------------- | :----------------------- | :-------------------------------------------------------------- |
| **Create**     | `pnpm run db:new <name>` | Generates a new migration file in the `db/migrations` folder.   |
| **Migrate Up** | `pnpm run db:up`         | Applies all pending migrations to the database.                 |
| **Rollback**   | `pnpm run db:down`       | Reverts the last migration applied.                             |
| **Status**     | `pnpm run db:status`     | Shows which migrations have been applied and which are pending. |

#### Usage Examples

- **To create a new table (e.g., account_liens):**

  ```bash
  pnpm run db:new create_account_liens_table
  ```

  _This creates a `.sql` file. Open it and add your `UP` and `DOWN` blocks._

- **To apply changes to your local database:**

  ```bash
  pnpm run db:up
  ```

- **To fix a mistake by rolling back the last change:**
  ```bash
  pnpm run db:down
  ```

### 7. Migration Wrapper Logic

The `db-migrate.mjs` script acts as a bridge. It performs the following logic to ensure the database connection is secure and accurate:

1.  **Environment Loading:** It targets `./_env/core.env` specifically.
2.  **URL Construction:** It intelligently merges the `DATABASE_URL` and `DATABASE_NAME` (handling trailing slashes) to create a `fullUrl`.
3.  **Command Forwarding:** It uses `execSync` to pass your arguments (up, down, status) directly to the `dbmate` binary using the `-u` flag.

---

### 8. Troubleshooting Migrations

If you encounter a `connection refused` error during migration:

1. Ensure your PostgreSQL service is running.
2. Verify that the `DATABASE_URL` in `_env/core.env` uses `127.0.0.1` instead of `localhost` if you are on Node 18+.
3. Check that the database specified in `DATABASE_NAME` actually exists (dbmate will attempt to create it if it doesn't).
