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
