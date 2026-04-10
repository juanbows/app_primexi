alter table public.players
  add column if not exists fpl_id integer;

create table if not exists public.player_gameweek_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete cascade,
  fpl_id integer not null,
  gameweek integer not null,
  total_points integer,
  minutes integer,
  goals_scored integer,
  assists integer,
  clean_sheets integer,
  created_at timestamp default now(),
  unique (fpl_id, gameweek)
);

create index if not exists idx_pgs_player on public.player_gameweek_stats(player_id);
create index if not exists idx_pgs_gw on public.player_gameweek_stats(gameweek);

alter table public.player_gameweek_stats enable row level security;

grant select on public.player_gameweek_stats to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'player_gameweek_stats'
      and policyname = 'Public read player gameweek stats'
  ) then
    create policy "Public read player gameweek stats"
      on public.player_gameweek_stats
      for select
      to anon, authenticated
      using (true);
  end if;
end
$$;
