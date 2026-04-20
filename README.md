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
