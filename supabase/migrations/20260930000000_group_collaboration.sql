create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(pg_catalog.btrim(name)) between 2 and 80),
  description text check (description is null or char_length(description) <= 500),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete restrict,
  invite_code text not null unique
    default pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  invite_expires_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default pg_catalog.now(),
  constraint group_members_group_user_unique unique (group_id, user_id)
);

create unique index group_members_one_owner_per_group_idx
  on public.group_members (group_id)
  where role = 'owner';

create table public.group_challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now(),
  constraint group_challenges_group_challenge_unique unique (group_id, challenge_id)
);

create index group_members_user_id_idx on public.group_members (user_id);
create index group_challenges_challenge_id_idx on public.group_challenges (challenge_id);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_challenges enable row level security;

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members as gm
    where gm.group_id = p_group_id
      and gm.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.groups as g
    where g.id = p_group_id
      and g.owner_id = (select auth.uid())
  );
$$;

revoke all on function public.is_group_member(uuid) from public, anon;
revoke all on function public.is_group_owner(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_owner(uuid) to authenticated;

create or replace function public.add_group_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create or replace function public.set_group_owner_from_auth()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  new.owner_id := (select auth.uid());
  new.invite_code := pg_catalog.upper(
    pg_catalog.substr(pg_catalog.replace(gen_random_uuid()::text, '-', ''), 1, 10)
  );
  return new;
end;
$$;

revoke all on function public.add_group_owner_membership() from public, anon, authenticated;
revoke all on function public.set_group_owner_from_auth() from public, anon, authenticated;

create trigger groups_set_owner_from_auth
  before insert on public.groups
  for each row execute function public.set_group_owner_from_auth();

create trigger groups_add_owner_membership
  after insert on public.groups
  for each row execute function public.add_group_owner_membership();

create or replace function public.join_group_by_invite_code(p_invite_code text)
returns table (group_id uuid, already_member boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_group_id uuid;
  v_invite_expires_at timestamptz;
  v_inserted_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if p_invite_code is null or pg_catalog.btrim(p_invite_code) !~ '^[A-Fa-f0-9]{10}$' then
    raise exception 'Invalid invite code.' using errcode = '22023';
  end if;

  select g.id, g.invite_expires_at into v_group_id, v_invite_expires_at
  from public.groups as g
  where g.invite_code = pg_catalog.upper(pg_catalog.btrim(p_invite_code));

  if v_group_id is null then
    raise exception 'Invite code was not found.' using errcode = 'P0002';
  end if;

  if v_invite_expires_at is not null and v_invite_expires_at <= pg_catalog.now() then
    raise exception 'Invite code has expired.' using errcode = 'P0003';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'member')
  on conflict (group_id, user_id) do nothing;
  get diagnostics v_inserted_count = row_count;

  return query select v_group_id, v_inserted_count = 0;
end;
$$;

revoke all on function public.join_group_by_invite_code(text) from public, anon;
grant execute on function public.join_group_by_invite_code(text) to authenticated;

create or replace function public.list_group_members(p_group_id uuid)
returns table (
  user_id uuid,
  display_name text,
  email text,
  role text,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_group_member(p_group_id) then
    raise exception 'Group membership is required.' using errcode = '42501';
  end if;

  return query
  select
    gm.user_id,
    coalesce(
      nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(pg_catalog.split_part(u.email, '@', 1), ''),
      'Member'
    ),
    case when u.id = (select auth.uid()) then u.email::text else null end,
    gm.role,
    gm.joined_at
  from public.group_members as gm
  join auth.users as u on u.id = gm.user_id
  where gm.group_id = p_group_id
  order by case when gm.role = 'owner' then 0 else 1 end, gm.joined_at;
end;
$$;

revoke all on function public.list_group_members(uuid) from public, anon;
grant execute on function public.list_group_members(uuid) to authenticated;

create policy groups_select_members
  on public.groups for select to authenticated
  using (public.is_group_member(id));

create policy groups_insert_owner
  on public.groups for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy groups_update_owner
  on public.groups for update to authenticated
  using (public.is_group_owner(id))
  with check (owner_id = (select auth.uid()));

create policy groups_delete_owner
  on public.groups for delete to authenticated
  using (public.is_group_owner(id));

create policy group_members_select_members
  on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

create policy group_members_delete_member_or_owner
  on public.group_members for delete to authenticated
  using (
    role = 'member'
    and (user_id = (select auth.uid()) or public.is_group_owner(group_id))
  );

create policy group_challenges_select_members
  on public.group_challenges for select to authenticated
  using (public.is_group_member(group_id));

create policy group_challenges_insert_owner_challenge
  on public.group_challenges for insert to authenticated
  with check (
    public.is_group_owner(group_id)
    and exists (
      select 1 from public.challenges as c
      where c.id = challenge_id and c.owner_id = (select auth.uid())
    )
  );

create policy group_challenges_delete_owner
  on public.group_challenges for delete to authenticated
  using (public.is_group_owner(group_id));

create policy challenges_select_group_members
  on public.challenges for select to authenticated
  using (
    exists (
      select 1 from public.group_challenges as gc
      where gc.challenge_id = challenges.id
        and public.is_group_member(gc.group_id)
    )
  );

create policy challenge_days_select_group_members
  on public.challenge_days for select to authenticated
  using (
    exists (
      select 1 from public.group_challenges as gc
      where gc.challenge_id = challenge_days.challenge_id
        and public.is_group_member(gc.group_id)
    )
  );

create policy user_challenge_progress_select_group_members
  on public.user_challenge_progress for select to authenticated
  using (
    exists (
      select 1
      from public.group_challenges as gc
      where gc.challenge_id = user_challenge_progress.challenge_id
        and public.is_group_member(gc.group_id)
    )
  );

create policy user_challenge_progress_insert_group_members
  on public.user_challenge_progress for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.group_challenges as gc
      where gc.challenge_id = user_challenge_progress.challenge_id
        and public.is_group_member(gc.group_id)
    )
  );

create policy user_challenge_progress_update_group_members
  on public.user_challenge_progress for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.group_challenges as gc
      where gc.challenge_id = user_challenge_progress.challenge_id
        and public.is_group_member(gc.group_id)
    )
  );

revoke all on public.groups, public.group_members, public.group_challenges from public, anon;
grant select, insert, delete on public.groups to authenticated;
grant update (name, description) on public.groups to authenticated;
grant select, delete on public.group_members to authenticated;
grant select, insert, delete on public.group_challenges to authenticated;

create trigger groups_set_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at();