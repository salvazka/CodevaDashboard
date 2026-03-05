-- 1. Create service_tickets table
CREATE TABLE IF NOT EXISTS public.service_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    guest_name TEXT,
    guest_phone TEXT,
    device_model TEXT,
    device_accessories TEXT,
    device_condition TEXT,
    activity_name TEXT NOT NULL,
    service_type TEXT NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    package_tier TEXT,
    location TEXT,
    technician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    transport_fee NUMERIC DEFAULT 0,
    estimated_total NUMERIC DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'Scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for service_tickets
ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all auth users" ON public.service_tickets
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for all auth users" ON public.service_tickets
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for all auth users" ON public.service_tickets
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for all auth users" ON public.service_tickets
    FOR DELETE USING (auth.role() = 'authenticated');

-- 2. Remove items column from transactions
ALTER TABLE public.transactions DROP COLUMN IF EXISTS items;

-- 3. Ensure transaction_items has CASCADE DELETE on transaction_id
-- We need to drop the existing constraint and add the new one.
-- First find the constraint name, typically transaction_items_transaction_id_fkey
ALTER TABLE public.transaction_items DROP CONSTRAINT IF EXISTS transaction_items_transaction_id_fkey;
ALTER TABLE public.transaction_items 
    ADD CONSTRAINT transaction_items_transaction_id_fkey 
    FOREIGN KEY (transaction_id) 
    REFERENCES public.transactions(id) 
    ON DELETE CASCADE;
