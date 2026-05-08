# WhoScored scraper (matchCentreData)

Este scraper extrae el JSON que WhoScored embebe en el HTML (en el bloque `require.config.params["args"]`), en particular:

- `matchCentreData` (incluye `events`, lineups, stats, etc.)
- `matchCentreEventTypeJson` (mapeos de tipos de evento)
- `formationIdNameMappings` (mapeos de formaciones)

## Instalación

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r scrapers/whoscored/requirements.txt
```

## Uso

```bash
. .venv/bin/activate
python scrapers/whoscored/scrape_match.py \
  'https://es.whoscored.com/matches/1978406/live/europa-champions-league-2025-2026-paris-saint-germain-bayern-munich' \
  --out data/1978406.json.gz \
  --split \
  --events-csv data/1978406.events.csv
```

El archivo principal (`--out`) contiene todo junto. Con `--split` también se guardan archivos separados.

## Prueba Premier League 2025-2026

Para generar automaticamente las URLs de los 3 primeros partidos desde el `matchId` inicial de la temporada:

```bash
. .venv/bin/activate
python scrapers/whoscored/discover_matches.py \
  --seed-match-id 1903117 \
  --scan-count 3 \
  --limit 3 \
  --out scrapers/whoscored/matches_first3_pl_2025_2026.csv
```

Luego ejecuta el scrape de prueba:

```bash
. .venv/bin/activate
python scrapers/whoscored/scrape_first3_pl_2025_2026.py
```

La salida queda en `data/whoscored/premier-league/2025-2026/test_first3/`:

- `raw/`: JSON completo por partido.
- `split/`: `matchCentreData`, `matchCentreEventTypeJson` y `formationIdNameMappings` separados.
- `events_csv/`: eventos por partido en CSV.
- `all_events.jsonl`: todos los eventos combinados, una linea por evento.
- `manifest.jsonl`: estado de cada partido procesado.

Para una temporada completa, aumenta `--scan-count` y revisa el CSV generado antes de lanzar el scraper masivo.

## Carga a Postgres local

Para cargar los raw scrapeados en Postgres local y relacionarlos con las tablas canonicas `public.teams` y `public.player_catalog`:

```bash
. .venv/bin/activate
python scrapers/whoscored/load_to_postgres.py \
  --raw-dir data/whoscored/premier-league/2025-2026/test_first3/raw \
  --sync-catalog
```

`--sync-catalog` copia localmente un catalogo minimo desde Supabase (`teams` y `player_catalog`) antes de cargar WhoScored. El loader guarda IDs externos en `whoscored_*_id`, pero las relaciones internas usan `team_id` y `player_catalog_id`.

Despues de cargar, valida:

```bash
PGPASSWORD=primexi_dev_password psql -h localhost -U primexi -d primexi_local \
  -f db/queries/whoscored_validation.sql
```

Si quedan jugadores pendientes, no se fuerza el match automaticamente: es preferible revisar `whoscored.unresolved_player_mappings` antes de relacionar un jugador con el equipo equivocado.

## Modelo de datos

El esquema recomendado para persistir partidos, eventos y catalogos esta documentado en [`DATA_MODEL.md`](DATA_MODEL.md).
