#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import re
import sys
from dataclasses import dataclass
from html import unescape
from pathlib import Path
from urllib.request import Request, urlopen


DEFAULT_SEASON_URL = "https://es.whoscored.com/Regions/252/Tournaments/2/Seasons/10743/inglaterra-premier-league"
MIRROR_PREFIX = "https://r.jina.ai/http://"


@dataclass(frozen=True)
class MatchLink:
    match_id: int
    url: str
    match_label: str


def _fetch_text(url: str, timeout_s: int) -> str:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "text/plain"})
    with urlopen(request, timeout=timeout_s) as response:
        return response.read().decode("utf-8", errors="replace")


def _mirror_url(source_url: str) -> str:
    return f"{MIRROR_PREFIX}{source_url}"


def _humanize_team_slug(value: str) -> str:
    special = {
        "afc": "AFC",
        "fc": "FC",
        "united": "United",
        "city": "City",
        "hotspur": "Hotspur",
    }
    words = []
    for part in value.split("-"):
        words.append(special.get(part, part.capitalize()))
    return " ".join(words)


def _label_from_slug(slug: str) -> str:
    prefix = "inglaterra-premier-league-2025-2026-"
    if slug.startswith(prefix):
        teams_slug = slug[len(prefix) :]
    else:
        teams_slug = re.sub(r"^(?:inglaterra|england)-premier-league-\d{4}-\d{4}-", "", slug)

    team_names = [
        "afc-bournemouth",
        "arsenal",
        "aston-villa",
        "bournemouth",
        "brentford",
        "brighton",
        "burnley",
        "chelsea",
        "crystal-palace",
        "everton",
        "fulham",
        "leeds",
        "liverpool",
        "manchester-city",
        "manchester-united",
        "newcastle",
        "nottingham-forest",
        "sunderland",
        "tottenham",
        "west-ham",
        "wolves",
    ]
    for home in sorted(team_names, key=len, reverse=True):
        marker = f"{home}-"
        if teams_slug.startswith(marker):
            away = teams_slug[len(marker) :]
            return f"{_humanize_team_slug(home)} vs {_humanize_team_slug(away)}"
    return _humanize_team_slug(teams_slug)


def extract_match_links(markdown: str) -> list[MatchLink]:
    pattern = re.compile(
        r"https://es\.whoscored\.com/matches/(?P<match_id>\d+)/"
        r"(?:live|show|preview|matchreport|livestatistics|betting)/(?P<slug>[^)\s#]+)"
    )
    by_match_id: dict[int, MatchLink] = {}
    for match in pattern.finditer(unescape(markdown)):
        match_id = int(match.group("match_id"))
        slug = match.group("slug")
        url = f"https://es.whoscored.com/matches/{match_id}/live/{slug}"
        label = _label_from_slug(slug)
        current = by_match_id.get(match_id)
        if current is None or "/inglaterra-" in url:
            by_match_id[match_id] = MatchLink(match_id=match_id, url=url, match_label=label)
    return [by_match_id[key] for key in sorted(by_match_id)]


def _title_from_markdown(markdown: str) -> str | None:
    for line in markdown.splitlines():
        if line.startswith("Title: "):
            return line.removeprefix("Title: ").strip()
        if line.startswith("# "):
            return line.removeprefix("# ").strip()
    return None


def _label_from_title(title: str) -> str:
    match = re.search(r"En Directo (?P<label>.+?) - Premier League 2025/2026", title)
    if not match:
        return title
    label = match.group("label")
    return re.sub(r"\s+\d+\s*-\s*\d+\s+", " vs ", label).strip()


def discover_by_match_id_scan(
    *,
    seed_match_id: int,
    scan_count: int,
    timeout_s: int,
    competition_title: str,
) -> list[MatchLink]:
    rows: list[MatchLink] = []
    for match_id in range(seed_match_id, seed_match_id + scan_count):
        source_url = f"https://es.whoscored.com/matches/{match_id}/live"
        try:
            markdown = _fetch_text(_mirror_url(source_url), timeout_s=timeout_s)
        except Exception as exc:
            print(f"SKIP matchId={match_id} error={exc}", file=sys.stderr)
            continue

        title = _title_from_markdown(markdown)
        if not title or competition_title not in title:
            continue
        rows.append(MatchLink(match_id=match_id, url=source_url, match_label=_label_from_title(title)))
    return rows


def write_csv(path: Path, rows: list[MatchLink], *, competition: str, season: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["fixture_no", "competition", "season", "match_id", "match_label", "url"],
        )
        writer.writeheader()
        for fixture_no, row in enumerate(rows, start=1):
            writer.writerow(
                {
                    "fixture_no": fixture_no,
                    "competition": competition,
                    "season": season,
                    "match_id": row.match_id,
                    "match_label": row.match_label,
                    "url": row.url,
                }
            )


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Descubre URLs de partidos desde una pagina de temporada de WhoScored.")
    parser.add_argument("--season-url", default=DEFAULT_SEASON_URL, help="URL de temporada/torneo en WhoScored.")
    parser.add_argument("--out", default="scrapers/whoscored/matches_pl_2025_2026.csv", help="CSV de salida.")
    parser.add_argument("--competition", default="Premier League", help="Nombre de competicion para el CSV.")
    parser.add_argument("--season", default="2025-2026", help="Temporada para el CSV.")
    parser.add_argument("--timeout", type=int, default=60, help="Timeout de descarga.")
    parser.add_argument("--limit", type=int, default=0, help="Limitar cantidad de partidos escritos.")
    parser.add_argument("--seed-match-id", type=int, default=0, help="Match ID inicial para escanear URLs /matches/{id}/live.")
    parser.add_argument("--scan-count", type=int, default=0, help="Cantidad de IDs consecutivos a escanear desde --seed-match-id.")
    args = parser.parse_args(argv)

    if args.seed_match_id and args.scan_count:
        rows = discover_by_match_id_scan(
            seed_match_id=args.seed_match_id,
            scan_count=args.scan_count,
            timeout_s=args.timeout,
            competition_title=f"{args.competition} {args.season.replace('-', '/')}",
        )
    else:
        markdown = _fetch_text(_mirror_url(args.season_url), timeout_s=args.timeout)
        rows = extract_match_links(markdown)
    if args.limit > 0:
        rows = rows[: args.limit]
    if not rows:
        raise RuntimeError("No se encontraron links de partidos en la pagina de temporada.")

    write_csv(Path(args.out), rows, competition=args.competition, season=args.season)
    print(f"OK matches={len(rows)} out={args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
