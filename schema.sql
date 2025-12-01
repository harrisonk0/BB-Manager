-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- DROP existing tables to ensure clean recreation with correct columns
drop table if exists audit_logs;
drop table if exists boys;
drop table if exists company_audit_logs;
drop table if exists company_boys;
drop table if exists invites;
drop table if exists junior_audit_logs;
drop table if exists junior_boys;
drop table if exists settings;
drop table if exists user_activity;
drop table if exists user_roles;

-- 1. audit_logs
create table audit_logs (
    id text primary key,
    user_email text,
    action_type text,
    description text,
    revert_data jsonb,
    timestamp timestamptz,
    reverted boolean
);

-- 2. boys
create table boys (
    id text primary key,
    name text,
    squad numeric,
    year numeric,
    marks jsonb,
    is_squad_leader boolean
);

-- 3. company_audit_logs
create table company_audit_logs (
    id text primary key,
    user_email text,
    action_type text,
    description text,
    revert_data jsonb,
    timestamp timestamptz
);

-- 4. company_boys
create table company_boys (
    id text primary key,
    name text,
    squad numeric,
    year numeric,
    marks jsonb,
    is_squad_leader boolean
);

-- 5. invites
create table invites (
    id text primary key,
    email text,
    invited_by text,
    invited_at timestamptz,
    is_used boolean
);

-- 6. junior_audit_logs
create table junior_audit_logs (
    id text primary key,
    user_email text,
    action_type text,
    description text,
    revert_data jsonb,
    timestamp timestamptz,
    reverted_log_id text
);

-- 7. junior_boys
create table junior_boys (
    id text primary key,
    name text,
    squad numeric,
    year text, -- Note: Text type detected for junior years
    marks jsonb,
    is_squad_leader boolean
);

-- 8. settings
create table settings (
    id text primary key,
    meeting_day numeric
);

-- 9. user_activity
create table user_activity (
    id text primary key,
    last_active timestamptz
);

-- 10. user_roles
create table user_roles (
    id text primary key,
    email text,
    role text
);

-- Enable Row Level Security (RLS)
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

-- Create default read policies (Adjust for production!)
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