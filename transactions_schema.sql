-- Create Transactions Table
CREATE TABLE transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    total NUMERIC NOT NULL,
    member_id UUID REFERENCES members(id),
    guest_name TEXT,
    payment_method TEXT DEFAULT 'cash',
    items JSONB -- Optional: Store snapshot of items for quick display
);

-- Create Transaction Items Table (Normalized)
CREATE TABLE transaction_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name TEXT NOT NULL, -- Snapshot name in case product changes
    quantity INTEGER NOT NULL,
    price NUMERIC NOT NULL
);

-- Policy (Open for now based on previous instructions, but ideally should be authenticated)
alter table transactions enable row level security;
create policy "Enable all access for all users" on transactions for all using (true) with check (true);

alter table transaction_items enable row level security;
create policy "Enable all access for all users" on transaction_items for all using (true) with check (true);
