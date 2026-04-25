-- migrate:up
CREATE TYPE lien_status AS ENUM ('active', 'released', 'voided');

CREATE TABLE account_liens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    tenant_id UUID NOT NULL REFERENCES businesses(id),
    amount BIGINT NOT NULL,
    reason TEXT,
    reference TEXT UNIQUE,
    status lien_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES users(id) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- migrate:down
DROP TABLE IF EXISTS account_liens;

-- drop custom type...
DROP TYPE IF EXISTS lien_status;

