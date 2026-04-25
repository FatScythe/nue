-- migrate:up

-- create custom enum types
CREATE TYPE user_status AS ENUM ('active', 'blocked', 'inactive', 'pending');
CREATE TYPE user_type AS ENUM ('human', 'api');

CREATE TYPE customer_type AS ENUM ('individual', 'corporate');
CREATE TYPE customer_status AS ENUM ('pending_verification', 'under_review', 'active', 'suspended', 'frozen', 'deactivated', 'rejected');
CREATE TYPE customer_tier AS ENUM ('0', '1', '2', '3');

CREATE TYPE account_product AS ENUM ('savings', 'current', 'fixed_deposit', 'loan');
CREATE TYPE currency AS ENUM ('ngn', 'usd');

CREATE TYPE account_status AS ENUM ('pending', 'active', 'suspended', 'frozen', 'pnc', 'pnd', 'closed', 'rejected');

CREATE TYPE transaction_status AS ENUM ('successful', 'failed', 'pending', 'processing', 'reversed');
CREATE TYPE transaction_category AS ENUM ('transfer', 'deposit', 'withdrawal', 'fee', 'interest', 'refund');

CREATE TYPE loan_scheduled_status AS ENUM ('scheduled', 'pending', 'paid', 'overdue', 'waived');
CREATE TYPE loan_repayment_frequency AS ENUM ('daily', 'weekly', 'monthly');

-- create businesses table (needed first for tenant_id references)...
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email_address TEXT UNIQUE NOT NULL,
    short_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- create users table (Base for created_by references)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES businesses,
    status user_status NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    other_name TEXT,
    email_address TEXT,
    hashed_password TEXT,
    otp_key TEXT,
    is_otp_enabled BOOLEAN DEFAULT false,
    type user_type NOT NULL,
    secret_key TEXT UNIQUE,
    ip_address TEXT[],
    role_id UUID, -- will be updated to NOT NULL after roles table exists
    created_by UUID REFERENCES users ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- create roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES businesses,
    name TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{"dashboard":{"view":false},"transaction":{"view":false},"customer":{"view":false},"account":{"view":false},"loan":{"view":false},"ledger":{"view":false},"developer":{"view":false},"team":{"view":false}}',
    created_by UUID REFERENCES users ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- add the foreign key back to users now that roles exists...
ALTER TABLE users ADD CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id);

-- create customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES businesses NOT NULL,
    external_id VARCHAR(255),
    status customer_status NOT NULL,
    tier customer_tier NOT NULL DEFAULT '0',
    type customer_type NOT NULL,
    first_name TEXT,
    last_name TEXT,
    date_of_birth DATE,
    email_address TEXT NOT NULL,
    phone_number VARCHAR(50),
    business_name TEXT,
    date_of_incorporation DATE,
    street TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    documents JSONB DEFAULT '[]',
    created_by UUID REFERENCES users ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- create general_ledgers
CREATE TABLE general_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES businesses NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    category TEXT NOT NULL,
    created_by UUID REFERENCES users ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- create account_products
CREATE TABLE account_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES businesses(id) NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    category account_product NOT NULL, 
    gl_account_id UUID NOT NULL REFERENCES general_ledgers(id) ON DELETE RESTRICT,
    interest_rate NUMERIC(10, 2) DEFAULT 0.00,
    supported_currencies currency[] DEFAULT '{ngn}',
    allow_overdraft BOOLEAN DEFAULT false,
    overdraft_limit BIGINT DEFAULT 0 NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- create accounts table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES businesses NOT NULL,
    customer_id UUID REFERENCES customers NOT NULL,
    product_id UUID REFERENCES account_products NOT NULL,
    status account_status NOT NULL DEFAULT 'pending',
    account_number TEXT UNIQUE NOT NULL,
    reference TEXT,
    currency currency DEFAULT 'ngn' NOT NULL,
    balance BIGINT DEFAULT 0 NOT NULL,
    book_balance BIGINT DEFAULT 0 NOT NULL,
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_by UUID REFERENCES users ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- create transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES businesses NOT NULL,
    sender_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    receiver_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    amount BIGINT NOT NULL,
    fee BIGINT DEFAULT 0 NOT NULL,
    status transaction_status NOT NULL DEFAULT 'pending',
    category transaction_category NOT NULL,
    reference TEXT UNIQUE NOT NULL,
    narration TEXT,
    currency currency DEFAULT 'ngn' NOT NULL,
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_by UUID REFERENCES users ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- create journal_entries table
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES businesses NOT NULL,
    gl_account_id UUID NOT NULL REFERENCES general_ledgers(id) ON DELETE RESTRICT,
    credit BIGINT DEFAULT 0 NOT NULL,
    debit BIGINT DEFAULT 0 NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- create loan_schedules table
CREATE TABLE loan_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES businesses NOT NULL,
    account_id UUID REFERENCES accounts NOT NULL,
    installment_number INT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    principal_amount BIGINT DEFAULT 0 NOT NULL,
    interest_amount BIGINT DEFAULT 0 NOT NULL,
    total_installment BIGINT DEFAULT 0 NOT NULL,
    principal_paid BIGINT DEFAULT 0 NOT NULL,
    status loan_scheduled_status DEFAULT 'scheduled' NOT NULL,
    interest_paid BIGINT DEFAULT 0 NOT NULL,
    total_paid BIGINT DEFAULT 0 NOT NULL,
    penalty_accrued BIGINT DEFAULT 0 NOT NULL,
    comment TEXT,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users ON DELETE SET NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- create account extension tables
CREATE TABLE savings_details (
    account_id UUID PRIMARY KEY REFERENCES accounts ON DELETE RESTRICT,
    tenant_id UUID REFERENCES businesses NOT NULL,
    target_amount BIGINT NOT NULL,
    tenor_months INT NOT NULL,
    withdrawal_count INT DEFAULT 0 NOT NULL,
    interest_rate NUMERIC(5,2) DEFAULT '0.00',
    target_date TIMESTAMP WITH TIME ZONE,
    lock_period_end TIMESTAMP WITH TIME ZONE
);

CREATE TABLE fixed_deposit_details (
    account_id UUID PRIMARY KEY REFERENCES accounts,
    tenant_id UUID REFERENCES businesses NOT NULL,
    principal_amount BIGINT NOT NULL,
    maturity_date DATE NOT NULL,
    auto_rollover BOOLEAN DEFAULT false,
    penalty_rate NUMERIC(5,2) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE loan_details (
    account_id UUID PRIMARY KEY REFERENCES accounts ON DELETE RESTRICT,
    tenant_id UUID REFERENCES businesses NOT NULL,
    principal_amount BIGINT NOT NULL,
    tenor_months INT NOT NULL,
    repayment_frequency loan_repayment_frequency DEFAULT 'monthly' NOT NULL,
    repayment_day INT DEFAULT 1,
    interest_rate NUMERIC(5,2) DEFAULT '0.00',
    first_payment_date TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- migrate:down

-- drop tables in reverse order of creation to avoid reference errors...
DROP TABLE IF EXISTS loan_details;
DROP TABLE IF EXISTS fixed_deposit_details;
DROP TABLE IF EXISTS savings_details;
DROP TABLE IF EXISTS loan_schedules;
DROP TABLE IF EXISTS journal_entries;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS account_products;
DROP TABLE IF EXISTS general_ledgers;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

-- drop custom types...
DROP TYPE IF EXISTS loan_repayment_frequency;
DROP TYPE IF EXISTS loan_scheduled_status;
DROP TYPE IF EXISTS transaction_category;
DROP TYPE IF EXISTS transaction_status;
DROP TYPE IF EXISTS account_status;
DROP TYPE IF EXISTS currency;
DROP TYPE IF EXISTS account_product;
DROP TYPE IF EXISTS customer_tier;
DROP TYPE IF EXISTS customer_status;
DROP TYPE IF EXISTS customer_type;
DROP TYPE IF EXISTS user_type;
DROP TYPE IF EXISTS user_status;