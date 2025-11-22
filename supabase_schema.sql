-- Create a simple Key-Value store table to mimic Redis
create table kv_store (
  key text primary key,
  value jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table kv_store enable row level security;

-- Create a policy that allows all operations for the service role
-- The service_role key bypasses RLS by default, but sometimes explicit policies help if context is lost.
-- Alternatively, we can just disable RLS for this table if it's only accessed by the backend.
alter table kv_store disable row level security;
