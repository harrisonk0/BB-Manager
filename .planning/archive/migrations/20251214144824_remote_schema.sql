drop extension if exists "pg_net";


  create table "public"."audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "section" text,
    "timestamp" timestamp with time zone not null default now(),
    "user_email" text not null,
    "action_type" text not null,
    "description" text not null,
    "revert_data" jsonb not null,
    "reverted_log_id" uuid,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."boys" (
    "id" text not null default gen_random_uuid(),
    "section" text not null,
    "name" text not null,
    "squad" integer not null,
    "year" text not null,
    "marks" jsonb not null,
    "is_squad_leader" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."invite_codes" (
    "id" text not null,
    "generated_by" text not null,
    "generated_at" timestamp with time zone not null default now(),
    "section" text,
    "is_used" boolean not null default false,
    "used_by" text,
    "used_at" timestamp with time zone,
    "revoked" boolean not null default false,
    "default_user_role" text not null,
    "expires_at" timestamp with time zone not null
      );



  create table "public"."settings" (
    "section" text not null,
    "meeting_day" integer not null,
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."user_roles" (
    "uid" text not null,
    "email" text not null,
    "role" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE UNIQUE INDEX boys_pkey ON public.boys USING btree (id);

CREATE INDEX idx_audit_logs_section_timestamp ON public.audit_logs USING btree (section, "timestamp" DESC);

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp" DESC);

CREATE INDEX idx_boys_section ON public.boys USING btree (section);

CREATE INDEX idx_boys_section_squad ON public.boys USING btree (section, squad);

CREATE INDEX idx_boys_section_year ON public.boys USING btree (section, year);

CREATE INDEX idx_invite_codes_active ON public.invite_codes USING btree (expires_at, is_used, revoked);

CREATE INDEX idx_invite_codes_section ON public.invite_codes USING btree (section);

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role);

CREATE UNIQUE INDEX invite_codes_pkey ON public.invite_codes USING btree (id);

CREATE UNIQUE INDEX settings_pkey ON public.settings USING btree (section);

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (uid);

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."boys" add constraint "boys_pkey" PRIMARY KEY using index "boys_pkey";

alter table "public"."invite_codes" add constraint "invite_codes_pkey" PRIMARY KEY using index "invite_codes_pkey";

alter table "public"."settings" add constraint "settings_pkey" PRIMARY KEY using index "settings_pkey";

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "public"."boys" add constraint "boys_section_check" CHECK ((section = ANY (ARRAY['company'::text, 'junior'::text]))) not valid;

alter table "public"."boys" validate constraint "boys_section_check";

alter table "public"."invite_codes" add constraint "invite_codes_default_user_role_check" CHECK ((default_user_role = ANY (ARRAY['admin'::text, 'captain'::text, 'officer'::text]))) not valid;

alter table "public"."invite_codes" validate constraint "invite_codes_default_user_role_check";

alter table "public"."settings" add constraint "settings_section_check" CHECK ((section = ANY (ARRAY['company'::text, 'junior'::text]))) not valid;

alter table "public"."settings" validate constraint "settings_section_check";

alter table "public"."user_roles" add constraint "user_roles_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'captain'::text, 'officer'::text]))) not valid;

alter table "public"."user_roles" validate constraint "user_roles_role_check";

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant references on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant trigger on table "public"."audit_logs" to "anon";

grant truncate on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant references on table "public"."audit_logs" to "authenticated";

grant select on table "public"."audit_logs" to "authenticated";

grant trigger on table "public"."audit_logs" to "authenticated";

grant truncate on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant references on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant trigger on table "public"."audit_logs" to "service_role";

grant truncate on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."boys" to "anon";

grant insert on table "public"."boys" to "anon";

grant references on table "public"."boys" to "anon";

grant select on table "public"."boys" to "anon";

grant trigger on table "public"."boys" to "anon";

grant truncate on table "public"."boys" to "anon";

grant update on table "public"."boys" to "anon";

grant delete on table "public"."boys" to "authenticated";

grant insert on table "public"."boys" to "authenticated";

grant references on table "public"."boys" to "authenticated";

grant select on table "public"."boys" to "authenticated";

grant trigger on table "public"."boys" to "authenticated";

grant truncate on table "public"."boys" to "authenticated";

grant update on table "public"."boys" to "authenticated";

grant delete on table "public"."boys" to "service_role";

grant insert on table "public"."boys" to "service_role";

grant references on table "public"."boys" to "service_role";

grant select on table "public"."boys" to "service_role";

grant trigger on table "public"."boys" to "service_role";

grant truncate on table "public"."boys" to "service_role";

grant update on table "public"."boys" to "service_role";

grant delete on table "public"."invite_codes" to "anon";

grant insert on table "public"."invite_codes" to "anon";

grant references on table "public"."invite_codes" to "anon";

grant select on table "public"."invite_codes" to "anon";

grant trigger on table "public"."invite_codes" to "anon";

grant truncate on table "public"."invite_codes" to "anon";

grant update on table "public"."invite_codes" to "anon";

grant delete on table "public"."invite_codes" to "authenticated";

grant insert on table "public"."invite_codes" to "authenticated";

grant references on table "public"."invite_codes" to "authenticated";

grant select on table "public"."invite_codes" to "authenticated";

grant trigger on table "public"."invite_codes" to "authenticated";

grant truncate on table "public"."invite_codes" to "authenticated";

grant update on table "public"."invite_codes" to "authenticated";

grant delete on table "public"."invite_codes" to "service_role";

grant insert on table "public"."invite_codes" to "service_role";

grant references on table "public"."invite_codes" to "service_role";

grant select on table "public"."invite_codes" to "service_role";

grant trigger on table "public"."invite_codes" to "service_role";

grant truncate on table "public"."invite_codes" to "service_role";

grant update on table "public"."invite_codes" to "service_role";

grant delete on table "public"."settings" to "anon";

grant insert on table "public"."settings" to "anon";

grant references on table "public"."settings" to "anon";

grant select on table "public"."settings" to "anon";

grant trigger on table "public"."settings" to "anon";

grant truncate on table "public"."settings" to "anon";

grant update on table "public"."settings" to "anon";

grant delete on table "public"."settings" to "authenticated";

grant insert on table "public"."settings" to "authenticated";

grant references on table "public"."settings" to "authenticated";

grant select on table "public"."settings" to "authenticated";

grant trigger on table "public"."settings" to "authenticated";

grant truncate on table "public"."settings" to "authenticated";

grant update on table "public"."settings" to "authenticated";

grant delete on table "public"."settings" to "service_role";

grant insert on table "public"."settings" to "service_role";

grant references on table "public"."settings" to "service_role";

grant select on table "public"."settings" to "service_role";

grant trigger on table "public"."settings" to "service_role";

grant truncate on table "public"."settings" to "service_role";

grant update on table "public"."settings" to "service_role";

grant delete on table "public"."user_roles" to "anon";

grant insert on table "public"."user_roles" to "anon";

grant references on table "public"."user_roles" to "anon";

grant select on table "public"."user_roles" to "anon";

grant trigger on table "public"."user_roles" to "anon";

grant truncate on table "public"."user_roles" to "anon";

grant update on table "public"."user_roles" to "anon";

grant delete on table "public"."user_roles" to "authenticated";

grant insert on table "public"."user_roles" to "authenticated";

grant references on table "public"."user_roles" to "authenticated";

grant select on table "public"."user_roles" to "authenticated";

grant trigger on table "public"."user_roles" to "authenticated";

grant truncate on table "public"."user_roles" to "authenticated";

grant update on table "public"."user_roles" to "authenticated";

grant delete on table "public"."user_roles" to "service_role";

grant insert on table "public"."user_roles" to "service_role";

grant references on table "public"."user_roles" to "service_role";

grant select on table "public"."user_roles" to "service_role";

grant trigger on table "public"."user_roles" to "service_role";

grant truncate on table "public"."user_roles" to "service_role";

grant update on table "public"."user_roles" to "service_role";


