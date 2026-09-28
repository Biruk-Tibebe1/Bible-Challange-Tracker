create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now()
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  name text not null check (char_length(pg_catalog.btrim(name)) between 1 and 120),
  challenge_type text not null check (challenge_type in ('predefined', 'custom')),
  start_book_id text not null check (start_book_id <> ''),
  start_chapter integer not null check (start_chapter > 0),
  end_book_id text not null check (end_book_id <> ''),
  end_chapter integer not null check (end_chapter > 0),
  total_days integer not null check (total_days > 0),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

create table public.challenge_days (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  day_number integer not null check (day_number > 0),
  chapters jsonb not null default '[]'::jsonb check (pg_catalog.jsonb_typeof(chapters) = 'array'),
  ethiopian_year integer,
  ethiopian_month text,
  ethiopian_day smallint,
  created_at timestamptz not null default pg_catalog.now(),
  constraint challenge_days_challenge_day_unique unique (challenge_id, day_number),
  constraint challenge_days_ethiopian_date_valid check (
    (ethiopian_year is null and ethiopian_month is null and ethiopian_day is null)
    or (
      ethiopian_year is not null
      and ethiopian_month is not null
      and ethiopian_month in (
        'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit',
        'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
      )
      and ethiopian_day is not null
      and ethiopian_day between 1 and case when ethiopian_month = 'Pagume' then 6 else 30 end
    )
  )
);

create table public.user_challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_id uuid not null,
  day_number integer not null check (day_number > 0),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint user_challenge_progress_user_challenge_day_unique unique (user_id, challenge_id, day_number),
  constraint user_challenge_progress_schedule_day_fk
    foreign key (challenge_id, day_number)
    references public.challenge_days (challenge_id, day_number)
    on delete restrict,
  constraint user_challenge_progress_challenge_fk
    foreign key (challenge_id)
    references public.challenges (id)
    on delete restrict
);

create index user_challenge_progress_challenge_id_idx
  on public.user_challenge_progress (challenge_id);

alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_days enable row level security;
alter table public.user_challenge_progress enable row level security;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy challenges_select_own
  on public.challenges for select to authenticated
  using (owner_id = (select auth.uid()));

create policy challenges_insert_own
  on public.challenges for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy challenges_update_own
  on public.challenges for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy challenges_delete_own
  on public.challenges for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy challenge_days_select_owned
  on public.challenge_days for select to authenticated
  using (
    exists (
      select 1 from public.challenges as c
      where c.id = challenge_days.challenge_id and c.owner_id = (select auth.uid())
    )
  );

create policy challenge_days_insert_owned
  on public.challenge_days for insert to authenticated
  with check (
    exists (
      select 1 from public.challenges as c
      where c.id = challenge_days.challenge_id and c.owner_id = (select auth.uid())
    )
  );

create policy challenge_days_update_owned
  on public.challenge_days for update to authenticated
  using (
    exists (
      select 1 from public.challenges as c
      where c.id = challenge_days.challenge_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.challenges as c
      where c.id = challenge_days.challenge_id and c.owner_id = (select auth.uid())
    )
  );

create policy challenge_days_delete_owned
  on public.challenge_days for delete to authenticated
  using (
    exists (
      select 1 from public.challenges as c
      where c.id = challenge_days.challenge_id and c.owner_id = (select auth.uid())
    )
  );

create policy user_challenge_progress_select_own
  on public.user_challenge_progress for select to authenticated
  using (user_id = (select auth.uid()));

create policy user_challenge_progress_insert_own
  on public.user_challenge_progress for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.challenges as c
      where c.id = user_challenge_progress.challenge_id and c.owner_id = (select auth.uid())
    )
  );

create policy user_challenge_progress_update_own
  on public.user_challenge_progress for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.challenges as c
      where c.id = user_challenge_progress.challenge_id and c.owner_id = (select auth.uid())
    )
  );

create policy user_challenge_progress_delete_own
  on public.user_challenge_progress for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.profiles, public.challenges, public.challenge_days, public.user_challenge_progress
  from public, anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.challenges to authenticated;
grant select, insert, update, delete on public.challenge_days to authenticated;
grant select, insert, update, delete on public.user_challenge_progress to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger challenges_set_updated_at
  before update on public.challenges
  for each row execute function public.set_updated_at();

create trigger user_challenge_progress_set_updated_at
  before update on public.user_challenge_progress
  for each row execute function public.set_updated_at();