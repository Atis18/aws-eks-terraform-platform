CREATE TABLE equipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    type VARCHAR(100) NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);