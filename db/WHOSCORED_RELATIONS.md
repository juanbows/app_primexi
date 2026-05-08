# Relaciones WhoScored con el modelo Primexi

Este documento define como cargar datos de WhoScored sin romper las relaciones existentes de Supabase.

## Regla principal

Los IDs internos de la app mandan.

- `public.teams.id` es la llave canonica de equipos dentro de Primexi.
- `public.player_catalog.id` es la llave canonica de jugadores dentro de Primexi.
- Los IDs de WhoScored se guardan como identificadores externos, nunca como reemplazo de las llaves internas.

Por eso, en tablas WhoScored:

- `team_id` siempre apunta a `public.teams.id`.
- `player_catalog_id` siempre apunta a `public.player_catalog.id`.
- `whoscored_team_id` guarda el ID externo del equipo en WhoScored.
- `whoscored_player_id` guarda el ID externo del jugador en WhoScored.

## Por que no usar nombres

No debemos unir eventos por nombres como `Manchester`, `Liverpool` o `Bournemouth`.

Razones:

- Los nombres cambian entre fuentes: `Manchester United`, `Man Utd`, `Manchester Utd`.
- WhoScored puede usar nombres distintos a FPL o Supabase.
- Dos jugadores pueden tener nombres parecidos.
- Un nombre no protege contra cambios de idioma, slug o abreviaturas.

La carga debe resolver nombres solo como ayuda para crear mappings. Despues de resolver, las relaciones deben ir por ID.

## Tablas puente

### `whoscored.team_mappings`

Une equipos de WhoScored con equipos canonicos:

- `whoscored_team_id`: ID externo de WhoScored.
- `team_id`: FK a `public.teams.id`.
- `fpl_id`: ID FPL auxiliar para resolver si `team_id` aun no esta disponible.
- `whoscored_team_name`: nombre observado en WhoScored.
- `confidence`, `mapping_source`, `notes`: auditoria del mapeo.

### `whoscored.player_mappings`

Une jugadores de WhoScored con jugadores canonicos:

- `whoscored_player_id`: ID externo de WhoScored.
- `player_catalog_id`: FK a `public.player_catalog.id`.
- `fpl_id`: ID FPL auxiliar.
- `whoscored_player_name`: nombre observado en WhoScored.
- `team_id`: equipo canonico del jugador al momento del mapeo.
- `whoscored_team_id`: equipo WhoScored observado.

## Tablas de hechos

### `whoscored.matches`

Guarda una fila por partido.

Campos correctos de equipos:

- `home_team_id`: FK interna a `public.teams.id`.
- `away_team_id`: FK interna a `public.teams.id`.
- `home_whoscored_team_id`: FK externa resuelta en `whoscored.team_mappings`.
- `away_whoscored_team_id`: FK externa resuelta en `whoscored.team_mappings`.

La app debe leer `home_team_id` y `away_team_id` cuando quiera relacionarse con el catalogo Primexi. Los campos `home_whoscored_team_id` y `away_whoscored_team_id` quedan para auditoria, reprocesamiento y validacion contra el raw.

### `whoscored.match_events`

Guarda una fila por evento.

Campos correctos de equipo/jugador:

- `team_id`: FK interna a `public.teams.id`.
- `whoscored_team_id`: FK externa a `whoscored.team_mappings`.
- `player_catalog_id`: FK interna a `public.player_catalog.id`.
- `whoscored_player_id`: FK externa a `whoscored.player_mappings`.
- `related_player_catalog_id`: FK interna para jugador relacionado.
- `related_whoscored_player_id`: FK externa para jugador relacionado.

Esto permite que el evento conserve la trazabilidad de WhoScored sin quedar aislado de los equipos y jugadores que ya usa la aplicacion.

## Flujo de carga recomendado

1. Guardar el raw `matchCentreData` comprimido por partido.
2. Extraer equipos y jugadores observados en el raw.
3. Insertar o actualizar `whoscored.team_mappings`.
4. Insertar o actualizar `whoscored.player_mappings`.
5. Resolver `team_id` y `player_catalog_id`.
6. Insertar `whoscored.matches` usando `home_team_id` y `away_team_id` canonicos.
7. Insertar `whoscored.match_events` usando `team_id` y `player_catalog_id` canonicos.
8. Revisar vistas de pendientes antes de considerar una carga lista.

## Validaciones antes de subir a Supabase

Estas consultas deben devolver cero filas para una carga completa:

```sql
SELECT * FROM whoscored.unresolved_team_mappings;
SELECT * FROM whoscored.unresolved_player_mappings;
```

Y estas consultas ayudan a detectar eventos aislados:

```sql
SELECT COUNT(*) AS events_without_team
FROM whoscored.match_events
WHERE whoscored_team_id IS NOT NULL
  AND team_id IS NULL;

SELECT COUNT(*) AS events_without_player_mapping
FROM whoscored.match_events
WHERE whoscored_player_id IS NOT NULL
  AND player_catalog_id IS NULL;
```

## Decision de diseno

Permitimos `team_id` y `player_catalog_id` nulos durante una carga parcial para no perder eventos cuando falta un mapping. Pero una carga lista para analitica o Monte Carlo no debe quedar con mappings sin resolver.

Esa separacion evita dos problemas:

- Bloquear la ingesta por un nombre que todavia no sabemos mapear.
- Subir datos aparentemente correctos pero desconectados del modelo real de Primexi.

## Prueba local con 3 partidos

Se probo la carga de los 3 primeros partidos de Premier League 2025-2026:

- `1903117`: Liverpool vs Bournemouth.
- `1903118`: Aston Villa vs Newcastle.
- `1903119`: Brighton vs Fulham.

Resultado local:

- `3` partidos cargados.
- `4331` eventos cargados.
- `6` mappings de equipos cargados y resueltos.
- `0` eventos sin equipo canonico.
- `4272` de `4284` eventos con jugador quedaron relacionados con `public.player_catalog.id` (`99.72%`).
- `1` jugador quedo pendiente: `Adama Traoré` en Fulham, porque el catalogo actual lo tiene asociado a otro equipo. No se fuerza ese match para evitar una FK semanticamente incorrecta.
