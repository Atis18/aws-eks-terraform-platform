CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    first_name VARCHAR(100) NOT NULL
        CHECK (btrim(first_name) <> ''),

    middle_name VARCHAR(100),

    last_name VARCHAR(100) NOT NULL
        CHECK (btrim(last_name) <> ''),

    full_name TEXT GENERATED ALWAYS AS (
        lower(
            btrim(first_name) || ' ' ||
            COALESCE(NULLIF(btrim(middle_name), '') || ' ', '') ||
            btrim(last_name)
        )
    ) STORED,

    position VARCHAR(100) NOT NULL
        CHECK (btrim(position) <> ''),

    level VARCHAR(100) NOT NULL
        CHECK (btrim(level) <> ''),

    equipment_id UUID REFERENCES equipments(id)
        ON DELETE SET NULL,

    created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX employees_full_name_idx ON employees (full_name);