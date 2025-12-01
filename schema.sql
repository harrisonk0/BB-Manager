-- Enable UUID extension just in case
create extension if not exists "uuid-ossp";

-- 1. audit_logs
create table if not exists audit_logs (
    id text primary key,
    action text,
    target_collection text,
    timestamp timestamptz,
    details jsonb,
    performed_by text,
    target_id text
);

-- 2. boys
create table if not exists boys (
    id text primary key,
    name text,
    payments jsonb
);

-- 3. company_audit_logs
create table if not exists company_audit_logs (
    id text primary key,
    action text,
    target_id text,
    timestamp timestamptz,
    performed_by text
);

-- 4. company_boys
create table if not exists company_boys (
    id text primary key,
    name text,
    rank text
);

-- 5. invites
create table if not exists invites (
    id text primary key,
    email text,
    role text,
    invited_by text
);

-- 6. junior_audit_logs
create table if not exists junior_audit_logs (
    id text primary key,
    action text,
    timestamp timestamptz
);

-- 7. junior_boys
create table if not exists junior_boys (
    id text primary key,
    name text
);

-- 8. settings
create table if not exists settings (
    id text primary key,
    theme text,
    notifications_enabled boolean
);

-- 9. user_activity
create table if not exists user_activity (
    id text primary key,
    user_id text,
    last_login timestamptz
);

-- 10. user_roles
create table if not exists user_roles (
    id text primary key,
    role text,
    permissions jsonb
);

-- Enable Row Level Security (RLS) on all tables (Best Practice)
alter table audit_logs enable row level security;
alter table boys enable row level security;
alter table company_audit_logs enable row level security;
alter table company_boys enable row level security;
alter table invites enable row level security;
alter table junior_audit_logs enable row level security;
alter table junior_boys enable row level security;
alter table settings enable row level security;
alter table user_activity enable row level security;
alter table user_roles enable row level security;

-- Create a basic policy to allow authenticated users to read everything (Adjust this later for production security!)
create policy "Allow all for authenticated" on audit_logs for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated" on boys for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated" on company_audit_logs for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated" on company_boys for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated" on invites for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated" on junior_audit_logs for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated" on junior_boys for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated" on settings for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated" on user_activity for all using (auth.role() = 'authenticated');
create policy "Allow all for authenticated" on user_roles for all using (auth.role() = 'authenticated');