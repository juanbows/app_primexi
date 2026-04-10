-- Base tables required by the FPL/Supabase migrations.
-- This makes the migration chain safe to run on a fresh Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  position text not null default '',
  team text not null default '',
  price numeric(10,1) not null default 0,
  total_points integer not null default 0,
  gameweek integer not null default 1,
  is_revelation boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.players
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists name text,
  add column if not exists position text,
  add column if not exists team text,
  add column if not exists price numeric(10,1),
  add column if not exists total_points integer,
  add column if not exists gameweek integer,
  add column if not exists is_revelation boolean,
  add column if not exists created_at timestamptz;

update public.players
set
  id = coalesce(id, gen_random_uuid()),
  name = coalesce(name, ''),
  position = coalesce(position, ''),
  team = coalesce(team, ''),
  price = coalesce(price, 0),
  total_points = coalesce(total_points, 0),
  gameweek = coalesce(gameweek, 1),
  is_revelation = coalesce(is_revelation, false),
  created_at = coalesce(created_at, timezone('utc', now()));

alter table public.players
  alter column id set default gen_random_uuid(),
  alter column name set default '',
  alter column position set default '',
  alter column team set default '',
  alter column price set default 0,
  alter column total_points set default 0,
  alter column gameweek set default 1,
  alter column is_revelation set default false,
  alter column created_at set default timezone('utc', now()),
  alter column id set not null,
  alter column name set not null,
  alter column position set not null,
  alter column team set not null,
  alter column price set not null,
  alter column total_points set not null,
  alter column gameweek set not null,
  alter column is_revelation set not null,
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_pkey'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_pkey primary key (id);
  end if;
end
$$;

create table if not exists public.users (
  id uuid not null,
  email text,
  team_name text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint users_pkey primary key (id),
  constraint users_id_auth_users_fkey foreign key (id) references auth.users(id) on delete cascade
);

alter table public.users
  add column if not exists id uuid,
  add column if not exists email text,
  add column if not exists team_name text,
  add column if not exists created_at timestamptz;

update public.users
set
  id = coalesce(id, gen_random_uuid()),
  created_at = coalesce(created_at, timezone('utc', now()));

alter table public.users
  alter column created_at set default timezone('utc', now()),
  alter column id set not null,
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_pkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_pkey primary key (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_id_auth_users_fkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_id_auth_users_fkey
      foreign key (id) references auth.users(id) on delete cascade not valid;
  end if;
end
$$;

create index if not exists players_gameweek_idx
  on public.players (gameweek);

create index if not exists players_total_points_idx
  on public.players (total_points desc);

create index if not exists users_team_name_idx
  on public.users (team_name)
  where team_name is not null;
