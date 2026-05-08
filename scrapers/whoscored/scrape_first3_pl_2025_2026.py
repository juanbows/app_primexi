#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import random
import sys
import time
from pathlib import Path
from typing import Any

from scrape_match import _write_events_csv, _write_json, scrape_match


DEFAULT_MATCHES_CSV = Path(__file__).with_name("matches_first3_pl_2025_2026.csv")
DEFAULT_OUT_DIR = Path("data/whoscored/premier-league/2025-2026/test_first3")


def _required_text(row: dict[str, str], key: str) -> str:
    value = (row.get(key) or "").strip()
    if not value:
        raise ValueError(f"Falta '{key}' en fila: {row}")
    return value


def _read_matches(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise RuntimeError(f"No hay partidos en {path}")
    return rows


def _append_jsonl(path: Path, payload: dict[str, Any]) -> None:
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
        f.write("\n")


def _sleep_between(min_delay_s: float, max_delay_s: float) -> None:
    if max_delay_s <= 0:
        return
    delay = random.uniform(min_delay_s, max_delay_s)
    time.sleep(delay)


def run(args: argparse.Namespace) -> int:
    matches_csv = Path(args.matches_csv)
    out_dir = Path(args.out_dir)
    raw_dir = out_dir / "raw"
    events_dir = out_dir / "events_csv"
    split_dir = out_dir / "split"
    manifest_path = out_dir / "manifest.jsonl"
    all_events_path = out_dir / "all_events.jsonl"

    raw_dir.mkdir(parents=True, exist_ok=True)
    events_dir.mkdir(parents=True, exist_ok=True)
    split_dir.mkdir(parents=True, exist_ok=True)

    rows = _read_matches(matches_csv)[: args.limit]
    if len(rows) < args.limit:
        raise RuntimeError(f"El CSV solo tiene {len(rows)} partidos; se pidieron {args.limit}.")

    failures = 0
    for row in rows:
        fixture_no = _required_text(row, "fixture_no")
        match_label = _required_text(row, "match_label")
        url = _required_text(row, "url")

        print(f"[{fixture_no}] Scraping {match_label}", file=sys.stderr)
        try:
            result = scrape_match(
                url,
                engine=args.engine,
                timeout_s=args.timeout,
                retries=args.retries,
            )
            match_id = result.match_id
            raw_path = raw_dir / f"{match_id}.json.gz"
            events_csv_path = events_dir / f"{match_id}.events.csv"
            split_base = split_dir / str(match_id)

            if raw_path.exists() and not args.force:
                print(f"[{fixture_no}] Ya existe {raw_path}; usa --force para sobreescribir.", file=sys.stderr)
                continue

            _write_json(str(raw_path), result.to_dict(), pretty=args.pretty)
            _write_json(f"{split_base}.matchCentreData.json.gz", result.match_centre_data, pretty=args.pretty)
            _write_json(
                f"{split_base}.matchCentreEventTypeJson.json.gz",
                result.match_centre_event_type_json,
                pretty=args.pretty,
            )
            _write_json(
                f"{split_base}.formationIdNameMappings.json.gz",
                result.formation_id_name_mappings,
                pretty=args.pretty,
            )

            events = result.match_centre_data.get("events", [])
            if not isinstance(events, list):
                raise RuntimeError("matchCentreData.events no es una lista.")

            _write_events_csv(
                str(events_csv_path),
                match_id=match_id,
                fetched_at_utc=result.fetched_at_utc,
                events=events,  # type: ignore[arg-type]
            )

            for event in events:
                _append_jsonl(
                    all_events_path,
                    {
                        "matchId": match_id,
                        "fetchedAtUtc": result.fetched_at_utc,
                        "fixtureNo": fixture_no,
                        "competition": row.get("competition", ""),
                        "season": row.get("season", ""),
                        "matchLabel": match_label,
                        "sourceUrl": url,
                        "event": event,
                    },
                )

            _append_jsonl(
                manifest_path,
                {
                    "status": "done",
                    "fixtureNo": fixture_no,
                    "matchLabel": match_label,
                    "matchId": match_id,
                    "events": len(events),
                    "rawPath": str(raw_path),
                    "eventsCsvPath": str(events_csv_path),
                    "fetchedAtUtc": result.fetched_at_utc,
                    "sourceUrl": url,
                },
            )
            print(f"[{fixture_no}] OK matchId={match_id} events={len(events)}", file=sys.stderr)
        except Exception as exc:
            failures += 1
            _append_jsonl(
                manifest_path,
                {
                    "status": "failed",
                    "fixtureNo": fixture_no,
                    "matchLabel": match_label,
                    "sourceUrl": url,
                    "error": str(exc),
                },
            )
            print(f"[{fixture_no}] FAILED {match_label}: {exc}", file=sys.stderr)
            if failures >= args.max_failures:
                return 1
        _sleep_between(args.min_delay, args.max_delay)

    return 1 if failures else 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Prueba de scraping para los 3 primeros partidos de Premier League 2025-2026."
    )
    parser.add_argument("--matches-csv", default=str(DEFAULT_MATCHES_CSV), help="CSV con columnas fixture_no,match_label,url.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Directorio de salida.")
    parser.add_argument("--limit", type=int, default=3, help="Cantidad de partidos a procesar.")
    parser.add_argument("--engine", default="auto", choices=["auto", "requests", "tls"], help="Motor de descarga.")
    parser.add_argument("--timeout", type=int, default=60, help="Timeout por request.")
    parser.add_argument("--retries", type=int, default=3, help="Reintentos por partido.")
    parser.add_argument("--min-delay", type=float, default=8.0, help="Pausa minima entre partidos.")
    parser.add_argument("--max-delay", type=float, default=18.0, help="Pausa maxima entre partidos.")
    parser.add_argument("--max-failures", type=int, default=1, help="Cortar al alcanzar esta cantidad de fallos.")
    parser.add_argument("--pretty", action="store_true", help="Guardar JSON indentado.")
    parser.add_argument("--force", action="store_true", help="Sobreescribir partidos ya descargados.")
    return run(parser.parse_args(argv))


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
