-- User-owned profile history tables.
-- Keeps PRIMEXI profile data separate from FPL global sync tables.

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  team_name text not null default 'Mi equipo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_gameweeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gameweek integer not null check (gameweek between 1 and 38),
  points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, gameweek)
);

create table if not exists public.user_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gameweek integer not null check (gameweek between 1 and 38),
  player_in text not null,
  player_out text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_rankings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gameweek integer not null check (gameweek between 1 and 38),
  mode text not null check (mode in ('global', 'league')),
  rank integer not null check (rank > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, gameweek, mode)
);

create table if not exists public.user_captains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gameweek integer not null check (gameweek between 1 and 38),
  captain text not null,
  vice_captain text not null,
  captain_points integer not null default 0,
  best_option_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, gameweek)
);

alter table public.users enable row level security;
alter table public.user_gameweeks enable row level security;
alter table public.user_transfers enable row level security;
alter table public.user_rankings enable row level security;
alter table public.user_captains enable row level security;

create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can read own gameweeks"
  on public.user_gameweeks for select
  using (auth.uid() = user_id);

create policy "Users can upsert own gameweeks"
  on public.user_gameweeks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own gameweeks"
  on public.user_gameweeks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read own transfers"
  on public.user_transfers for select
  using (auth.uid() = user_id);

create policy "Users can insert own transfers"
  on public.user_transfers for insert
  with check (auth.uid() = user_id);

create policy "Users can read own rankings"
  on public.user_rankings for select
  using (auth.uid() = user_id);

create policy "Users can insert own rankings"
  on public.user_rankings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own rankings"
  on public.user_rankings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read own captains"
  on public.user_captains for select
  using (auth.uid() = user_id);

create policy "Users can insert own captains"
  on public.user_captains for insert
  with check (auth.uid() = user_id);

create policy "Users can update own captains"
  on public.user_captains for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
