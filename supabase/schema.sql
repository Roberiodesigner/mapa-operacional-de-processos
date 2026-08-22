-- Mapa Operacional — Supabase Postgres 17
-- Execute este arquivo inteiro no SQL Editor do projeto Supabase.
-- Ele é idempotente: pode ser executado novamente para reparar políticas e índices.

begin;

create schema if not exists private;

create table if not exists public.workspaces (
  id text primary key,
  owner_user_id uuid unique references auth.users(id) on delete restrict,
  owner_email text not null unique,
  name text not null,
  trial_started_at timestamptz not null,
  trial_ends_at timestamptz not null,
  plan text not null default 'trial',
  created_at timestamptz not null default now()
);

create table if not exists public.platform_admins (
  email text primary key,
  user_id uuid unique references auth.users(id) on delete set null,
  role text not null default 'super_admin',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_plans (
  code text primary key,
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'BRL',
  billing_interval text not null check (billing_interval in ('month', 'year')),
  provider_price_id text not null default '',
  trial_days integer not null default 7 check (trial_days between 0 and 365),
  active boolean not null default true,
  highlighted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_licenses (
  id text primary key,
  workspace_id text not null unique references public.workspaces(id) on delete cascade,
  plan_code text not null default 'trial',
  status text not null default 'trialing',
  provider text not null default 'manual',
  provider_customer_id text not null default '',
  provider_subscription_id text not null default '',
  current_period_started_at timestamptz,
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  granted_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_event_records (
  id text primary key,
  workspace_id text references public.workspaces(id) on delete set null,
  provider text not null default 'manual',
  provider_event_id text unique,
  event_type text not null,
  status text not null default '',
  amount_cents integer not null default 0,
  currency text not null default 'BRL',
  details text not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.billing_checkout_records (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  plan_code text not null,
  provider text not null default 'asaas',
  status text not null default 'created',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discount_codes (
  id text primary key,
  code text not null unique,
  kind text not null default 'percent',
  value integer not null default 0,
  active boolean not null default true,
  max_redemptions integer,
  redemption_count integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_states (
  id text primary key,
  workspace_id text not null unique references public.workspaces(id) on delete cascade,
  payload text not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.map_records (
  storage_id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  map_id text not null,
  title text not null,
  favorite boolean not null default false,
  archived boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (workspace_id, map_id)
);

create table if not exists public.node_records (
  storage_id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  node_id text not null,
  map_id text not null,
  parent_id text,
  title text not null,
  description text not null default '',
  type text not null,
  status text not null,
  priority text not null,
  assignee text not null default '',
  start text not null default '',
  due text not null default '',
  progress integer not null default 0 check (progress between 0 and 100),
  blocked_reason text not null default '',
  info text not null default '',
  link text not null default '',
  evidence_required boolean not null default false,
  evidence text not null default '',
  approval_required boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (workspace_id, node_id)
);

create table if not exists public.node_dependencies (
  storage_id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  dependency_id text not null,
  node_id text not null,
  depends_on_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.node_checklist_records (
  storage_id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  checklist_id text not null,
  node_id text not null,
  text text not null,
  done boolean not null default false,
  position integer not null default 0
);

create table if not exists public.node_comment_records (
  storage_id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  comment_id text not null,
  map_id text not null default '',
  node_id text not null,
  parent_id text,
  author text not null,
  author_email text not null default '',
  content text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  resolved_at timestamptz,
  resolved_by text not null default '',
  unique (workspace_id, comment_id)
);

create table if not exists public.workspace_members (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  display_name text not null default '',
  role text not null default 'viewer',
  status text not null default 'pending',
  all_maps boolean not null default false,
  invited_by text not null,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  last_active_at timestamptz,
  unique (workspace_id, email)
);

create table if not exists public.map_permission_records (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  map_id text not null,
  member_id text not null references public.workspace_members(id) on delete cascade,
  permission text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, map_id)
);

create table if not exists public.comment_reaction_records (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  comment_id text not null,
  user_email text not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (comment_id, user_email, emoji)
);

create table if not exists public.notification_records (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  recipient_email text not null,
  kind text not null,
  actor_email text not null,
  map_id text not null default '',
  node_id text not null default '',
  comment_id text not null default '',
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_presence_records (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  user_email text not null,
  display_name text not null default '',
  map_id text not null default '',
  node_id text not null default '',
  last_seen_at timestamptz not null default now(),
  unique (workspace_id, user_email)
);

create table if not exists public.activity_log_records (
  storage_id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  activity_id text not null,
  event_text text not null,
  event_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.node_file_records (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  map_id text not null,
  node_id text not null,
  object_key text not null unique,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  uploaded_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log_records (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  actor_email text not null,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  details text not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.approval_records (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  map_id text not null,
  node_id text not null,
  scope text not null default 'node',
  reviewer_name text not null,
  reviewer_email text not null default '',
  requested_by text not null,
  status text not null default 'pending',
  request_note text not null default '',
  decision_note text not null default '',
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text not null default ''
);

create table if not exists public.approval_event_records (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  approval_id text not null references public.approval_records(id) on delete cascade,
  actor_email text not null,
  action text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.review_link_records (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  map_id text not null,
  root_node_id text not null default '',
  label text not null default '',
  token_hash text not null unique,
  status text not null default 'active',
  allow_comments boolean not null default true,
  expires_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.review_comment_markers (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  review_link_id text not null references public.review_link_records(id) on delete cascade,
  comment_id text not null unique,
  map_id text not null,
  node_id text not null default '',
  pin_type text not null default 'node',
  pin_x double precision not null default 0.5,
  pin_y double precision not null default 0.5,
  pin_number integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.review_rate_limit_records (
  rate_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0
);

create index if not exists workspaces_owner_email_idx on public.workspaces (lower(owner_email));
create index if not exists workspace_licenses_status_idx on public.workspace_licenses (status, plan_code);
create index if not exists billing_events_workspace_idx on public.billing_event_records (workspace_id, created_at desc);
create index if not exists billing_events_type_idx on public.billing_event_records (event_type, created_at desc);
create index if not exists billing_checkouts_workspace_idx on public.billing_checkout_records (workspace_id, created_at desc);
create index if not exists project_states_workspace_idx on public.project_states (workspace_id);
create index if not exists map_records_workspace_idx on public.map_records (workspace_id);
create index if not exists node_records_workspace_map_idx on public.node_records (workspace_id, map_id);
create index if not exists node_dependencies_workspace_node_idx on public.node_dependencies (workspace_id, node_id);
create index if not exists node_dependencies_workspace_prerequisite_idx on public.node_dependencies (workspace_id, depends_on_id);
create index if not exists checklist_workspace_node_idx on public.node_checklist_records (workspace_id, node_id);
create index if not exists comments_workspace_node_idx on public.node_comment_records (workspace_id, node_id);
create index if not exists workspace_members_email_idx on public.workspace_members (lower(email), status);
create index if not exists workspace_members_user_idx on public.workspace_members (user_id, status);
create index if not exists map_permissions_workspace_map_idx on public.map_permission_records (workspace_id, map_id);
create index if not exists notifications_recipient_idx on public.notification_records (workspace_id, lower(recipient_email), read_at, created_at desc);
create index if not exists workspace_presence_map_seen_idx on public.workspace_presence_records (workspace_id, map_id, last_seen_at desc);
create index if not exists activity_workspace_idx on public.activity_log_records (workspace_id, created_at desc);
create index if not exists node_files_workspace_node_idx on public.node_file_records (workspace_id, node_id);
create index if not exists node_files_workspace_map_idx on public.node_file_records (workspace_id, map_id);
create index if not exists audit_workspace_created_idx on public.audit_log_records (workspace_id, created_at desc);
create index if not exists audit_workspace_resource_idx on public.audit_log_records (workspace_id, resource_type, resource_id);
create index if not exists approvals_workspace_map_idx on public.approval_records (workspace_id, map_id);
create index if not exists approvals_workspace_node_idx on public.approval_records (workspace_id, node_id);
create index if not exists approvals_workspace_status_idx on public.approval_records (workspace_id, status);
create index if not exists approval_events_approval_idx on public.approval_event_records (approval_id, created_at);
create index if not exists approval_events_workspace_idx on public.approval_event_records (workspace_id, created_at desc);
create index if not exists review_links_workspace_map_idx on public.review_link_records (workspace_id, map_id, status, created_at desc);
create index if not exists review_links_token_hash_idx on public.review_link_records (token_hash);
create index if not exists review_markers_link_idx on public.review_comment_markers (review_link_id, pin_number);
create index if not exists review_markers_workspace_map_idx on public.review_comment_markers (workspace_id, map_id, created_at desc);

insert into public.billing_plans
  (code, name, description, price_cents, currency, billing_interval, trial_days, active, highlighted)
values
  ('monthly', 'Mensal', 'Flexibilidade para organizar e executar sem fidelidade.', 500, 'BRL', 'month', 7, true, false),
  ('annual', 'Anual', 'Um ano completo com o melhor custo-benefício.', 4900, 'BRL', 'year', 7, true, true)
on conflict (code) do nothing;

insert into public.platform_admins (email, user_id, role, status)
select lower(email), id, 'super_admin', 'active'
from auth.users
where lower(email) = 'roberiolimarl77@gmail.com'
on conflict (email) do update set
  user_id = excluded.user_id,
  role = 'super_admin',
  status = 'active',
  updated_at = now();

create or replace function private.current_email()
returns text
language sql
stable
set search_path = ''
as $$
  select lower(coalesce((select auth.jwt() ->> 'email'), ''));
$$;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins a
    where a.status = 'active'
      and a.role = 'super_admin'
      and (a.user_id = (select auth.uid()) or lower(a.email) = private.current_email())
  );
$$;

create or replace function private.has_workspace_access(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin() or exists (
    select 1 from public.workspaces w
    where w.id = target_workspace_id
      and (w.owner_user_id = (select auth.uid()) or lower(w.owner_email) = private.current_email())
  ) or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = target_workspace_id
      and m.status = 'active'
      and (m.user_id = (select auth.uid()) or lower(m.email) = private.current_email())
  );
$$;

create or replace function private.can_manage_workspace(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin() or exists (
    select 1 from public.workspaces w
    where w.id = target_workspace_id
      and (w.owner_user_id = (select auth.uid()) or lower(w.owner_email) = private.current_email())
  ) or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = target_workspace_id and m.status = 'active' and m.role = 'admin'
      and (m.user_id = (select auth.uid()) or lower(m.email) = private.current_email())
  );
$$;

create or replace function private.can_write_workspace(target_workspace_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_manage_workspace(target_workspace_id) or exists (
    select 1 from public.workspace_members m
    where m.workspace_id = target_workspace_id and m.status = 'active'
      and m.role in ('editor', 'executor')
      and (m.user_id = (select auth.uid()) or lower(m.email) = private.current_email())
  );
$$;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.current_email() to authenticated;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.has_workspace_access(text) to authenticated;
grant execute on function private.can_manage_workspace(text) to authenticated;
grant execute on function private.can_write_workspace(text) to authenticated;

alter table public.workspaces enable row level security;
alter table public.platform_admins enable row level security;
alter table public.billing_plans enable row level security;
alter table public.discount_codes enable row level security;
alter table public.review_rate_limit_records enable row level security;

drop policy if exists workspaces_select on public.workspaces;
create policy workspaces_select on public.workspaces for select to authenticated
using (private.has_workspace_access(id));
drop policy if exists workspaces_insert on public.workspaces;
create policy workspaces_insert on public.workspaces for insert to authenticated
with check (owner_user_id = (select auth.uid()) and lower(owner_email) = private.current_email());
drop policy if exists workspaces_update on public.workspaces;
create policy workspaces_update on public.workspaces for update to authenticated
using (private.can_manage_workspace(id)) with check (private.can_manage_workspace(id));
drop policy if exists workspaces_delete on public.workspaces;
create policy workspaces_delete on public.workspaces for delete to authenticated
using (private.can_manage_workspace(id));

drop policy if exists platform_admins_self_select on public.platform_admins;
create policy platform_admins_self_select on public.platform_admins for select to authenticated
using (private.is_platform_admin());

drop policy if exists billing_plans_public_select on public.billing_plans;
create policy billing_plans_public_select on public.billing_plans for select to anon, authenticated
using (active);
drop policy if exists billing_plans_admin_write on public.billing_plans;
create policy billing_plans_admin_write on public.billing_plans for all to authenticated
using (private.is_platform_admin()) with check (private.is_platform_admin());

drop policy if exists discount_codes_admin on public.discount_codes;
create policy discount_codes_admin on public.discount_codes for all to authenticated
using (private.is_platform_admin()) with check (private.is_platform_admin());

do $policies$
declare
  table_name text;
  workspace_tables text[] := array[
    'workspace_licenses', 'billing_event_records', 'billing_checkout_records',
    'project_states', 'map_records', 'node_records', 'node_dependencies',
    'node_checklist_records', 'node_comment_records', 'workspace_members',
    'map_permission_records', 'comment_reaction_records', 'notification_records',
    'workspace_presence_records', 'activity_log_records', 'node_file_records',
    'audit_log_records', 'approval_records', 'approval_event_records',
    'review_link_records', 'review_comment_markers'
  ];
begin
  foreach table_name in array workspace_tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_select', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.has_workspace_access(workspace_id))',
      table_name || '_select', table_name
    );
    execute format('drop policy if exists %I on public.%I', table_name || '_write', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (private.can_write_workspace(workspace_id)) with check (private.can_write_workspace(workspace_id))',
      table_name || '_write', table_name
    );
  end loop;
end
$policies$;

-- Gestão de membros, permissões e licenças exige proprietário/admin.
drop policy if exists workspace_members_write on public.workspace_members;
create policy workspace_members_write on public.workspace_members for all to authenticated
using (private.can_manage_workspace(workspace_id)) with check (private.can_manage_workspace(workspace_id));
drop policy if exists map_permission_records_write on public.map_permission_records;
create policy map_permission_records_write on public.map_permission_records for all to authenticated
using (private.can_manage_workspace(workspace_id)) with check (private.can_manage_workspace(workspace_id));
drop policy if exists workspace_licenses_write on public.workspace_licenses;
create policy workspace_licenses_write on public.workspace_licenses for all to authenticated
using (private.can_manage_workspace(workspace_id)) with check (private.can_manage_workspace(workspace_id));

grant select on public.billing_plans to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on public.platform_admins, public.discount_codes, public.review_rate_limit_records from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mapa-operacional-private',
  'mapa-operacional-private',
  false,
  10485760,
  array[
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv', 'text/plain', 'image/png', 'image/jpeg', 'image/webp',
    'application/zip', 'application/x-zip-compressed'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists mapa_files_select on storage.objects;
create policy mapa_files_select on storage.objects for select to authenticated
using (
  bucket_id = 'mapa-operacional-private'
  and private.has_workspace_access((storage.foldername(name))[1])
);
drop policy if exists mapa_files_insert on storage.objects;
create policy mapa_files_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'mapa-operacional-private'
  and private.can_write_workspace((storage.foldername(name))[1])
);
drop policy if exists mapa_files_update on storage.objects;
create policy mapa_files_update on storage.objects for update to authenticated
using (
  bucket_id = 'mapa-operacional-private'
  and private.can_write_workspace((storage.foldername(name))[1])
)
with check (
  bucket_id = 'mapa-operacional-private'
  and private.can_write_workspace((storage.foldername(name))[1])
);
drop policy if exists mapa_files_delete on storage.objects;
create policy mapa_files_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'mapa-operacional-private'
  and private.can_write_workspace((storage.foldername(name))[1])
);

commit;
