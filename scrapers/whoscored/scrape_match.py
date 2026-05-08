#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import gzip
import json
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Literal

from bs4 import BeautifulSoup

try:
    import requests  # type: ignore
except Exception:  # pragma: no cover
    requests = None

try:
    import tls_client  # type: ignore
except Exception:  # pragma: no cover
    tls_client = None


FetchEngine = Literal["auto", "requests", "tls"]


@dataclass(frozen=True)
class ScrapeResult:
    url: str
    fetched_at_utc: str
    match_id: int
    match_centre_data: dict[str, Any]
    match_centre_event_type_json: dict[str, Any]
    formation_id_name_mappings: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "url": self.url,
            "fetchedAtUtc": self.fetched_at_utc,
            "matchId": self.match_id,
            "matchCentreData": self.match_centre_data,
            "matchCentreEventTypeJson": self.match_centre_event_type_json,
            "formationIdNameMappings": self.formation_id_name_mappings,
        }


def _default_headers() -> dict[str, str]:
    # Nota: en WhoScored suele haber bloqueo por Cloudflare/anti-bot.
    # Estos headers ayudan a parecer un navegador real.
    return {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64; rv:120.0) "
            "Gecko/20100101 Firefox/120.0"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }


def fetch_html(url: str, *, engine: FetchEngine, timeout_s: int, retries: int) -> str:
    last_error: Exception | None = None
    headers = _default_headers()

    def _sleep(attempt: int) -> None:
        time.sleep(min(2**attempt, 8))

    if engine in ("auto", "requests"):
        if requests is None:
            if engine == "requests":
                raise RuntimeError(
                    "No se pudo importar 'requests'. Instala dependencias o usa --engine tls."
                )
        else:
            session = requests.Session()
            for attempt in range(retries + 1):
                try:
                    resp = session.get(url, headers=headers, timeout=timeout_s)
                    if resp.status_code == 200:
                        return resp.text
                    if engine == "auto" and resp.status_code in (403, 429) and tls_client:
                        break
                    raise RuntimeError(
                        f"HTTP {resp.status_code} al descargar HTML (engine=requests)."
                    )
                except Exception as e:  # pragma: no cover
                    last_error = e
                    if attempt == retries:
                        break
                    _sleep(attempt)

            if engine == "requests":
                raise RuntimeError(
                    "No se pudo descargar el HTML usando requests."
                ) from last_error

    if engine in ("auto", "tls"):
        if tls_client is None:
            raise RuntimeError(
                "No se pudo importar 'tls_client'. Instala dependencias o usa --engine requests."
            )

        # En pruebas, Firefox/Safari suelen funcionar mejor que algunos perfiles de Chrome.
        identifiers = ["firefox_120", "safari_16_0"]
        for ident in identifiers:
            session = tls_client.Session(client_identifier=ident)  # type: ignore[attr-defined]
            for attempt in range(retries + 1):
                try:
                    resp = session.get(url, headers=headers, timeout_seconds=timeout_s)
                    if resp.status_code == 200:
                        return resp.text
                    raise RuntimeError(
                        f"HTTP {resp.status_code} al descargar HTML (engine=tls, ident={ident})."
                    )
                except Exception as e:  # pragma: no cover
                    last_error = e
                    if attempt == retries:
                        break
                    _sleep(attempt)

        raise RuntimeError("No se pudo descargar el HTML usando tls-client.") from last_error

    raise ValueError(f"Engine inválido: {engine}")


def _extract_balanced(text: str, start: int) -> str:
    opener = text[start]
    if opener not in "{[":
        raise ValueError("El caracter inicial debe ser '{' o '['.")
    closer = "}" if opener == "{" else "]"

    depth = 0
    in_str = False
    esc = False

    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue

        if ch == '"':
            in_str = True
            continue

        if ch == opener:
            depth += 1
        elif ch == closer:
            depth -= 1
            if depth == 0:
                return text[start : i + 1]

    raise ValueError("No se encontró el cierre correspondiente (JSON incompleto).")


def _extract_json_after_key(script_text: str, key: str) -> dict[str, Any]:
    idx = script_text.find(key)
    if idx == -1:
        raise KeyError(key)

    colon = script_text.find(":", idx)
    if colon == -1:
        raise ValueError(f"No se encontró ':' después de {key}.")

    j = colon + 1
    while j < len(script_text) and script_text[j].isspace():
        j += 1

    if j >= len(script_text) or script_text[j] not in "{[":
        raise ValueError(f"Valor inesperado después de {key}: {script_text[j:j+20]!r}")

    raw = _extract_balanced(script_text, j)
    return json.loads(raw)


def _find_args_script(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for script in soup.find_all("script"):
        text = script.get_text() or ""
        if 'require.config.params["args"]' in text:
            return text
    raise RuntimeError('No se encontró el bloque require.config.params["args"] en el HTML.')


def scrape_match(url: str, *, engine: FetchEngine, timeout_s: int, retries: int) -> ScrapeResult:
    html = fetch_html(url, engine=engine, timeout_s=timeout_s, retries=retries)
    args_script = _find_args_script(html)

    match_id_m = re.search(r"\bmatchId\s*:\s*(\d+)\b", args_script)
    if not match_id_m:
        raise RuntimeError("No se pudo extraer matchId del bloque args.")
    match_id = int(match_id_m.group(1))

    match_centre_data = _extract_json_after_key(args_script, "matchCentreData")
    match_centre_event_type_json = _extract_json_after_key(args_script, "matchCentreEventTypeJson")
    formation_id_name_mappings = _extract_json_after_key(args_script, "formationIdNameMappings")

    fetched_at_utc = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return ScrapeResult(
        url=url,
        fetched_at_utc=fetched_at_utc,
        match_id=match_id,
        match_centre_data=match_centre_data,
        match_centre_event_type_json=match_centre_event_type_json,
        formation_id_name_mappings=formation_id_name_mappings,
    )


def _write_json(path: str, payload: Any, *, pretty: bool) -> None:
    kwargs = {"ensure_ascii": False}
    if pretty:
        kwargs |= {"indent": 2, "sort_keys": False}
    data = json.dumps(payload, **kwargs)
    if path.endswith(".gz"):
        with gzip.open(path, "wt", encoding="utf-8") as f:
            f.write(data)
            f.write("\n")
        return

    with open(path, "w", encoding="utf-8") as f:
        f.write(data)
        f.write("\n")


def _stringify_cell(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (str, int, float, bool)):
        return str(value)
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _write_events_csv(path: str, *, match_id: int, fetched_at_utc: str, events: list[dict[str, Any]]) -> None:
    fieldnames: list[str] = ["matchId", "fetchedAtUtc"]
    seen: set[str] = set(fieldnames)
    for ev in events:
        for k in ev.keys():
            if k not in seen:
                seen.add(k)
                fieldnames.append(k)

    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for ev in events:
            row: dict[str, str] = {"matchId": str(match_id), "fetchedAtUtc": fetched_at_utc}
            for k, v in ev.items():
                row[k] = _stringify_cell(v)
            writer.writerow(row)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Scraper de WhoScored (matchCentreData + mappings). "
            "Extrae el JSON embebido en require.config.params[\"args\"] usando BeautifulSoup."
        )
    )
    parser.add_argument("url", help="URL del partido (WhoScored match live).")
    parser.add_argument(
        "-o",
        "--out",
        default="whoscored_match.json.gz",
        help="Archivo de salida .json o .json.gz (default: whoscored_match.json.gz).",
    )
    parser.add_argument(
        "--engine",
        default="auto",
        choices=["auto", "requests", "tls"],
        help="Motor de descarga del HTML (default: auto).",
    )
    parser.add_argument("--timeout", type=int, default=60, help="Timeout en segundos (default: 60).")
    parser.add_argument("--retries", type=int, default=2, help="Reintentos (default: 2).")
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="JSON con indentación (más grande; default: compact).",
    )
    parser.add_argument(
        "--split",
        action="store_true",
        help="Además del archivo principal, escribe 3 archivos separados (data/eventTypes/formations).",
    )
    parser.add_argument(
        "--events-csv",
        default=None,
        help="Si se indica, exporta matchCentreData.events a CSV en esta ruta.",
    )

    args = parser.parse_args(argv)

    result = scrape_match(args.url, engine=args.engine, timeout_s=args.timeout, retries=args.retries)
    _write_json(args.out, result.to_dict(), pretty=args.pretty)

    if args.split:
        base = args.out
        if base.endswith(".json.gz"):
            base = base[: -len(".json.gz")]
        elif base.endswith(".json"):
            base = base[: -len(".json")]

        suffix = ".json.gz" if args.out.endswith(".gz") else ".json"
        _write_json(f"{base}.matchCentreData{suffix}", result.match_centre_data, pretty=args.pretty)
        _write_json(
            f"{base}.matchCentreEventTypeJson{suffix}",
            result.match_centre_event_type_json,
            pretty=args.pretty,
        )
        _write_json(
            f"{base}.formationIdNameMappings{suffix}",
            result.formation_id_name_mappings,
            pretty=args.pretty,
        )

    events = result.match_centre_data.get("events", [])
    if args.events_csv:
        if not isinstance(events, list):
            raise RuntimeError("matchCentreData.events no es una lista; no se puede exportar a CSV.")
        _write_events_csv(
            args.events_csv,
            match_id=result.match_id,
            fetched_at_utc=result.fetched_at_utc,
            events=events,  # type: ignore[arg-type]
        )
    print(
        f"OK matchId={result.match_id} events={len(events)} "
        f"out={args.out}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
