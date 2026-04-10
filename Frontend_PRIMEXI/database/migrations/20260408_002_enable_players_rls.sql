alter table public.players enable row level security;

grant select on public.players to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'players'
      and policyname = 'Public read players'
  ) then
    create policy "Public read players"
      on public.players
      for select
      to anon, authenticated
      using (true);
  end if;
end
$$;
