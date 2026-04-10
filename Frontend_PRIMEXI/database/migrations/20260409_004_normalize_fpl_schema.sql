-- PRIMEXI schema normalization and FPL alignment migration.
-- Sources used to align the model with real payloads:
-- https://fantasy.premierleague.com/api/bootstrap-static/
-- https://fantasy.premierleague.com/api/fixtures/
-- https://fantasy.premierleague.com/api/element-summary/1/
-- https://fantasy.premierleague.com/api/entry/1/
-- https://fantasy.premierleague.com/api/entry/1/event/1/picks/
--
-- Compatibility note:
-- This migration keeps public.players and public.player_gameweek_stats intact so
-- the current repo code keeps working:
-- /home/dilan/.codex/app_primexi/Frontend_PRIMEXI/src/services/homeService.ts
-- /home/dilan/.codex/app_primexi/Frontend_PRIMEXI/supabase/functions/sync-fpl-players/index.ts
-- /home/dilan/.codex/app_primexi/Frontend_PRIMEXI/supabase/functions/sync-fpl-player-history/index.ts
--
-- Design decisions:
-- 1. Existing tables are extended, never dropped.
-- 2. teams, gameweeks, element_types and fixtures become normalized dimensions.
-- 3. player_catalog becomes the stable one-row-per-FPL-player entity for squads.
-- 4. players remains the backward-compatible snapshot table already used by the app.
-- 5. player_fixture_stats stores exact element-summary history rows per fixture.
-- 6. player_gameweek_stats remains the backward-compatible aggregate per gameweek.
-- 7. Triggers keep legacy columns and normalized foreign keys in sync.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Helper upsert functions let both the legacy ingestion flow and the new
-- normalized schema coexist without rewriting the current edge functions.
create or replace function public.ensure_team(
  p_fpl_id integer,
  p_name text default null,
  p_short_name text default null
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_name text;
  v_short_name text;
begin
  if p_fpl_id is null then
    return null;
  end if;

  v_name := coalesce(nullif(btrim(p_name), ''), format('Team %s', p_fpl_id));
  v_short_name := coalesce(
    nullif(btrim(p_short_name), ''),
    nullif(left(regexp_replace(upper(v_name), '[^A-Z0-9]', '', 'g'), 3), ''),
    format('T%s', p_fpl_id)
  );

  insert into public.teams (
    fpl_id,
    name,
    short_name
  )
  values (
    p_fpl_id,
    v_name,
    v_short_name
  )
  on conflict (fpl_id) do update
  set
    name = coalesce(excluded.name, teams.name),
    short_name = coalesce(excluded.short_name, teams.short_name),
    updated_at = timezone('utc', now())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.ensure_gameweek(
  p_fpl_id integer,
  p_name text default null,
  p_deadline_time timestamptz default null
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  if p_fpl_id is null then
    return null;
  end if;

  insert into public.gameweeks (
    fpl_id,
    name,
    deadline_time
  )
  values (
    p_fpl_id,
    coalesce(nullif(btrim(p_name), ''), format('Gameweek %s', p_fpl_id)),
    p_deadline_time
  )
  on conflict (fpl_id) do update
  set
    name = coalesce(excluded.name, gameweeks.name),
    deadline_time = coalesce(excluded.deadline_time, gameweeks.deadline_time),
    updated_at = timezone('utc', now())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.ensure_element_type(
  p_fpl_id integer,
  p_app_code text default null,
  p_singular_name text default null
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_app_code text;
  v_fpl_short text;
  v_singular_name text;
  v_plural_name text;
begin
  if p_fpl_id is null then
    return null;
  end if;

  v_app_code := upper(
    coalesce(
      nullif(btrim(p_app_code), ''),
      case p_fpl_id
        when 1 then 'GK'
        when 2 then 'DEF'
        when 3 then 'MID'
        when 4 then 'FWD'
        else format('POS%s', p_fpl_id)
      end
    )
  );

  v_fpl_short := case
    when v_app_code = 'GK' then 'GKP'
    when v_app_code in ('DEF', 'MID', 'FWD') then v_app_code
    else v_app_code
  end;

  v_singular_name := coalesce(
    nullif(btrim(p_singular_name), ''),
    case p_fpl_id
      when 1 then 'Goalkeeper'
      when 2 then 'Defender'
      when 3 then 'Midfielder'
      when 4 then 'Forward'
      else v_app_code
    end
  );

  v_plural_name := case p_fpl_id
    when 1 then 'Goalkeepers'
    when 2 then 'Defenders'
    when 3 then 'Midfielders'
    when 4 then 'Forwards'
    else format('%ss', v_singular_name)
  end;

  insert into public.element_types (
    fpl_id,
    singular_name,
    singular_name_short,
    plural_name,
    plural_name_short,
    app_code
  )
  values (
    p_fpl_id,
    v_singular_name,
    v_fpl_short,
    v_plural_name,
    v_fpl_short,
    v_app_code
  )
  on conflict (fpl_id) do update
  set
    singular_name = coalesce(excluded.singular_name, element_types.singular_name),
    singular_name_short = coalesce(excluded.singular_name_short, element_types.singular_name_short),
    plural_name = coalesce(excluded.plural_name, element_types.plural_name),
    plural_name_short = coalesce(excluded.plural_name_short, element_types.plural_name_short),
    app_code = coalesce(excluded.app_code, element_types.app_code),
    updated_at = timezone('utc', now())
  returning id into v_id;

  return v_id;
end;
$$;

-- Normalized reference tables.
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  fpl_id integer not null unique,
  code integer,
  draw integer,
  form text,
  loss integer,
  name text not null,
  played integer,
  points integer,
  position integer,
  short_name text not null,
  strength integer,
  team_division integer,
  unavailable boolean not null default false,
  win integer,
  strength_overall_home integer,
  strength_overall_away integer,
  strength_attack_home integer,
  strength_attack_away integer,
  strength_defence_home integer,
  strength_defence_away integer,
  pulse_id integer,
  api_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint teams_fpl_id_positive check (fpl_id > 0)
);

create table if not exists public.gameweeks (
  id uuid primary key default gen_random_uuid(),
  fpl_id integer not null unique,
  name text not null,
  deadline_time timestamptz,
  release_time timestamptz,
  average_entry_score integer,
  finished boolean not null default false,
  data_checked boolean not null default false,
  highest_scoring_entry bigint,
  deadline_time_epoch bigint,
  deadline_time_game_offset integer,
  highest_score integer,
  is_previous boolean not null default false,
  is_current boolean not null default false,
  is_next boolean not null default false,
  cup_leagues_created boolean not null default false,
  h2h_ko_matches_created boolean not null default false,
  can_enter boolean not null default false,
  can_manage boolean not null default false,
  released boolean not null default false,
  ranked_count bigint,
  most_selected integer,
  most_transferred_in integer,
  top_element integer,
  top_element_points integer,
  transfers_made bigint,
  most_captained integer,
  most_vice_captained integer,
  overrides jsonb,
  chip_plays jsonb,
  api_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint gameweeks_fpl_id_range check (fpl_id > 0)
);

create table if not exists public.element_types (
  id uuid primary key default gen_random_uuid(),
  fpl_id integer not null unique,
  plural_name text not null,
  plural_name_short text not null,
  singular_name text not null,
  singular_name_short text not null,
  app_code text not null,
  squad_select integer,
  squad_min_select integer,
  squad_max_select integer,
  squad_min_play integer,
  squad_max_play integer,
  ui_shirt_specific boolean,
  sub_positions_locked jsonb,
  element_count integer,
  api_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint element_types_fpl_id_positive check (fpl_id > 0)
);

create table if not exists public.fixtures (
  id uuid primary key default gen_random_uuid(),
  fpl_id integer not null unique,
  code bigint,
  gameweek integer,
  gameweek_id uuid references public.gameweeks(id) on delete set null,
  finished boolean not null default false,
  finished_provisional boolean not null default false,
  started boolean,
  minutes integer not null default 0,
  provisional_start_time boolean not null default false,
  kickoff_time timestamptz,
  team_h_fpl_id integer,
  team_h_id uuid references public.teams(id) on delete set null,
  team_h_score integer,
  team_a_fpl_id integer,
  team_a_id uuid references public.teams(id) on delete set null,
  team_a_score integer,
  team_h_difficulty integer,
  team_a_difficulty integer,
  stats jsonb,
  pulse_id bigint,
  api_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Stable catalog table for one row per FPL player.
create table if not exists public.player_catalog (
  id uuid primary key default gen_random_uuid(),
  fpl_id integer not null unique,
  code integer,
  web_name text not null,
  first_name text,
  second_name text,
  known_name text,
  full_name text not null,
  team_id uuid references public.teams(id) on delete set null,
  fpl_team_id integer,
  element_type_id uuid references public.element_types(id) on delete set null,
  fpl_position_id integer,
  price numeric(10,1),
  price_tenths integer,
  total_points integer,
  minutes integer,
  form numeric(8,2),
  status text,
  selected_by_percent numeric(8,2),
  chance_of_playing_next_round integer,
  chance_of_playing_this_round integer,
  news text,
  news_added timestamptz,
  photo text,
  points_per_game numeric(8,2),
  event_points integer,
  bonus integer,
  bps integer,
  influence numeric(12,2),
  creativity numeric(12,2),
  threat numeric(12,2),
  ict_index numeric(12,2),
  expected_goals numeric(12,2),
  expected_assists numeric(12,2),
  expected_goal_involvements numeric(12,2),
  expected_goals_conceded numeric(12,2),
  transfers_in bigint,
  transfers_out bigint,
  api_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint player_catalog_fpl_id_positive check (fpl_id > 0),
  constraint player_catalog_selected_by_percent_range check (
    selected_by_percent is null or (selected_by_percent >= 0 and selected_by_percent <= 100)
  ),
  constraint player_catalog_chance_next_round_range check (
    chance_of_playing_next_round is null
    or (chance_of_playing_next_round >= 0 and chance_of_playing_next_round <= 100)
  ),
  constraint player_catalog_chance_this_round_range check (
    chance_of_playing_this_round is null
    or (chance_of_playing_this_round >= 0 and chance_of_playing_this_round <= 100)
  )
);

-- Exact one-row-per-player-per-fixture facts for double gameweeks and analytics.
create table if not exists public.player_fixture_stats (
  id uuid primary key default gen_random_uuid(),
  player_catalog_id uuid references public.player_catalog(id) on delete cascade,
  fpl_id integer not null,
  gameweek integer not null,
  gameweek_id uuid references public.gameweeks(id) on delete set null,
  fixture_fpl_id integer not null,
  fixture_id uuid references public.fixtures(id) on delete set null,
  opponent_team_fpl_id integer,
  opponent_team_id uuid references public.teams(id) on delete set null,
  was_home boolean,
  kickoff_time timestamptz,
  team_h_score integer,
  team_a_score integer,
  modified boolean,
  total_points integer,
  minutes integer,
  goals_scored integer,
  assists integer,
  clean_sheets integer,
  goals_conceded integer,
  own_goals integer,
  penalties_saved integer,
  penalties_missed integer,
  yellow_cards integer,
  red_cards integer,
  saves integer,
  bonus integer,
  bps integer,
  influence numeric(12,2),
  creativity numeric(12,2),
  threat numeric(12,2),
  ict_index numeric(12,2),
  clearances_blocks_interceptions integer,
  recoveries integer,
  tackles integer,
  defensive_contribution integer,
  starts integer,
  expected_goals numeric(12,2),
  expected_assists numeric(12,2),
  expected_goal_involvements numeric(12,2),
  expected_goals_conceded numeric(12,2),
  value_tenths integer,
  transfers_balance integer,
  selected bigint,
  transfers_in bigint,
  transfers_out bigint,
  api_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint player_fixture_stats_unique unique (fpl_id, fixture_fpl_id),
  constraint player_fixture_stats_fpl_id_positive check (fpl_id > 0),
  constraint player_fixture_stats_gameweek_positive check (gameweek > 0),
  constraint player_fixture_stats_fixture_positive check (fixture_fpl_id > 0)
);

-- Extend existing tables instead of replacing them.
alter table public.players
  add column if not exists gameweek integer,
  add column if not exists team_id uuid,
  add column if not exists element_type_id uuid,
  add column if not exists gameweek_id uuid,
  add column if not exists player_catalog_id uuid,
  add column if not exists web_name text,
  add column if not exists first_name text,
  add column if not exists second_name text,
  add column if not exists known_name text,
  add column if not exists code integer,
  add column if not exists price_tenths integer,
  add column if not exists team_code integer,
  add column if not exists points_per_game numeric(8,2),
  add column if not exists chance_of_playing_this_round integer,
  add column if not exists news_added timestamptz,
  add column if not exists event_points integer,
  add column if not exists influence numeric(12,2),
  add column if not exists creativity numeric(12,2),
  add column if not exists threat numeric(12,2),
  add column if not exists ict_index numeric(12,2),
  add column if not exists bonus integer,
  add column if not exists bps integer,
  add column if not exists expected_goals numeric(12,2),
  add column if not exists expected_assists numeric(12,2),
  add column if not exists expected_goal_involvements numeric(12,2),
  add column if not exists expected_goals_conceded numeric(12,2),
  add column if not exists transfers_in bigint,
  add column if not exists transfers_out bigint,
  add column if not exists api_payload jsonb;

alter table public.player_gameweek_stats
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists player_catalog_id uuid,
  add column if not exists gameweek_id uuid,
  add column if not exists fixture_fpl_id integer,
  add column if not exists fixture_id uuid,
  add column if not exists opponent_team_fpl_id integer,
  add column if not exists opponent_team_id uuid,
  add column if not exists was_home boolean,
  add column if not exists kickoff_time timestamptz,
  add column if not exists team_h_score integer,
  add column if not exists team_a_score integer,
  add column if not exists modified boolean,
  add column if not exists goals_conceded integer,
  add column if not exists own_goals integer,
  add column if not exists penalties_saved integer,
  add column if not exists penalties_missed integer,
  add column if not exists yellow_cards integer,
  add column if not exists red_cards integer,
  add column if not exists saves integer,
  add column if not exists bonus integer,
  add column if not exists bps integer,
  add column if not exists influence numeric(12,2),
  add column if not exists creativity numeric(12,2),
  add column if not exists threat numeric(12,2),
  add column if not exists ict_index numeric(12,2),
  add column if not exists clearances_blocks_interceptions integer,
  add column if not exists recoveries integer,
  add column if not exists tackles integer,
  add column if not exists defensive_contribution integer,
  add column if not exists starts integer,
  add column if not exists expected_goals numeric(12,2),
  add column if not exists expected_assists numeric(12,2),
  add column if not exists expected_goal_involvements numeric(12,2),
  add column if not exists expected_goals_conceded numeric(12,2),
  add column if not exists value_tenths integer,
  add column if not exists transfers_balance integer,
  add column if not exists selected bigint,
  add column if not exists transfers_in bigint,
  add column if not exists transfers_out bigint,
  add column if not exists api_payload jsonb;

alter table public.users
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists fpl_entry_id bigint,
  add column if not exists favourite_team_fpl_id integer,
  add column if not exists favourite_team_id uuid,
  add column if not exists started_gameweek integer,
  add column if not exists started_gameweek_id uuid,
  add column if not exists current_gameweek integer,
  add column if not exists current_gameweek_id uuid,
  add column if not exists summary_overall_points integer,
  add column if not exists summary_overall_rank bigint,
  add column if not exists summary_event_points integer,
  add column if not exists summary_event_rank bigint,
  add column if not exists last_deadline_bank_tenths integer,
  add column if not exists last_deadline_value_tenths integer,
  add column if not exists last_deadline_total_transfers integer,
  add column if not exists club_badge_src text,
  add column if not exists api_payload jsonb;

-- Foreign keys are added after columns exist and after backfills are possible.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'players_team_id_fkey'
  ) then
    alter table public.players
      add constraint players_team_id_fkey
      foreign key (team_id) references public.teams(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'players_element_type_id_fkey'
  ) then
    alter table public.players
      add constraint players_element_type_id_fkey
      foreign key (element_type_id) references public.element_types(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'players_gameweek_id_fkey'
  ) then
    alter table public.players
      add constraint players_gameweek_id_fkey
      foreign key (gameweek_id) references public.gameweeks(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'players_player_catalog_id_fkey'
  ) then
    alter table public.players
      add constraint players_player_catalog_id_fkey
      foreign key (player_catalog_id) references public.player_catalog(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'player_gameweek_stats_player_catalog_id_fkey'
  ) then
    alter table public.player_gameweek_stats
      add constraint player_gameweek_stats_player_catalog_id_fkey
      foreign key (player_catalog_id) references public.player_catalog(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'player_gameweek_stats_gameweek_id_fkey'
  ) then
    alter table public.player_gameweek_stats
      add constraint player_gameweek_stats_gameweek_id_fkey
      foreign key (gameweek_id) references public.gameweeks(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'player_gameweek_stats_fixture_id_fkey'
  ) then
    alter table public.player_gameweek_stats
      add constraint player_gameweek_stats_fixture_id_fkey
      foreign key (fixture_id) references public.fixtures(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'player_gameweek_stats_opponent_team_id_fkey'
  ) then
    alter table public.player_gameweek_stats
      add constraint player_gameweek_stats_opponent_team_id_fkey
      foreign key (opponent_team_id) references public.teams(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'users_favourite_team_id_fkey'
  ) then
    alter table public.users
      add constraint users_favourite_team_id_fkey
      foreign key (favourite_team_id) references public.teams(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'users_started_gameweek_id_fkey'
  ) then
    alter table public.users
      add constraint users_started_gameweek_id_fkey
      foreign key (started_gameweek_id) references public.gameweeks(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'users_current_gameweek_id_fkey'
  ) then
    alter table public.users
      add constraint users_current_gameweek_id_fkey
      foreign key (current_gameweek_id) references public.gameweeks(id) on delete set null;
  end if;
end
$$;

-- Seed normalized dimensions from the existing legacy rows.
insert into public.teams (fpl_id, name, short_name)
select distinct on (p.fpl_team_id)
  p.fpl_team_id,
  coalesce(nullif(btrim(p.team), ''), format('Team %s', p.fpl_team_id)),
  coalesce(
    nullif(left(regexp_replace(upper(coalesce(p.team, format('Team %s', p.fpl_team_id))), '[^A-Z0-9]', '', 'g'), 3), ''),
    format('T%s', p.fpl_team_id)
  )
from public.players p
where p.fpl_team_id is not null
order by p.fpl_team_id, p.updated_at desc nulls last, p.created_at desc nulls last
on conflict (fpl_id) do nothing;

insert into public.gameweeks (fpl_id, name)
select distinct gw, format('Gameweek %s', gw)
from (
  select p.gameweek as gw
  from public.players p
  where p.gameweek is not null
  union
  select pgs.gameweek as gw
  from public.player_gameweek_stats pgs
  where pgs.gameweek is not null
) seeded_gameweeks
where gw > 0
on conflict (fpl_id) do nothing;

insert into public.element_types (
  fpl_id,
  singular_name,
  singular_name_short,
  plural_name,
  plural_name_short,
  app_code
)
select distinct on (coalesce(p.fpl_position_id,
  case upper(p.position)
    when 'GK' then 1
    when 'DEF' then 2
    when 'MID' then 3
    when 'FWD' then 4
    else null
  end
))
  coalesce(p.fpl_position_id,
    case upper(p.position)
      when 'GK' then 1
      when 'DEF' then 2
      when 'MID' then 3
      when 'FWD' then 4
      else null
    end
  ) as fpl_id,
  case upper(p.position)
    when 'GK' then 'Goalkeeper'
    when 'DEF' then 'Defender'
    when 'MID' then 'Midfielder'
    when 'FWD' then 'Forward'
    else coalesce(nullif(btrim(p.position), ''), 'Unknown')
  end as singular_name,
  case upper(p.position)
    when 'GK' then 'GKP'
    when 'DEF' then 'DEF'
    when 'MID' then 'MID'
    when 'FWD' then 'FWD'
    else coalesce(nullif(upper(btrim(p.position)), ''), 'UNK')
  end as singular_name_short,
  case upper(p.position)
    when 'GK' then 'Goalkeepers'
    when 'DEF' then 'Defenders'
    when 'MID' then 'Midfielders'
    when 'FWD' then 'Forwards'
    else coalesce(nullif(btrim(p.position), ''), 'Unknown')
  end as plural_name,
  case upper(p.position)
    when 'GK' then 'GKP'
    when 'DEF' then 'DEF'
    when 'MID' then 'MID'
    when 'FWD' then 'FWD'
    else coalesce(nullif(upper(btrim(p.position)), ''), 'UNK')
  end as plural_name_short,
  case upper(p.position)
    when 'GK' then 'GK'
    when 'DEF' then 'DEF'
    when 'MID' then 'MID'
    when 'FWD' then 'FWD'
    else coalesce(nullif(upper(btrim(p.position)), ''), 'UNK')
  end as app_code
from public.players p
where coalesce(
  p.fpl_position_id,
  case upper(p.position)
    when 'GK' then 1
    when 'DEF' then 2
    when 'MID' then 3
    when 'FWD' then 4
    else null
  end
) is not null
order by coalesce(
  p.fpl_position_id,
  case upper(p.position)
    when 'GK' then 1
    when 'DEF' then 2
    when 'MID' then 3
    when 'FWD' then 4
    else null
  end
), p.updated_at desc nulls last, p.created_at desc nulls last
on conflict (fpl_id) do nothing;

-- Backfill foreign keys on the legacy player snapshot table.
update public.players p
set price_tenths = round((p.price::numeric) * 10)::integer
where p.price is not null
  and p.price_tenths is null;

update public.players p
set web_name = coalesce(p.web_name, p.name)
where p.name is not null
  and p.web_name is null;

update public.players p
set team_id = t.id
from public.teams t
where p.fpl_team_id = t.fpl_id
  and (p.team_id is distinct from t.id);

update public.players p
set element_type_id = et.id
from public.element_types et
where p.fpl_position_id = et.fpl_id
  and (p.element_type_id is distinct from et.id);

update public.players p
set gameweek_id = gw.id
from public.gameweeks gw
where p.gameweek = gw.fpl_id
  and (p.gameweek_id is distinct from gw.id);

-- Backfill the stable player catalog from the latest known snapshot per FPL player.
with latest_player_snapshot as (
  select distinct on (p.fpl_id)
    p.fpl_id,
    coalesce(p.code, p.fpl_id) as code,
    coalesce(p.web_name, p.name) as web_name,
    p.first_name,
    p.second_name,
    p.known_name,
    coalesce(p.full_name, p.name) as full_name,
    p.team_id,
    p.fpl_team_id,
    p.element_type_id,
    p.fpl_position_id,
    p.price,
    p.price_tenths,
    p.total_points,
    p.minutes,
    p.form,
    p.status,
    p.selected_by_percent,
    p.chance_of_playing_next_round,
    p.chance_of_playing_this_round,
    p.news,
    p.news_added,
    p.photo,
    p.points_per_game,
    p.event_points,
    p.bonus,
    p.bps,
    p.influence,
    p.creativity,
    p.threat,
    p.ict_index,
    p.expected_goals,
    p.expected_assists,
    p.expected_goal_involvements,
    p.expected_goals_conceded,
    p.transfers_in,
    p.transfers_out,
    p.api_payload,
    coalesce(p.updated_at, p.created_at, timezone('utc', now())) as snapshot_updated_at
  from public.players p
  where p.fpl_id is not null
  order by p.fpl_id, p.gameweek desc nulls last, p.updated_at desc nulls last, p.created_at desc nulls last, p.id
)
insert into public.player_catalog (
  fpl_id,
  code,
  web_name,
  first_name,
  second_name,
  known_name,
  full_name,
  team_id,
  fpl_team_id,
  element_type_id,
  fpl_position_id,
  price,
  price_tenths,
  total_points,
  minutes,
  form,
  status,
  selected_by_percent,
  chance_of_playing_next_round,
  chance_of_playing_this_round,
  news,
  news_added,
  photo,
  points_per_game,
  event_points,
  bonus,
  bps,
  influence,
  creativity,
  threat,
  ict_index,
  expected_goals,
  expected_assists,
  expected_goal_involvements,
  expected_goals_conceded,
  transfers_in,
  transfers_out,
  api_payload,
  updated_at
)
select
  lps.fpl_id,
  lps.code,
  lps.web_name,
  lps.first_name,
  lps.second_name,
  lps.known_name,
  lps.full_name,
  lps.team_id,
  lps.fpl_team_id,
  lps.element_type_id,
  lps.fpl_position_id,
  lps.price,
  lps.price_tenths,
  lps.total_points,
  lps.minutes,
  lps.form,
  lps.status,
  lps.selected_by_percent,
  lps.chance_of_playing_next_round,
  lps.chance_of_playing_this_round,
  lps.news,
  lps.news_added,
  lps.photo,
  lps.points_per_game,
  lps.event_points,
  lps.bonus,
  lps.bps,
  lps.influence,
  lps.creativity,
  lps.threat,
  lps.ict_index,
  lps.expected_goals,
  lps.expected_assists,
  lps.expected_goal_involvements,
  lps.expected_goals_conceded,
  lps.transfers_in,
  lps.transfers_out,
  lps.api_payload,
  lps.snapshot_updated_at
from latest_player_snapshot lps
on conflict (fpl_id) do update
set
  code = coalesce(excluded.code, player_catalog.code),
  web_name = coalesce(excluded.web_name, player_catalog.web_name),
  first_name = coalesce(excluded.first_name, player_catalog.first_name),
  second_name = coalesce(excluded.second_name, player_catalog.second_name),
  known_name = coalesce(excluded.known_name, player_catalog.known_name),
  full_name = coalesce(excluded.full_name, player_catalog.full_name),
  team_id = coalesce(excluded.team_id, player_catalog.team_id),
  fpl_team_id = coalesce(excluded.fpl_team_id, player_catalog.fpl_team_id),
  element_type_id = coalesce(excluded.element_type_id, player_catalog.element_type_id),
  fpl_position_id = coalesce(excluded.fpl_position_id, player_catalog.fpl_position_id),
  price = coalesce(excluded.price, player_catalog.price),
  price_tenths = coalesce(excluded.price_tenths, player_catalog.price_tenths),
  total_points = coalesce(excluded.total_points, player_catalog.total_points),
  minutes = coalesce(excluded.minutes, player_catalog.minutes),
  form = coalesce(excluded.form, player_catalog.form),
  status = coalesce(excluded.status, player_catalog.status),
  selected_by_percent = coalesce(excluded.selected_by_percent, player_catalog.selected_by_percent),
  chance_of_playing_next_round = coalesce(excluded.chance_of_playing_next_round, player_catalog.chance_of_playing_next_round),
  chance_of_playing_this_round = coalesce(excluded.chance_of_playing_this_round, player_catalog.chance_of_playing_this_round),
  news = coalesce(excluded.news, player_catalog.news),
  news_added = coalesce(excluded.news_added, player_catalog.news_added),
  photo = coalesce(excluded.photo, player_catalog.photo),
  points_per_game = coalesce(excluded.points_per_game, player_catalog.points_per_game),
  event_points = coalesce(excluded.event_points, player_catalog.event_points),
  bonus = coalesce(excluded.bonus, player_catalog.bonus),
  bps = coalesce(excluded.bps, player_catalog.bps),
  influence = coalesce(excluded.influence, player_catalog.influence),
  creativity = coalesce(excluded.creativity, player_catalog.creativity),
  threat = coalesce(excluded.threat, player_catalog.threat),
  ict_index = coalesce(excluded.ict_index, player_catalog.ict_index),
  expected_goals = coalesce(excluded.expected_goals, player_catalog.expected_goals),
  expected_assists = coalesce(excluded.expected_assists, player_catalog.expected_assists),
  expected_goal_involvements = coalesce(excluded.expected_goal_involvements, player_catalog.expected_goal_involvements),
  expected_goals_conceded = coalesce(excluded.expected_goals_conceded, player_catalog.expected_goals_conceded),
  transfers_in = coalesce(excluded.transfers_in, player_catalog.transfers_in),
  transfers_out = coalesce(excluded.transfers_out, player_catalog.transfers_out),
  api_payload = coalesce(excluded.api_payload, player_catalog.api_payload),
  updated_at = timezone('utc', now());

update public.players p
set player_catalog_id = pc.id
from public.player_catalog pc
where p.fpl_id = pc.fpl_id
  and (p.player_catalog_id is distinct from pc.id);

-- Backfill user references from raw FPL ids where present.
update public.users u
set favourite_team_id = t.id
from public.teams t
where u.favourite_team_fpl_id = t.fpl_id
  and (u.favourite_team_id is distinct from t.id);

update public.users u
set started_gameweek_id = gw.id
from public.gameweeks gw
where u.started_gameweek = gw.fpl_id
  and (u.started_gameweek_id is distinct from gw.id);

update public.users u
set current_gameweek_id = gw.id
from public.gameweeks gw
where u.current_gameweek = gw.fpl_id
  and (u.current_gameweek_id is distinct from gw.id);

-- Backfill normalized references on player_gameweek_stats.
update public.player_gameweek_stats pgs
set gameweek_id = gw.id
from public.gameweeks gw
where pgs.gameweek = gw.fpl_id
  and (pgs.gameweek_id is distinct from gw.id);

update public.player_gameweek_stats pgs
set player_catalog_id = pc.id
from public.player_catalog pc
where pgs.fpl_id = pc.fpl_id
  and (pgs.player_catalog_id is distinct from pc.id);

update public.player_gameweek_stats pgs
set opponent_team_id = t.id
from public.teams t
where pgs.opponent_team_fpl_id = t.fpl_id
  and (pgs.opponent_team_id is distinct from t.id);

update public.player_gameweek_stats pgs
set fixture_id = f.id
from public.fixtures f
where pgs.fixture_fpl_id = f.fpl_id
  and (pgs.fixture_id is distinct from f.id);

-- Preserve any already-loaded fixture-grain rows when present, while allowing
-- the new history sync to own this table going forward.
insert into public.player_fixture_stats (
  player_catalog_id,
  fpl_id,
  gameweek,
  gameweek_id,
  fixture_fpl_id,
  fixture_id,
  opponent_team_fpl_id,
  opponent_team_id,
  was_home,
  kickoff_time,
  team_h_score,
  team_a_score,
  modified,
  total_points,
  minutes,
  goals_scored,
  assists,
  clean_sheets,
  goals_conceded,
  own_goals,
  penalties_saved,
  penalties_missed,
  yellow_cards,
  red_cards,
  saves,
  bonus,
  bps,
  influence,
  creativity,
  threat,
  ict_index,
  clearances_blocks_interceptions,
  recoveries,
  tackles,
  defensive_contribution,
  starts,
  expected_goals,
  expected_assists,
  expected_goal_involvements,
  expected_goals_conceded,
  value_tenths,
  transfers_balance,
  selected,
  transfers_in,
  transfers_out,
  api_payload,
  created_at,
  updated_at
)
select
  pgs.player_catalog_id,
  pgs.fpl_id,
  pgs.gameweek,
  pgs.gameweek_id,
  pgs.fixture_fpl_id,
  pgs.fixture_id,
  pgs.opponent_team_fpl_id,
  pgs.opponent_team_id,
  pgs.was_home,
  pgs.kickoff_time,
  pgs.team_h_score,
  pgs.team_a_score,
  pgs.modified,
  pgs.total_points,
  pgs.minutes,
  pgs.goals_scored,
  pgs.assists,
  pgs.clean_sheets,
  pgs.goals_conceded,
  pgs.own_goals,
  pgs.penalties_saved,
  pgs.penalties_missed,
  pgs.yellow_cards,
  pgs.red_cards,
  pgs.saves,
  pgs.bonus,
  pgs.bps,
  pgs.influence,
  pgs.creativity,
  pgs.threat,
  pgs.ict_index,
  pgs.clearances_blocks_interceptions,
  pgs.recoveries,
  pgs.tackles,
  pgs.defensive_contribution,
  pgs.starts,
  pgs.expected_goals,
  pgs.expected_assists,
  pgs.expected_goal_involvements,
  pgs.expected_goals_conceded,
  pgs.value_tenths,
  pgs.transfers_balance,
  pgs.selected,
  pgs.transfers_in,
  pgs.transfers_out,
  pgs.api_payload,
  coalesce(pgs.created_at, timezone('utc', now())),
  pgs.updated_at
from public.player_gameweek_stats pgs
where pgs.fixture_fpl_id is not null
on conflict (fpl_id, fixture_fpl_id) do update
set
  player_catalog_id = coalesce(excluded.player_catalog_id, player_fixture_stats.player_catalog_id),
  gameweek = excluded.gameweek,
  gameweek_id = coalesce(excluded.gameweek_id, player_fixture_stats.gameweek_id),
  fixture_id = coalesce(excluded.fixture_id, player_fixture_stats.fixture_id),
  opponent_team_fpl_id = coalesce(excluded.opponent_team_fpl_id, player_fixture_stats.opponent_team_fpl_id),
  opponent_team_id = coalesce(excluded.opponent_team_id, player_fixture_stats.opponent_team_id),
  was_home = coalesce(excluded.was_home, player_fixture_stats.was_home),
  kickoff_time = coalesce(excluded.kickoff_time, player_fixture_stats.kickoff_time),
  team_h_score = coalesce(excluded.team_h_score, player_fixture_stats.team_h_score),
  team_a_score = coalesce(excluded.team_a_score, player_fixture_stats.team_a_score),
  modified = coalesce(excluded.modified, player_fixture_stats.modified),
  total_points = coalesce(excluded.total_points, player_fixture_stats.total_points),
  minutes = coalesce(excluded.minutes, player_fixture_stats.minutes),
  goals_scored = coalesce(excluded.goals_scored, player_fixture_stats.goals_scored),
  assists = coalesce(excluded.assists, player_fixture_stats.assists),
  clean_sheets = coalesce(excluded.clean_sheets, player_fixture_stats.clean_sheets),
  goals_conceded = coalesce(excluded.goals_conceded, player_fixture_stats.goals_conceded),
  own_goals = coalesce(excluded.own_goals, player_fixture_stats.own_goals),
  penalties_saved = coalesce(excluded.penalties_saved, player_fixture_stats.penalties_saved),
  penalties_missed = coalesce(excluded.penalties_missed, player_fixture_stats.penalties_missed),
  yellow_cards = coalesce(excluded.yellow_cards, player_fixture_stats.yellow_cards),
  red_cards = coalesce(excluded.red_cards, player_fixture_stats.red_cards),
  saves = coalesce(excluded.saves, player_fixture_stats.saves),
  bonus = coalesce(excluded.bonus, player_fixture_stats.bonus),
  bps = coalesce(excluded.bps, player_fixture_stats.bps),
  influence = coalesce(excluded.influence, player_fixture_stats.influence),
  creativity = coalesce(excluded.creativity, player_fixture_stats.creativity),
  threat = coalesce(excluded.threat, player_fixture_stats.threat),
  ict_index = coalesce(excluded.ict_index, player_fixture_stats.ict_index),
  clearances_blocks_interceptions = coalesce(
    excluded.clearances_blocks_interceptions,
    player_fixture_stats.clearances_blocks_interceptions
  ),
  recoveries = coalesce(excluded.recoveries, player_fixture_stats.recoveries),
  tackles = coalesce(excluded.tackles, player_fixture_stats.tackles),
  defensive_contribution = coalesce(
    excluded.defensive_contribution,
    player_fixture_stats.defensive_contribution
  ),
  starts = coalesce(excluded.starts, player_fixture_stats.starts),
  expected_goals = coalesce(excluded.expected_goals, player_fixture_stats.expected_goals),
  expected_assists = coalesce(excluded.expected_assists, player_fixture_stats.expected_assists),
  expected_goal_involvements = coalesce(
    excluded.expected_goal_involvements,
    player_fixture_stats.expected_goal_involvements
  ),
  expected_goals_conceded = coalesce(
    excluded.expected_goals_conceded,
    player_fixture_stats.expected_goals_conceded
  ),
  value_tenths = coalesce(excluded.value_tenths, player_fixture_stats.value_tenths),
  transfers_balance = coalesce(excluded.transfers_balance, player_fixture_stats.transfers_balance),
  selected = coalesce(excluded.selected, player_fixture_stats.selected),
  transfers_in = coalesce(excluded.transfers_in, player_fixture_stats.transfers_in),
  transfers_out = coalesce(excluded.transfers_out, player_fixture_stats.transfers_out),
  api_payload = coalesce(excluded.api_payload, player_fixture_stats.api_payload),
  updated_at = timezone('utc', now());

-- Create the core fantasy squad tables. These tables use player_catalog so that
-- squads always point to a stable player identity instead of a gameweek snapshot.
create table if not exists public.squads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  fpl_entry_id bigint,
  favourite_team_fpl_id integer,
  favourite_team_id uuid references public.teams(id) on delete set null,
  started_gameweek integer,
  started_gameweek_id uuid references public.gameweeks(id) on delete set null,
  current_gameweek integer,
  budget_limit_tenths integer not null default 1000,
  bank_tenths integer not null default 0,
  squad_value_tenths integer not null default 1000,
  free_transfers integer not null default 1,
  total_transfers integer not null default 0,
  active_chip text,
  current_gameweek_id uuid references public.gameweeks(id) on delete set null,
  summary_overall_points integer,
  summary_overall_rank bigint,
  summary_event_points integer,
  summary_event_rank bigint,
  last_deadline_bank_tenths integer,
  last_deadline_value_tenths integer,
  last_deadline_total_transfers integer,
  club_badge_src text,
  api_payload jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint squads_name_not_blank check (btrim(name) <> ''),
  constraint squads_budget_values_non_negative check (
    budget_limit_tenths >= 0
    and bank_tenths >= 0
    and squad_value_tenths >= 0
    and free_transfers >= 0
    and total_transfers >= 0
  )
);

create table if not exists public.squad_players (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.squads(id) on delete cascade,
  player_catalog_id uuid not null references public.player_catalog(id) on delete restrict,
  acquired_gameweek_id uuid references public.gameweeks(id) on delete set null,
  released_gameweek_id uuid references public.gameweeks(id) on delete set null,
  purchase_price_tenths integer not null default 0,
  selling_price_tenths integer,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint squad_players_price_non_negative check (
    purchase_price_tenths >= 0
    and (selling_price_tenths is null or selling_price_tenths >= 0)
  ),
  constraint squad_players_release_consistency check (
    (is_active = true and released_gameweek_id is null)
    or is_active = false
  )
);

create table if not exists public.squad_gameweek_history (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.squads(id) on delete cascade,
  gameweek_id uuid not null references public.gameweeks(id) on delete cascade,
  active_chip text,
  points integer not null default 0,
  total_points integer not null default 0,
  rank bigint,
  overall_rank bigint,
  percentile_rank numeric(6,2),
  bank_tenths integer not null default 0,
  squad_value_tenths integer not null default 0,
  event_transfers integer not null default 0,
  event_transfers_cost integer not null default 0,
  points_on_bench integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint squad_gameweek_history_unique unique (squad_id, gameweek_id)
);

create table if not exists public.squad_gameweek_picks (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.squads(id) on delete cascade,
  gameweek_id uuid not null references public.gameweeks(id) on delete cascade,
  player_catalog_id uuid not null references public.player_catalog(id) on delete restrict,
  squad_player_id uuid references public.squad_players(id) on delete restrict,
  position integer not null,
  multiplier integer not null default 1,
  is_captain boolean not null default false,
  is_vice_captain boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint squad_gameweek_picks_unique unique (squad_id, gameweek_id, player_catalog_id),
  constraint squad_gameweek_picks_position_range check (position between 1 and 15),
  constraint squad_gameweek_picks_multiplier_range check (multiplier between 0 and 3),
  constraint squad_gameweek_picks_captain_flags check (
    not (is_captain and is_vice_captain)
  )
);

-- Backfill one active squad per existing user. This is safe and idempotent.
insert into public.squads (user_id, name)
select
  u.id,
  coalesce(nullif(btrim(u.team_name), ''), 'My Squad')
from public.users u
where not exists (
  select 1
  from public.squads s
  where s.user_id = u.id
    and s.is_active = true
);

update public.squads s
set
  fpl_entry_id = coalesce(s.fpl_entry_id, u.fpl_entry_id),
  favourite_team_fpl_id = coalesce(s.favourite_team_fpl_id, u.favourite_team_fpl_id),
  favourite_team_id = coalesce(s.favourite_team_id, u.favourite_team_id),
  started_gameweek = coalesce(s.started_gameweek, u.started_gameweek),
  started_gameweek_id = coalesce(s.started_gameweek_id, u.started_gameweek_id),
  current_gameweek = coalesce(s.current_gameweek, u.current_gameweek),
  current_gameweek_id = coalesce(s.current_gameweek_id, u.current_gameweek_id),
  summary_overall_points = coalesce(s.summary_overall_points, u.summary_overall_points),
  summary_overall_rank = coalesce(s.summary_overall_rank, u.summary_overall_rank),
  summary_event_points = coalesce(s.summary_event_points, u.summary_event_points),
  summary_event_rank = coalesce(s.summary_event_rank, u.summary_event_rank),
  last_deadline_bank_tenths = coalesce(s.last_deadline_bank_tenths, u.last_deadline_bank_tenths),
  last_deadline_value_tenths = coalesce(s.last_deadline_value_tenths, u.last_deadline_value_tenths),
  last_deadline_total_transfers = coalesce(
    s.last_deadline_total_transfers,
    u.last_deadline_total_transfers
  ),
  club_badge_src = coalesce(s.club_badge_src, u.club_badge_src),
  api_payload = coalesce(s.api_payload, u.api_payload)
from public.users u
where s.user_id = u.id
  and s.is_active = true;

-- Trigger functions keep normalized and backward-compatible columns synchronized.
create or replace function public.normalize_player_snapshot()
returns trigger
language plpgsql
as $$
declare
  v_team_id uuid;
  v_element_type_id uuid;
  v_gameweek_id uuid;
  v_player_catalog_id uuid;
  v_team_name text;
  v_team_fpl_id integer;
  v_position_app_code text;
  v_position_fpl_id integer;
  v_gameweek_fpl_id integer;
begin
  if new.price_tenths is null and new.price is not null then
    new.price_tenths := round((new.price::numeric) * 10)::integer;
  end if;

  if new.price is null and new.price_tenths is not null then
    new.price := new.price_tenths::numeric / 10;
  end if;

  if new.web_name is null and new.name is not null then
    new.web_name := new.name;
  end if;

  if new.full_name is null and new.name is not null then
    new.full_name := new.name;
  end if;

  if new.team_id is null and new.fpl_team_id is not null then
    new.team_id := public.ensure_team(new.fpl_team_id, new.team, null);
  end if;

  if new.team_id is not null and (new.fpl_team_id is null or new.team is null) then
    select t.fpl_id, t.name
    into v_team_fpl_id, v_team_name
    from public.teams t
    where t.id = new.team_id;

    new.fpl_team_id := coalesce(new.fpl_team_id, v_team_fpl_id);
    new.team := coalesce(new.team, v_team_name);
  end if;

  if new.element_type_id is null and new.fpl_position_id is not null then
    new.element_type_id := public.ensure_element_type(new.fpl_position_id, new.position, null);
  end if;

  if new.element_type_id is not null and (new.fpl_position_id is null or new.position is null) then
    select et.fpl_id, et.app_code
    into v_position_fpl_id, v_position_app_code
    from public.element_types et
    where et.id = new.element_type_id;

    new.fpl_position_id := coalesce(new.fpl_position_id, v_position_fpl_id);
    new.position := coalesce(new.position, v_position_app_code);
  end if;

  if new.gameweek_id is null and new.gameweek is not null then
    new.gameweek_id := public.ensure_gameweek(new.gameweek, null, null);
  end if;

  if new.gameweek_id is not null and new.gameweek is null then
    select gw.fpl_id
    into v_gameweek_fpl_id
    from public.gameweeks gw
    where gw.id = new.gameweek_id;

    new.gameweek := v_gameweek_fpl_id;
  end if;

  if new.fpl_id is not null then
    insert into public.player_catalog (
      fpl_id,
      code,
      web_name,
      first_name,
      second_name,
      known_name,
      full_name,
      team_id,
      fpl_team_id,
      element_type_id,
      fpl_position_id,
      price,
      price_tenths,
      total_points,
      minutes,
      form,
      status,
      selected_by_percent,
      chance_of_playing_next_round,
      chance_of_playing_this_round,
      news,
      news_added,
      photo,
      points_per_game,
      event_points,
      bonus,
      bps,
      influence,
      creativity,
      threat,
      ict_index,
      expected_goals,
      expected_assists,
      expected_goal_involvements,
      expected_goals_conceded,
      transfers_in,
      transfers_out,
      api_payload
    )
    values (
      new.fpl_id,
      coalesce(new.code, new.fpl_id),
      coalesce(new.web_name, new.name),
      new.first_name,
      new.second_name,
      new.known_name,
      coalesce(new.full_name, new.name),
      new.team_id,
      new.fpl_team_id,
      new.element_type_id,
      new.fpl_position_id,
      new.price,
      new.price_tenths,
      new.total_points,
      new.minutes,
      new.form,
      new.status,
      new.selected_by_percent,
      new.chance_of_playing_next_round,
      new.chance_of_playing_this_round,
      new.news,
      new.news_added,
      new.photo,
      new.points_per_game,
      new.event_points,
      new.bonus,
      new.bps,
      new.influence,
      new.creativity,
      new.threat,
      new.ict_index,
      new.expected_goals,
      new.expected_assists,
      new.expected_goal_involvements,
      new.expected_goals_conceded,
      new.transfers_in,
      new.transfers_out,
      new.api_payload
    )
    on conflict (fpl_id) do update
    set
      code = coalesce(excluded.code, player_catalog.code),
      web_name = coalesce(excluded.web_name, player_catalog.web_name),
      first_name = coalesce(excluded.first_name, player_catalog.first_name),
      second_name = coalesce(excluded.second_name, player_catalog.second_name),
      known_name = coalesce(excluded.known_name, player_catalog.known_name),
      full_name = coalesce(excluded.full_name, player_catalog.full_name),
      team_id = coalesce(excluded.team_id, player_catalog.team_id),
      fpl_team_id = coalesce(excluded.fpl_team_id, player_catalog.fpl_team_id),
      element_type_id = coalesce(excluded.element_type_id, player_catalog.element_type_id),
      fpl_position_id = coalesce(excluded.fpl_position_id, player_catalog.fpl_position_id),
      price = coalesce(excluded.price, player_catalog.price),
      price_tenths = coalesce(excluded.price_tenths, player_catalog.price_tenths),
      total_points = coalesce(excluded.total_points, player_catalog.total_points),
      minutes = coalesce(excluded.minutes, player_catalog.minutes),
      form = coalesce(excluded.form, player_catalog.form),
      status = coalesce(excluded.status, player_catalog.status),
      selected_by_percent = coalesce(excluded.selected_by_percent, player_catalog.selected_by_percent),
      chance_of_playing_next_round = coalesce(excluded.chance_of_playing_next_round, player_catalog.chance_of_playing_next_round),
      chance_of_playing_this_round = coalesce(excluded.chance_of_playing_this_round, player_catalog.chance_of_playing_this_round),
      news = coalesce(excluded.news, player_catalog.news),
      news_added = coalesce(excluded.news_added, player_catalog.news_added),
      photo = coalesce(excluded.photo, player_catalog.photo),
      points_per_game = coalesce(excluded.points_per_game, player_catalog.points_per_game),
      event_points = coalesce(excluded.event_points, player_catalog.event_points),
      bonus = coalesce(excluded.bonus, player_catalog.bonus),
      bps = coalesce(excluded.bps, player_catalog.bps),
      influence = coalesce(excluded.influence, player_catalog.influence),
      creativity = coalesce(excluded.creativity, player_catalog.creativity),
      threat = coalesce(excluded.threat, player_catalog.threat),
      ict_index = coalesce(excluded.ict_index, player_catalog.ict_index),
      expected_goals = coalesce(excluded.expected_goals, player_catalog.expected_goals),
      expected_assists = coalesce(excluded.expected_assists, player_catalog.expected_assists),
      expected_goal_involvements = coalesce(excluded.expected_goal_involvements, player_catalog.expected_goal_involvements),
      expected_goals_conceded = coalesce(excluded.expected_goals_conceded, player_catalog.expected_goals_conceded),
      transfers_in = coalesce(excluded.transfers_in, player_catalog.transfers_in),
      transfers_out = coalesce(excluded.transfers_out, player_catalog.transfers_out),
      api_payload = coalesce(excluded.api_payload, player_catalog.api_payload),
      updated_at = timezone('utc', now())
    returning id into v_player_catalog_id;

    new.player_catalog_id := v_player_catalog_id;
  end if;

  return new;
end;
$$;

create or replace function public.normalize_player_gameweek_stats()
returns trigger
language plpgsql
as $$
declare
  v_player_catalog_id uuid;
  v_gameweek_fpl_id integer;
  v_fixture_id uuid;
begin
  if new.gameweek_id is null and new.gameweek is not null then
    new.gameweek_id := public.ensure_gameweek(new.gameweek, null, null);
  end if;

  if new.gameweek is null and new.gameweek_id is not null then
    select gw.fpl_id
    into v_gameweek_fpl_id
    from public.gameweeks gw
    where gw.id = new.gameweek_id;

    new.gameweek := v_gameweek_fpl_id;
  end if;

  if new.opponent_team_id is null and new.opponent_team_fpl_id is not null then
    new.opponent_team_id := public.ensure_team(new.opponent_team_fpl_id, null, null);
  end if;

  if new.fixture_id is null and new.fixture_fpl_id is not null then
    select f.id
    into v_fixture_id
    from public.fixtures f
    where f.fpl_id = new.fixture_fpl_id;

    new.fixture_id := v_fixture_id;
  end if;

  if new.player_catalog_id is null and new.player_id is not null then
    select p.player_catalog_id
    into v_player_catalog_id
    from public.players p
    where p.id = new.player_id;

    new.player_catalog_id := v_player_catalog_id;
  end if;

  if new.player_catalog_id is null and new.fpl_id is not null then
    select pc.id
    into v_player_catalog_id
    from public.player_catalog pc
    where pc.fpl_id = new.fpl_id;

    new.player_catalog_id := v_player_catalog_id;
  end if;

  return new;
end;
$$;

create or replace function public.normalize_player_fixture_stats()
returns trigger
language plpgsql
as $$
declare
  v_player_catalog_id uuid;
  v_fpl_id integer;
  v_gameweek_fpl_id integer;
  v_fixture_id uuid;
  v_fixture_fpl_id integer;
  v_fixture_gameweek integer;
  v_fixture_gameweek_id uuid;
  v_opponent_team_fpl_id integer;
begin
  if new.gameweek_id is null and new.gameweek is not null then
    new.gameweek_id := public.ensure_gameweek(new.gameweek, null, null);
  end if;

  if new.gameweek is null and new.gameweek_id is not null then
    select gw.fpl_id
    into v_gameweek_fpl_id
    from public.gameweeks gw
    where gw.id = new.gameweek_id;

    new.gameweek := v_gameweek_fpl_id;
  end if;

  if new.fixture_id is null and new.fixture_fpl_id is not null then
    select f.id, f.gameweek, f.gameweek_id
    into v_fixture_id, v_fixture_gameweek, v_fixture_gameweek_id
    from public.fixtures f
    where f.fpl_id = new.fixture_fpl_id;

    new.fixture_id := v_fixture_id;
    new.gameweek := coalesce(new.gameweek, v_fixture_gameweek);
    new.gameweek_id := coalesce(new.gameweek_id, v_fixture_gameweek_id);
  end if;

  if new.fixture_id is not null and (new.fixture_fpl_id is null or new.gameweek is null or new.gameweek_id is null) then
    select f.fpl_id, f.gameweek, f.gameweek_id
    into v_fixture_fpl_id, v_fixture_gameweek, v_fixture_gameweek_id
    from public.fixtures f
    where f.id = new.fixture_id;

    new.fixture_fpl_id := coalesce(new.fixture_fpl_id, v_fixture_fpl_id);
    new.gameweek := coalesce(new.gameweek, v_fixture_gameweek);
    new.gameweek_id := coalesce(new.gameweek_id, v_fixture_gameweek_id);
  end if;

  if new.opponent_team_id is null and new.opponent_team_fpl_id is not null then
    new.opponent_team_id := public.ensure_team(new.opponent_team_fpl_id, null, null);
  end if;

  if new.opponent_team_id is not null and new.opponent_team_fpl_id is null then
    select t.fpl_id
    into v_opponent_team_fpl_id
    from public.teams t
    where t.id = new.opponent_team_id;

    new.opponent_team_fpl_id := v_opponent_team_fpl_id;
  end if;

  if new.player_catalog_id is null and new.fpl_id is not null then
    select pc.id
    into v_player_catalog_id
    from public.player_catalog pc
    where pc.fpl_id = new.fpl_id;

    new.player_catalog_id := v_player_catalog_id;
  end if;

  if new.fpl_id is null and new.player_catalog_id is not null then
    select pc.fpl_id
    into v_fpl_id
    from public.player_catalog pc
    where pc.id = new.player_catalog_id;

    new.fpl_id := v_fpl_id;
  end if;

  return new;
end;
$$;

create or replace function public.refresh_player_gameweek_stats_from_fixture_stats(
  p_fpl_ids integer[] default null,
  p_gameweeks integer[] default null
)
returns void
language plpgsql
as $$
begin
  insert into public.player_gameweek_stats (
    player_id,
    player_catalog_id,
    fpl_id,
    gameweek,
    gameweek_id,
    total_points,
    minutes,
    goals_scored,
    assists,
    clean_sheets,
    modified,
    goals_conceded,
    own_goals,
    penalties_saved,
    penalties_missed,
    yellow_cards,
    red_cards,
    saves,
    bonus,
    bps,
    influence,
    creativity,
    threat,
    ict_index,
    clearances_blocks_interceptions,
    recoveries,
    tackles,
    defensive_contribution,
    starts,
    expected_goals,
    expected_assists,
    expected_goal_involvements,
    expected_goals_conceded,
    value_tenths,
    transfers_balance,
    selected,
    transfers_in,
    transfers_out,
    updated_at
  )
  select
    coalesce(exact_snapshot.id, latest_snapshot.id) as player_id,
    aggregated.player_catalog_id,
    aggregated.fpl_id,
    aggregated.gameweek,
    aggregated.gameweek_id,
    aggregated.total_points,
    aggregated.minutes,
    aggregated.goals_scored,
    aggregated.assists,
    aggregated.clean_sheets,
    aggregated.modified,
    aggregated.goals_conceded,
    aggregated.own_goals,
    aggregated.penalties_saved,
    aggregated.penalties_missed,
    aggregated.yellow_cards,
    aggregated.red_cards,
    aggregated.saves,
    aggregated.bonus,
    aggregated.bps,
    aggregated.influence,
    aggregated.creativity,
    aggregated.threat,
    aggregated.ict_index,
    aggregated.clearances_blocks_interceptions,
    aggregated.recoveries,
    aggregated.tackles,
    aggregated.defensive_contribution,
    aggregated.starts,
    aggregated.expected_goals,
    aggregated.expected_assists,
    aggregated.expected_goal_involvements,
    aggregated.expected_goals_conceded,
    aggregated.value_tenths,
    aggregated.transfers_balance,
    aggregated.selected,
    aggregated.transfers_in,
    aggregated.transfers_out,
    timezone('utc', now())
  from (
    select
      pfs.player_catalog_id,
      pfs.fpl_id,
      pfs.gameweek,
      (min(pfs.gameweek_id::text) filter (where pfs.gameweek_id is not null))::uuid as gameweek_id,
      sum(coalesce(pfs.total_points, 0)) as total_points,
      sum(coalesce(pfs.minutes, 0)) as minutes,
      sum(coalesce(pfs.goals_scored, 0)) as goals_scored,
      sum(coalesce(pfs.assists, 0)) as assists,
      sum(coalesce(pfs.clean_sheets, 0)) as clean_sheets,
      bool_or(coalesce(pfs.modified, false)) as modified,
      sum(coalesce(pfs.goals_conceded, 0)) as goals_conceded,
      sum(coalesce(pfs.own_goals, 0)) as own_goals,
      sum(coalesce(pfs.penalties_saved, 0)) as penalties_saved,
      sum(coalesce(pfs.penalties_missed, 0)) as penalties_missed,
      sum(coalesce(pfs.yellow_cards, 0)) as yellow_cards,
      sum(coalesce(pfs.red_cards, 0)) as red_cards,
      sum(coalesce(pfs.saves, 0)) as saves,
      sum(coalesce(pfs.bonus, 0)) as bonus,
      sum(coalesce(pfs.bps, 0)) as bps,
      sum(coalesce(pfs.influence, 0)) as influence,
      sum(coalesce(pfs.creativity, 0)) as creativity,
      sum(coalesce(pfs.threat, 0)) as threat,
      sum(coalesce(pfs.ict_index, 0)) as ict_index,
      sum(coalesce(pfs.clearances_blocks_interceptions, 0)) as clearances_blocks_interceptions,
      sum(coalesce(pfs.recoveries, 0)) as recoveries,
      sum(coalesce(pfs.tackles, 0)) as tackles,
      sum(coalesce(pfs.defensive_contribution, 0)) as defensive_contribution,
      sum(coalesce(pfs.starts, 0)) as starts,
      sum(coalesce(pfs.expected_goals, 0)) as expected_goals,
      sum(coalesce(pfs.expected_assists, 0)) as expected_assists,
      sum(coalesce(pfs.expected_goal_involvements, 0)) as expected_goal_involvements,
      sum(coalesce(pfs.expected_goals_conceded, 0)) as expected_goals_conceded,
      round(avg(pfs.value_tenths))::integer as value_tenths,
      round(avg(pfs.transfers_balance))::integer as transfers_balance,
      round(avg(pfs.selected))::bigint as selected,
      round(avg(pfs.transfers_in))::bigint as transfers_in,
      round(avg(pfs.transfers_out))::bigint as transfers_out
    from public.player_fixture_stats pfs
    where (p_fpl_ids is null or pfs.fpl_id = any(p_fpl_ids))
      and (p_gameweeks is null or pfs.gameweek = any(p_gameweeks))
    group by pfs.player_catalog_id, pfs.fpl_id, pfs.gameweek
  ) aggregated
  left join lateral (
    select p.id
    from public.players p
    where p.fpl_id = aggregated.fpl_id
      and p.gameweek = aggregated.gameweek
    order by p.updated_at desc nulls last, p.created_at desc nulls last, p.id
    limit 1
  ) exact_snapshot on true
  left join lateral (
    select p.id
    from public.players p
    where p.fpl_id = aggregated.fpl_id
    order by p.gameweek desc nulls last, p.updated_at desc nulls last, p.created_at desc nulls last, p.id
    limit 1
  ) latest_snapshot on true
  on conflict (fpl_id, gameweek) do update
  set
    player_id = coalesce(excluded.player_id, player_gameweek_stats.player_id),
    player_catalog_id = coalesce(excluded.player_catalog_id, player_gameweek_stats.player_catalog_id),
    gameweek_id = coalesce(excluded.gameweek_id, player_gameweek_stats.gameweek_id),
    fixture_fpl_id = null,
    fixture_id = null,
    opponent_team_fpl_id = null,
    opponent_team_id = null,
    was_home = null,
    kickoff_time = null,
    team_h_score = null,
    team_a_score = null,
    total_points = excluded.total_points,
    minutes = excluded.minutes,
    goals_scored = excluded.goals_scored,
    assists = excluded.assists,
    clean_sheets = excluded.clean_sheets,
    modified = excluded.modified,
    goals_conceded = excluded.goals_conceded,
    own_goals = excluded.own_goals,
    penalties_saved = excluded.penalties_saved,
    penalties_missed = excluded.penalties_missed,
    yellow_cards = excluded.yellow_cards,
    red_cards = excluded.red_cards,
    saves = excluded.saves,
    bonus = excluded.bonus,
    bps = excluded.bps,
    influence = excluded.influence,
    creativity = excluded.creativity,
    threat = excluded.threat,
    ict_index = excluded.ict_index,
    clearances_blocks_interceptions = excluded.clearances_blocks_interceptions,
    recoveries = excluded.recoveries,
    tackles = excluded.tackles,
    defensive_contribution = excluded.defensive_contribution,
    starts = excluded.starts,
    expected_goals = excluded.expected_goals,
    expected_assists = excluded.expected_assists,
    expected_goal_involvements = excluded.expected_goal_involvements,
    expected_goals_conceded = excluded.expected_goals_conceded,
    value_tenths = excluded.value_tenths,
    transfers_balance = excluded.transfers_balance,
    selected = excluded.selected,
    transfers_in = excluded.transfers_in,
    transfers_out = excluded.transfers_out,
    api_payload = null,
    updated_at = timezone('utc', now());
end;
$$;

create or replace function public.normalize_user_fpl_refs()
returns trigger
language plpgsql
as $$
begin
  if new.favourite_team_id is null and new.favourite_team_fpl_id is not null then
    new.favourite_team_id := public.ensure_team(new.favourite_team_fpl_id, null, null);
  end if;

  if new.started_gameweek_id is null and new.started_gameweek is not null then
    new.started_gameweek_id := public.ensure_gameweek(new.started_gameweek, null, null);
  end if;

  if new.current_gameweek_id is null and new.current_gameweek is not null then
    new.current_gameweek_id := public.ensure_gameweek(new.current_gameweek, null, null);
  end if;

  return new;
end;
$$;

create or replace function public.normalize_fixture_refs()
returns trigger
language plpgsql
as $$
declare
  v_gameweek_fpl_id integer;
  v_team_h_fpl_id integer;
  v_team_a_fpl_id integer;
begin
  if new.gameweek_id is null and new.gameweek is not null then
    new.gameweek_id := public.ensure_gameweek(new.gameweek, null, null);
  end if;

  if new.gameweek is null and new.gameweek_id is not null then
    select gw.fpl_id
    into v_gameweek_fpl_id
    from public.gameweeks gw
    where gw.id = new.gameweek_id;

    new.gameweek := v_gameweek_fpl_id;
  end if;

  if new.team_h_id is null and new.team_h_fpl_id is not null then
    new.team_h_id := public.ensure_team(new.team_h_fpl_id, null, null);
  end if;

  if new.team_a_id is null and new.team_a_fpl_id is not null then
    new.team_a_id := public.ensure_team(new.team_a_fpl_id, null, null);
  end if;

  if new.team_h_id is not null and new.team_h_fpl_id is null then
    select t.fpl_id
    into v_team_h_fpl_id
    from public.teams t
    where t.id = new.team_h_id;

    new.team_h_fpl_id := v_team_h_fpl_id;
  end if;

  if new.team_a_id is not null and new.team_a_fpl_id is null then
    select t.fpl_id
    into v_team_a_fpl_id
    from public.teams t
    where t.id = new.team_a_id;

    new.team_a_fpl_id := v_team_a_fpl_id;
  end if;

  return new;
end;
$$;

create or replace function public.normalize_squad_fpl_refs()
returns trigger
language plpgsql
as $$
begin
  if new.favourite_team_id is null and new.favourite_team_fpl_id is not null then
    new.favourite_team_id := public.ensure_team(new.favourite_team_fpl_id, null, null);
  end if;

  if new.started_gameweek_id is null and new.started_gameweek is not null then
    new.started_gameweek_id := public.ensure_gameweek(new.started_gameweek, null, null);
  end if;

  if new.current_gameweek_id is null and new.current_gameweek is not null then
    new.current_gameweek_id := public.ensure_gameweek(new.current_gameweek, null, null);
  end if;

  return new;
end;
$$;

create or replace function public.validate_squad_budget_limit()
returns trigger
language plpgsql
as $$
declare
  v_purchase_total integer := 0;
  v_current_value integer := 0;
begin
  if new.id is not null then
    select
      coalesce(sum(sp.purchase_price_tenths), 0),
      coalesce(sum(coalesce(pc.price_tenths, sp.purchase_price_tenths)), 0)
    into v_purchase_total, v_current_value
    from public.squad_players sp
    left join public.player_catalog pc
      on pc.id = sp.player_catalog_id
    where sp.squad_id = new.id
      and sp.is_active = true;

    if v_purchase_total > new.budget_limit_tenths then
      raise exception 'Squad budget exceeded: active player cost % is above limit %.',
        v_purchase_total,
        new.budget_limit_tenths;
    end if;

    new.bank_tenths := new.budget_limit_tenths - v_purchase_total;
    new.squad_value_tenths := v_current_value;
  else
    new.bank_tenths := coalesce(new.bank_tenths, new.budget_limit_tenths);
    new.squad_value_tenths := coalesce(new.squad_value_tenths, 0);
  end if;

  return new;
end;
$$;

create or replace function public.default_squad_player_price()
returns trigger
language plpgsql
as $$
declare
  v_purchase_price_tenths integer;
begin
  if new.purchase_price_tenths = 0 then
    select coalesce(pc.price_tenths, 0)
    into v_purchase_price_tenths
    from public.player_catalog pc
    where pc.id = new.player_catalog_id;

    new.purchase_price_tenths := coalesce(v_purchase_price_tenths, 0);
  end if;

  return new;
end;
$$;

create or replace function public.sync_squad_financials(p_squad_id uuid)
returns void
language plpgsql
as $$
declare
  v_budget_limit integer;
  v_purchase_total integer := 0;
  v_current_value integer := 0;
begin
  if p_squad_id is null then
    return;
  end if;

  select s.budget_limit_tenths
  into v_budget_limit
  from public.squads s
  where s.id = p_squad_id;

  if not found then
    return;
  end if;

  select
    coalesce(sum(sp.purchase_price_tenths), 0),
    coalesce(sum(coalesce(pc.price_tenths, sp.purchase_price_tenths)), 0)
  into v_purchase_total, v_current_value
  from public.squad_players sp
  left join public.player_catalog pc
    on pc.id = sp.player_catalog_id
  where sp.squad_id = p_squad_id
    and sp.is_active = true;

  if v_purchase_total > v_budget_limit then
    raise exception 'Squad budget exceeded: active player cost % is above limit %.',
      v_purchase_total,
      v_budget_limit;
  end if;

  update public.squads s
  set
    bank_tenths = v_budget_limit - v_purchase_total,
    squad_value_tenths = v_current_value
  where s.id = p_squad_id;
end;
$$;

create or replace function public.enforce_active_squad_player_limit()
returns trigger
language plpgsql
as $$
declare
  v_squad_id uuid;
  v_active_count integer;
begin
  v_squad_id := coalesce(new.squad_id, old.squad_id);

  select count(*)
  into v_active_count
  from public.squad_players sp
  where sp.squad_id = v_squad_id
    and sp.is_active = true;

  if v_active_count > 15 then
    raise exception 'A squad cannot have more than 15 active players.';
  end if;

  return null;
end;
$$;

create or replace function public.recalculate_squad_financials()
returns trigger
language plpgsql
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.sync_squad_financials(new.squad_id);
  end if;

  if tg_op = 'DELETE' then
    perform public.sync_squad_financials(old.squad_id);
  elsif tg_op = 'UPDATE' and old.squad_id is distinct from new.squad_id then
    perform public.sync_squad_financials(old.squad_id);
  end if;

  return null;
end;
$$;

create or replace function public.validate_squad_gameweek_pick()
returns trigger
language plpgsql
as $$
declare
  v_pick_gameweek integer;
  v_squad_player_id uuid;
begin
  select gw.fpl_id
  into v_pick_gameweek
  from public.gameweeks gw
  where gw.id = new.gameweek_id;

  if new.squad_player_id is not null then
    select sp.id
    into v_squad_player_id
    from public.squad_players sp
    left join public.gameweeks agw
      on agw.id = sp.acquired_gameweek_id
    left join public.gameweeks rgw
      on rgw.id = sp.released_gameweek_id
    where sp.id = new.squad_player_id
      and sp.squad_id = new.squad_id
      and sp.player_catalog_id = new.player_catalog_id
      and (
        v_pick_gameweek is null
        or coalesce(agw.fpl_id, v_pick_gameweek) <= v_pick_gameweek
      )
      and (
        v_pick_gameweek is null
        or rgw.fpl_id is null
        or rgw.fpl_id > v_pick_gameweek
      )
    order by sp.created_at desc, sp.id desc
    limit 1;
  else
    select sp.id
    into v_squad_player_id
    from public.squad_players sp
    left join public.gameweeks agw
      on agw.id = sp.acquired_gameweek_id
    left join public.gameweeks rgw
      on rgw.id = sp.released_gameweek_id
    where sp.squad_id = new.squad_id
      and sp.player_catalog_id = new.player_catalog_id
      and (
        (v_pick_gameweek is null and sp.is_active = true)
        or (
          v_pick_gameweek is not null
          and coalesce(agw.fpl_id, v_pick_gameweek) <= v_pick_gameweek
          and (rgw.fpl_id is null or rgw.fpl_id > v_pick_gameweek)
        )
      )
    order by
      case when sp.is_active then 0 else 1 end,
      sp.created_at desc,
      sp.id desc
    limit 1;
  end if;

  if v_squad_player_id is null then
    raise exception 'Picked player must belong to the squad for the selected gameweek.';
  end if;

  new.squad_player_id := v_squad_player_id;
  return new;
end;
$$;

select public.refresh_player_gameweek_stats_from_fixture_stats();

-- Attach triggers.
drop trigger if exists trg_teams_set_updated_at on public.teams;
create trigger trg_teams_set_updated_at
before update on public.teams
for each row
execute function public.set_updated_at();

drop trigger if exists trg_gameweeks_set_updated_at on public.gameweeks;
create trigger trg_gameweeks_set_updated_at
before update on public.gameweeks
for each row
execute function public.set_updated_at();

drop trigger if exists trg_element_types_set_updated_at on public.element_types;
create trigger trg_element_types_set_updated_at
before update on public.element_types
for each row
execute function public.set_updated_at();

drop trigger if exists trg_fixtures_set_updated_at on public.fixtures;
create trigger trg_fixtures_set_updated_at
before update on public.fixtures
for each row
execute function public.set_updated_at();

drop trigger if exists trg_fixtures_normalize_refs on public.fixtures;
create trigger trg_fixtures_normalize_refs
before insert or update on public.fixtures
for each row
execute function public.normalize_fixture_refs();

drop trigger if exists trg_player_catalog_set_updated_at on public.player_catalog;
create trigger trg_player_catalog_set_updated_at
before update on public.player_catalog
for each row
execute function public.set_updated_at();

drop trigger if exists trg_player_fixture_stats_normalize_refs on public.player_fixture_stats;
create trigger trg_player_fixture_stats_normalize_refs
before insert or update on public.player_fixture_stats
for each row
execute function public.normalize_player_fixture_stats();

drop trigger if exists trg_player_fixture_stats_set_updated_at on public.player_fixture_stats;
create trigger trg_player_fixture_stats_set_updated_at
before update on public.player_fixture_stats
for each row
execute function public.set_updated_at();

drop trigger if exists trg_players_normalize_refs on public.players;
create trigger trg_players_normalize_refs
before insert or update on public.players
for each row
execute function public.normalize_player_snapshot();

drop trigger if exists trg_players_set_updated_at on public.players;
create trigger trg_players_set_updated_at
before update on public.players
for each row
execute function public.set_updated_at();

drop trigger if exists trg_player_gameweek_stats_normalize_refs on public.player_gameweek_stats;
create trigger trg_player_gameweek_stats_normalize_refs
before insert or update on public.player_gameweek_stats
for each row
execute function public.normalize_player_gameweek_stats();

drop trigger if exists trg_player_gameweek_stats_set_updated_at on public.player_gameweek_stats;
create trigger trg_player_gameweek_stats_set_updated_at
before update on public.player_gameweek_stats
for each row
execute function public.set_updated_at();

drop trigger if exists trg_users_normalize_refs on public.users;
create trigger trg_users_normalize_refs
before insert or update on public.users
for each row
execute function public.normalize_user_fpl_refs();

drop trigger if exists trg_users_set_updated_at on public.users;
create trigger trg_users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists trg_squads_set_updated_at on public.squads;
create trigger trg_squads_set_updated_at
before update on public.squads
for each row
execute function public.set_updated_at();

drop trigger if exists trg_squads_validate_budget on public.squads;
create trigger trg_squads_validate_budget
before insert or update on public.squads
for each row
execute function public.validate_squad_budget_limit();

drop trigger if exists trg_squads_normalize_refs on public.squads;
create trigger trg_squads_normalize_refs
before insert or update on public.squads
for each row
execute function public.normalize_squad_fpl_refs();

drop trigger if exists trg_squad_players_default_price on public.squad_players;
create trigger trg_squad_players_default_price
before insert or update on public.squad_players
for each row
execute function public.default_squad_player_price();

drop trigger if exists trg_squad_players_set_updated_at on public.squad_players;
create trigger trg_squad_players_set_updated_at
before update on public.squad_players
for each row
execute function public.set_updated_at();

drop trigger if exists trg_squad_players_enforce_active_limit on public.squad_players;
create constraint trigger trg_squad_players_enforce_active_limit
after insert or update or delete on public.squad_players
deferrable initially deferred
for each row
execute function public.enforce_active_squad_player_limit();

drop trigger if exists trg_squad_players_recalculate_budget on public.squad_players;
create constraint trigger trg_squad_players_recalculate_budget
after insert or update or delete on public.squad_players
deferrable initially deferred
for each row
execute function public.recalculate_squad_financials();

drop trigger if exists trg_squad_gameweek_history_set_updated_at on public.squad_gameweek_history;
create trigger trg_squad_gameweek_history_set_updated_at
before update on public.squad_gameweek_history
for each row
execute function public.set_updated_at();

drop trigger if exists trg_squad_gameweek_picks_validate_player on public.squad_gameweek_picks;
create trigger trg_squad_gameweek_picks_validate_player
before insert or update on public.squad_gameweek_picks
for each row
execute function public.validate_squad_gameweek_pick();

drop trigger if exists trg_squad_gameweek_picks_set_updated_at on public.squad_gameweek_picks;
create trigger trg_squad_gameweek_picks_set_updated_at
before update on public.squad_gameweek_picks
for each row
execute function public.set_updated_at();

-- Performance indexes for ingestion and read-heavy app queries.
create unique index if not exists gameweeks_single_current_idx
  on public.gameweeks (is_current)
  where is_current = true;

create unique index if not exists gameweeks_single_next_idx
  on public.gameweeks (is_next)
  where is_next = true;

create index if not exists gameweeks_deadline_time_idx
  on public.gameweeks (deadline_time);

create index if not exists fixtures_gameweek_kickoff_idx
  on public.fixtures (gameweek_id, kickoff_time);

create index if not exists fixtures_home_team_idx
  on public.fixtures (team_h_id, kickoff_time);

create index if not exists fixtures_away_team_idx
  on public.fixtures (team_a_id, kickoff_time);

create index if not exists player_catalog_team_position_idx
  on public.player_catalog (team_id, element_type_id);

create index if not exists player_catalog_total_points_idx
  on public.player_catalog (total_points desc, fpl_id);

create index if not exists player_catalog_status_idx
  on public.player_catalog (status, chance_of_playing_next_round);

create index if not exists player_fixture_stats_catalog_fixture_idx
  on public.player_fixture_stats (player_catalog_id, fixture_id);

create index if not exists player_fixture_stats_catalog_gameweek_idx
  on public.player_fixture_stats (player_catalog_id, gameweek_id);

create index if not exists player_fixture_stats_gameweek_points_idx
  on public.player_fixture_stats (gameweek_id, total_points desc);

create index if not exists player_fixture_stats_fixture_idx
  on public.player_fixture_stats (fixture_id);

create index if not exists player_fixture_stats_opponent_team_idx
  on public.player_fixture_stats (opponent_team_id, gameweek_id);

create index if not exists players_catalog_gameweek_idx
  on public.players (player_catalog_id, gameweek_id);

create index if not exists players_gameweek_points_idx
  on public.players (gameweek_id, total_points desc);

create index if not exists players_team_gameweek_idx
  on public.players (team_id, gameweek_id);

create index if not exists player_gameweek_stats_catalog_gameweek_idx
  on public.player_gameweek_stats (player_catalog_id, gameweek_id);

create index if not exists player_gameweek_stats_gameweek_points_idx
  on public.player_gameweek_stats (gameweek_id, total_points desc);

create index if not exists player_gameweek_stats_fixture_idx
  on public.player_gameweek_stats (fixture_id);

create index if not exists player_gameweek_stats_opponent_team_idx
  on public.player_gameweek_stats (opponent_team_id, gameweek_id);

create index if not exists users_fpl_entry_id_idx
  on public.users (fpl_entry_id)
  where fpl_entry_id is not null;

create index if not exists users_email_lookup_idx
  on public.users (lower(email))
  where email is not null;

create unique index if not exists squads_fpl_entry_id_idx
  on public.squads (fpl_entry_id)
  where fpl_entry_id is not null;

create unique index if not exists squads_one_active_per_user_idx
  on public.squads (user_id)
  where is_active = true;

create index if not exists squads_user_active_idx
  on public.squads (user_id, is_active);

create unique index if not exists squad_players_active_unique_idx
  on public.squad_players (squad_id, player_catalog_id)
  where is_active = true;

create index if not exists squad_players_squad_active_idx
  on public.squad_players (squad_id, is_active);

create index if not exists squad_gameweek_history_points_idx
  on public.squad_gameweek_history (gameweek_id, points desc);

create unique index if not exists squad_gameweek_picks_unique_position_idx
  on public.squad_gameweek_picks (squad_id, gameweek_id, position);

create unique index if not exists squad_gameweek_picks_unique_squad_player_idx
  on public.squad_gameweek_picks (squad_id, gameweek_id, squad_player_id)
  where squad_player_id is not null;

create unique index if not exists squad_gameweek_picks_one_captain_idx
  on public.squad_gameweek_picks (squad_id, gameweek_id)
  where is_captain = true;

create unique index if not exists squad_gameweek_picks_one_vice_captain_idx
  on public.squad_gameweek_picks (squad_id, gameweek_id)
  where is_vice_captain = true;

create index if not exists squad_gameweek_picks_lookup_idx
  on public.squad_gameweek_picks (squad_id, gameweek_id);

-- Public dimensions are read-only for clients. Mutable fantasy data stays
-- behind authenticated owner policies.
alter table public.teams enable row level security;
alter table public.gameweeks enable row level security;
alter table public.element_types enable row level security;
alter table public.fixtures enable row level security;
alter table public.player_catalog enable row level security;
alter table public.player_fixture_stats enable row level security;
alter table public.squads enable row level security;
alter table public.squad_players enable row level security;
alter table public.squad_gameweek_history enable row level security;
alter table public.squad_gameweek_picks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'teams'
      and policyname = 'Public read teams'
  ) then
    create policy "Public read teams"
      on public.teams
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'gameweeks'
      and policyname = 'Public read gameweeks'
  ) then
    create policy "Public read gameweeks"
      on public.gameweeks
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'element_types'
      and policyname = 'Public read element types'
  ) then
    create policy "Public read element types"
      on public.element_types
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'fixtures'
      and policyname = 'Public read fixtures'
  ) then
    create policy "Public read fixtures"
      on public.fixtures
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'player_catalog'
      and policyname = 'Public read player catalog'
  ) then
    create policy "Public read player catalog"
      on public.player_catalog
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'player_fixture_stats'
      and policyname = 'Public read player fixture stats'
  ) then
    create policy "Public read player fixture stats"
      on public.player_fixture_stats
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'squads'
      and policyname = 'Users manage own squads'
  ) then
    create policy "Users manage own squads"
      on public.squads
      for all
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'squad_players'
      and policyname = 'Users manage own squad players'
  ) then
    create policy "Users manage own squad players"
      on public.squad_players
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.squads s
          where s.id = squad_players.squad_id
            and s.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.squads s
          where s.id = squad_players.squad_id
            and s.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'squad_gameweek_history'
      and policyname = 'Users manage own squad history'
  ) then
    create policy "Users manage own squad history"
      on public.squad_gameweek_history
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.squads s
          where s.id = squad_gameweek_history.squad_id
            and s.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.squads s
          where s.id = squad_gameweek_history.squad_id
            and s.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'squad_gameweek_picks'
      and policyname = 'Users manage own squad picks'
  ) then
    create policy "Users manage own squad picks"
      on public.squad_gameweek_picks
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.squads s
          where s.id = squad_gameweek_picks.squad_id
            and s.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.squads s
          where s.id = squad_gameweek_picks.squad_id
            and s.user_id = auth.uid()
        )
      );
  end if;
end
$$;

grant select on public.teams to anon, authenticated;
grant select on public.gameweeks to anon, authenticated;
grant select on public.element_types to anon, authenticated;
grant select on public.fixtures to anon, authenticated;
grant select on public.player_catalog to anon, authenticated;
grant select on public.player_fixture_stats to anon, authenticated;
grant select, insert, update, delete on public.squads to authenticated;
grant select, insert, update, delete on public.squad_players to authenticated;
grant select, insert, update, delete on public.squad_gameweek_history to authenticated;
grant select, insert, update, delete on public.squad_gameweek_picks to authenticated;

-- Materialized season rankings for analytics and fast leaderboard reads.
create materialized view if not exists public.mv_player_season_rankings as
with aggregated as (
  select
    pfs.player_catalog_id,
    pc.fpl_id,
    pc.web_name,
    pc.full_name,
    t.short_name as team_short_name,
    et.app_code as position_code,
    count(*) filter (where coalesce(pfs.minutes, 0) > 0) as appearances,
    sum(coalesce(pfs.total_points, 0)) as total_points,
    sum(coalesce(pfs.minutes, 0)) as minutes,
    sum(coalesce(pfs.goals_scored, 0)) as goals_scored,
    sum(coalesce(pfs.assists, 0)) as assists,
    sum(coalesce(pfs.clean_sheets, 0)) as clean_sheets,
    sum(coalesce(pfs.bonus, 0)) as bonus,
    avg(pfs.expected_goals) as avg_expected_goals,
    avg(pfs.expected_assists) as avg_expected_assists,
    max(pfs.gameweek) as latest_gameweek
  from public.player_fixture_stats pfs
  join public.player_catalog pc
    on pc.id = pfs.player_catalog_id
  left join public.teams t
    on t.id = pc.team_id
  left join public.element_types et
    on et.id = pc.element_type_id
  group by
    pfs.player_catalog_id,
    pc.fpl_id,
    pc.web_name,
    pc.full_name,
    t.short_name,
    et.app_code
)
select
  aggregated.*,
  rank() over (
    order by aggregated.total_points desc, aggregated.minutes desc, aggregated.fpl_id asc
  ) as points_rank
from aggregated;

create unique index if not exists mv_player_season_rankings_player_catalog_id_idx
  on public.mv_player_season_rankings (player_catalog_id);

create index if not exists mv_player_season_rankings_points_idx
  on public.mv_player_season_rankings (points_rank, total_points desc);

grant select on public.mv_player_season_rankings to anon, authenticated;

create or replace function public.refresh_player_season_rankings()
returns void
language plpgsql
security definer
as $$
begin
  refresh materialized view public.mv_player_season_rankings;
end;
$$;
