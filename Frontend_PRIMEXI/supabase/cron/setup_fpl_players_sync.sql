-- Supabase-native automation for PRIMEXI.
-- Run this in the Supabase SQL Editor for the production project.
--
-- What this does:
-- 1. Stores the project URL and anon key in Vault.
-- 2. Schedules an hourly cron job that invokes `sync-fpl-players`.
--
-- Why only `sync-fpl-players`:
-- - It refreshes the `players` snapshot for the current FPL gameweek.
-- - The home now reads Top 5 / Revelation / Radar from `public.players`.
-- - This is enough to keep the app current without depending on partial history syncs.
--
-- Before running:
-- - Replace the placeholder values below.
-- - If you already stored these secrets, skip the create_secret lines.

-- Store secrets once in Supabase Vault.
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'primexi_project_url');
select vault.create_secret('YOUR_SUPABASE_ANON_KEY', 'primexi_anon_key');

-- Recreate the job safely if it already exists.
do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'primexi-sync-fpl-players-hourly'
  ) then
    perform cron.unschedule('primexi-sync-fpl-players-hourly');
  end if;
end
$$;

-- Run once per hour, a few minutes after the hour.
select
  cron.schedule(
    'primexi-sync-fpl-players-hourly',
    '17 * * * *',
    $$
    select
      net.http_post(
        url:=(
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'primexi_project_url'
        ) || '/functions/v1/sync-fpl-players',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'primexi_anon_key'
          ),
          'apikey', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'primexi_anon_key'
          )
        ),
        body:='{}'::jsonb,
        timeout_milliseconds:=15000
      ) as request_id;
    $$
  );

-- Helpful checks after setup:
-- select jobid, jobname, schedule, active from cron.job order by jobid desc;
-- select * from cron.job_run_details order by start_time desc limit 20;
