alter table public.players
  add column if not exists fpl_id integer,
  add column if not exists full_name text,
  add column if not exists fpl_team_id integer,
  add column if not exists fpl_position_id integer,
  add column if not exists minutes integer not null default 0,
  add column if not exists form numeric(6,1) not null default 0,
  add column if not exists status text not null default 'a',
  add column if not exists selected_by_percent numeric(6,1) not null default 0,
  add column if not exists chance_of_playing_next_round integer,
  add column if not exists news text not null default '',
  add column if not exists photo text,
  add column if not exists updated_at timestamp with time zone not null default now();

update public.players
set full_name = coalesce(nullif(btrim(full_name), ''), nullif(btrim(name), ''), 'Unknown player')
where full_name is null
  or btrim(full_name) = '';

create unique index if not exists players_fpl_id_gameweek_key
  on public.players (fpl_id, gameweek);

create index if not exists players_gameweek_total_points_idx
  on public.players (gameweek, total_points desc);

create unique index if not exists players_revelation_per_gameweek_key
  on public.players (gameweek)
  where is_revelation = true;

delete from public.players
where fpl_id is null;

alter table public.players
  alter column fpl_id set not null,
  alter column full_name set not null;
