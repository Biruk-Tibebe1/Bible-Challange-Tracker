alter table public.challenges
  add column challenge_key text,
  alter column owner_id set default auth.uid(),
  add constraint challenges_owner_challenge_key_unique unique (owner_id, challenge_key);

alter table public.user_challenge_progress
  alter column user_id set default auth.uid();

create or replace function public.create_challenge_with_days(
  p_name text,
  p_challenge_type text,
  p_start_book_id text,
  p_start_chapter integer,
  p_end_book_id text,
  p_end_chapter integer,
  p_total_days integer,
  p_days jsonb,
  p_challenge_key text default null
)
returns uuid
language plpgsql
set search_path = ''
as $function$
declare
  created_challenge_id uuid;
  day_record record;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if p_total_days is null or p_total_days <= 0 then
    raise exception 'total_days must be positive.' using errcode = '22023';
  end if;

  if p_days is null or pg_catalog.jsonb_typeof(p_days) <> 'array'
    or pg_catalog.jsonb_array_length(p_days) <> p_total_days then
    raise exception 'Schedule day count must match total_days.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(p_days) as d(day_number integer, chapters jsonb)
    where d.day_number is null
      or d.day_number < 1
      or d.day_number > p_total_days
      or d.chapters is null
      or pg_catalog.jsonb_typeof(d.chapters) <> 'array'
  ) then
    raise exception 'Schedule contains invalid day data.' using errcode = '22023';
  end if;

  if (
    select pg_catalog.count(distinct d.day_number)
    from pg_catalog.jsonb_to_recordset(p_days) as d(day_number integer)
  ) <> p_total_days then
    raise exception 'Schedule day numbers must be unique.' using errcode = '22023';
  end if;

  if p_challenge_key is not null then
    insert into public.challenges (
      name, challenge_type, start_book_id, start_chapter,
      end_book_id, end_chapter, total_days, challenge_key
    ) values (
      p_name, p_challenge_type, p_start_book_id, p_start_chapter,
      p_end_book_id, p_end_chapter, p_total_days, p_challenge_key
    )
    on conflict (owner_id, challenge_key) do nothing
    returning id into created_challenge_id;

    if created_challenge_id is null then
      select c.id into created_challenge_id
      from public.challenges as c
      where c.owner_id = (select auth.uid())
        and c.challenge_key = p_challenge_key;
      return created_challenge_id;
    end if;
  else
    insert into public.challenges (
      name, challenge_type, start_book_id, start_chapter,
      end_book_id, end_chapter, total_days
    ) values (
      p_name, p_challenge_type, p_start_book_id, p_start_chapter,
      p_end_book_id, p_end_chapter, p_total_days
    ) returning id into created_challenge_id;
  end if;

  for day_record in
    select d.day_number, d.chapters, d.ethiopian_year, d.ethiopian_month, d.ethiopian_day
    from pg_catalog.jsonb_to_recordset(p_days) as d(
      day_number integer,
      chapters jsonb,
      ethiopian_year integer,
      ethiopian_month text,
      ethiopian_day smallint
    )
    order by d.day_number
  loop
    insert into public.challenge_days (
      challenge_id, day_number, chapters,
      ethiopian_year, ethiopian_month, ethiopian_day
    ) values (
      created_challenge_id, day_record.day_number, day_record.chapters,
      day_record.ethiopian_year, day_record.ethiopian_month, day_record.ethiopian_day
    );
  end loop;

  return created_challenge_id;
end;
$function$;

revoke all on function public.create_challenge_with_days(
  text, text, text, integer, text, integer, integer, jsonb, text
) from public, anon;
grant execute on function public.create_challenge_with_days(
  text, text, text, integer, text, integer, integer, jsonb, text
) to authenticated;