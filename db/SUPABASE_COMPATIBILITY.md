# Compatibilidad con Supabase

Este documento resume las verificaciones hechas para evitar que los datos de WhoScored queden con IDs incorrectos o como tablas aisladas.

## Resultado de verificacion

Se valido contra el Supabase configurado en `Frontend_PRIMEXI/.env.local` sin imprimir claves.

Resultado:

- `public.teams.id` existe y tiene formato UUID.
- `public.teams.fpl_id` existe y es numerico.
- `public.player_catalog.id` existe y tiene formato UUID.
- `public.player_catalog.team_id` existe, tiene formato UUID y relaciona con `public.teams.id`.
- La relacion usada por la app, `player_catalog_team_id_fkey`, responde correctamente.

## Decision de esquema

Las tablas de WhoScored deben separar IDs internos y externos:

- `team_id`: FK interna a `public.teams.id`.
- `player_catalog_id`: FK interna a `public.player_catalog.id`.
- `whoscored_team_id`: ID externo de WhoScored.
- `whoscored_player_id`: ID externo de WhoScored.

Esto evita que un evento diga "Manchester" o use un ID de WhoScored donde la app espera el UUID de `teams`.

## Migracion correcta

Para Supabase se debe usar:

```text
Frontend_PRIMEXI/supabase/migrations/20260506_whoscored_schema.sql
```

Esa migracion referencia las tablas canonicas existentes y no intenta recrearlas:

- `public.teams`
- `public.player_catalog`

## Validaciones obligatorias

Antes de considerar una carga lista:

```sql
SELECT * FROM whoscored.unresolved_team_mappings;
SELECT * FROM whoscored.unresolved_player_mappings;
```

Ambas consultas deben devolver cero filas.

Tambien debe correr:

```text
db/queries/whoscored_validation.sql
```

Los conteos de problemas deben ser `0`.

## Razon

WhoScored, FPL y Primexi no comparten el mismo sistema de IDs. El dato crudo trae IDs utiles para trazabilidad, pero la app necesita relacionarse con sus propias tablas canonicas. Por eso el proceso correcto es:

1. Guardar raw de WhoScored.
2. Resolver mappings externos a IDs internos.
3. Insertar hechos (`matches`, `match_events`) con FK internas.
4. Conservar IDs externos solo como auditoria y reprocesamiento.
