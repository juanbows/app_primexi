# Supabase Database

Estas migraciones dejan lista la base de datos para la integracion FPL de PRIMEXI.

## Orden de aplicacion

Ejecuta los SQL en orden alfabetico desde `database/migrations`:

1. `20260408_000_create_base_schema.sql`
2. `20260408_001_upgrade_players_for_fpl_sync.sql`
3. `20260408_002_enable_players_rls.sql`
4. `20260408_003_create_player_gameweek_stats.sql`
5. `20260409_004_normalize_fpl_schema.sql`

El archivo `000` existe para que el resto de migraciones no falle en un proyecto Supabase nuevo: crea las tablas base `players` y `users` que las demas migraciones extienden.

## Variables necesarias

Frontend:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Edge Functions:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

No pongas `SUPABASE_SERVICE_ROLE_KEY` en el frontend.

## Sync inicial recomendado

Despues de aplicar las migraciones, ejecuta las funciones en este orden:

1. `sync-fpl-players`: carga equipos, gameweeks, posiciones, fixtures y snapshots de jugadores.
2. `sync-fpl-player-history`: carga el historial por fixture para los jugadores seleccionados y refresca `player_gameweek_stats`.

La home lee desde `player_gameweek_stats`, asi que si solo corres `sync-fpl-players` la base tendra jugadores en `players`/`player_catalog`, pero el Top 5 de jornada puede seguir vacio hasta correr el sync de historial.
