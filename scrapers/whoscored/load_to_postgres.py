#!/usr/bin/env python3
from __future__ import annotations

import argparse
import gzip
import json
import os
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any

import psycopg
import requests
from psycopg.types.json import Jsonb


FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"
DEFAULT_DATABASE_URL = "postgresql://primexi:primexi_dev_password@localhost:5432/primexi_local"
DEFAULT_SUPABASE_ENV = Path("app_primexi/Frontend_PRIMEXI/.env.local")


TEAM_ALIASES = {
    "afc bournemouth": "bournemouth",
    "bournemouth": "bournemouth",
    "brighton": "brighton",
    "brighton hove albion": "brighton",
    "leeds": "leeds",
    "leeds united": "leeds",
    "man city": "manchester city",
    "man utd": "manchester united",
    "newcastle": "newcastle",
    "newcastle united": "newcastle",
    "nottingham forest": "nottingham forest",
    "spurs": "tottenham",
    "tottenham": "tottenham",
    "tottenham hotspur": "tottenham",
    "west ham": "west ham",
    "west ham united": "west ham",
    "wolves": "wolves",
    "wolverhampton wanderers": "wolves",
}


def _load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def _normalize_name(value: str | None) -> str:
    if not value:
        return ""
    value = value.replace("ı", "i").replace("İ", "I")
    normalized = unicodedata.normalize("NFKD", value)
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.lower()
    normalized = normalized.replace("&", " and ")
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized)
    normalized = re.sub(r"\b(fc|afc)\b", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return TEAM_ALIASES.get(normalized, normalized)


def _score_pair(value: str | None) -> tuple[int | None, int | None]:
    if not value:
        return None, None
    match = re.search(r"(?P<home>\d+)\s*:\s*(?P<away>\d+)", value)
    if not match:
        return None, None
    return int(match.group("home")), int(match.group("away"))


def _parse_date(value: str | None) -> str | None:
    if not value:
        return None
    return datetime.fromisoformat(value).date().isoformat()


def _parse_time(value: str | None) -> str | None:
    if not value:
        return None
    return datetime.fromisoformat(value).time().isoformat()


def _read_json_gz(path: Path) -> dict[str, Any]:
    with gzip.open(path, "rt", encoding="utf-8") as f:
        return json.load(f)


def _supabase_headers(env: dict[str, str]) -> dict[str, str]:
    key = (
        env.get("SUPABASE_SERVICE_ROLE_KEY")
        or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        or env.get("SUPABASE_ANON_KEY")
    )
    if not key:
        raise RuntimeError("No se encontro una key de Supabase en el env local.")
    return {"apikey": key, "Authorization": f"Bearer {key}"}


def _supabase_url(env: dict[str, str]) -> str:
    url = env.get("NEXT_PUBLIC_SUPABASE_URL") or env.get("SUPABASE_URL")
    if not url:
        raise RuntimeError("No se encontro URL de Supabase en el env local.")
    return url.rstrip("/")


def _fetch_supabase_table(env: dict[str, str], table: str, select: str) -> list[dict[str, Any]]:
    base_url = _supabase_url(env)
    headers = _supabase_headers(env)
    rows: list[dict[str, Any]] = []
    offset = 0
    page_size = 1000
    while True:
        resp = requests.get(
            f"{base_url}/rest/v1/{table}",
            headers=headers | {"Range": f"{offset}-{offset + page_size - 1}"},
            params={"select": select},
            timeout=60,
        )
        resp.raise_for_status()
        page = resp.json()
        if not page:
            break
        rows.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    return rows


def _official_teams_by_fpl_id() -> dict[int, dict[str, Any]]:
    resp = requests.get(FPL_BOOTSTRAP_URL, timeout=60)
    resp.raise_for_status()
    payload = resp.json()
    return {int(team["id"]): team for team in payload.get("teams", [])}


def sync_supabase_catalog(conn: psycopg.Connection[Any], env: dict[str, str]) -> None:
    teams = _fetch_supabase_table(env, "teams", "id,fpl_id,code,name,short_name")
    players = _fetch_supabase_table(env, "player_catalog", "id,fpl_id,team_id,web_name,full_name")
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO public.teams (id, fpl_id, code, name, short_name, updated_at)
            VALUES (%(id)s, %(fpl_id)s, %(code)s, %(name)s, %(short_name)s, now())
            ON CONFLICT (id) DO UPDATE SET
                fpl_id = EXCLUDED.fpl_id,
                code = EXCLUDED.code,
                name = EXCLUDED.name,
                short_name = EXCLUDED.short_name,
                updated_at = now()
            """,
            teams,
        )
        cur.executemany(
            """
            INSERT INTO public.player_catalog (id, fpl_id, team_id, web_name, full_name, updated_at)
            VALUES (%(id)s, %(fpl_id)s, %(team_id)s, %(web_name)s, %(full_name)s, now())
            ON CONFLICT (id) DO UPDATE SET
                fpl_id = EXCLUDED.fpl_id,
                team_id = EXCLUDED.team_id,
                web_name = EXCLUDED.web_name,
                full_name = EXCLUDED.full_name,
                updated_at = now()
            """,
            players,
        )
    conn.commit()


def _load_local_team_lookup(conn: psycopg.Connection[Any]) -> dict[str, dict[str, Any]]:
    official = _official_teams_by_fpl_id()
    with conn.cursor() as cur:
        rows = cur.execute("SELECT id, fpl_id, name, short_name FROM public.teams").fetchall()
    lookup: dict[str, dict[str, Any]] = {}
    for team_id, fpl_id, name, short_name in rows:
        official_team = official.get(int(fpl_id)) if fpl_id is not None else None
        names = [name, short_name]
        if official_team:
            names.extend([official_team.get("name"), official_team.get("short_name")])
        for candidate in names:
            normalized = _normalize_name(candidate)
            if normalized:
                lookup[normalized] = {"team_id": str(team_id), "fpl_id": fpl_id}
    return lookup


def _name_tokens(value: str) -> set[str]:
    return {token for token in value.split() if len(token) > 1}


def _load_player_lookup(
    conn: psycopg.Connection[Any],
) -> tuple[dict[tuple[str, str | None], dict[str, Any]], list[dict[str, Any]]]:
    with conn.cursor() as cur:
        rows = cur.execute(
            "SELECT id, fpl_id, team_id, web_name, full_name FROM public.player_catalog"
        ).fetchall()
    lookup: dict[tuple[str, str | None], dict[str, Any]] = {}
    candidates: list[dict[str, Any]] = []
    for player_id, fpl_id, team_id, web_name, full_name in rows:
        normalized_web_name = _normalize_name(web_name)
        normalized_full_name = _normalize_name(full_name)
        team_id_text = str(team_id) if team_id else None
        payload = {
            "player_catalog_id": str(player_id),
            "fpl_id": fpl_id,
            "team_id": team_id_text,
            "normalized_web_name": normalized_web_name,
            "normalized_full_name": normalized_full_name,
            "tokens": _name_tokens(f"{normalized_web_name} {normalized_full_name}"),
        }
        candidates.append(payload)
        for candidate in (web_name, full_name):
            normalized = _normalize_name(candidate)
            if normalized:
                lookup[(normalized, team_id_text)] = payload
                lookup.setdefault((normalized, None), payload)
    return lookup, candidates


def _match_player(
    normalized_name: str,
    team_id: str | None,
    exact_lookup: dict[tuple[str, str | None], dict[str, Any]],
    candidates: list[dict[str, Any]],
) -> dict[str, Any] | None:
    exact = exact_lookup.get((normalized_name, team_id)) or exact_lookup.get((normalized_name, None))
    if exact:
        return exact

    tokens = _name_tokens(normalized_name)
    if not tokens:
        return None

    same_team = [candidate for candidate in candidates if candidate.get("team_id") == team_id]
    token_matches = [
        candidate
        for candidate in same_team
        if tokens.issubset(candidate["tokens"])
        or candidate["tokens"].issubset(tokens)
        or normalized_name in candidate["normalized_full_name"]
        or candidate["normalized_full_name"] in normalized_name
    ]
    if len(token_matches) == 1:
        return token_matches[0]

    last_token = normalized_name.split()[-1]
    last_name_matches = [
        candidate
        for candidate in same_team
        if last_token in candidate["tokens"]
        and (
            candidate["normalized_web_name"] == last_token
            or candidate["normalized_full_name"].endswith(f" {last_token}")
            or candidate["normalized_full_name"].startswith(f"{last_token} ")
        )
    ]
    if len(last_name_matches) == 1:
        return last_name_matches[0]

    return None


def _extract_players(match_data: dict[str, Any], team_ids: dict[int, str | None]) -> dict[int, dict[str, Any]]:
    players: dict[int, dict[str, Any]] = {}
    for side in ("home", "away"):
        side_data = match_data.get(side) or {}
        whoscored_team_id = side_data.get("teamId")
        team_id = team_ids.get(int(whoscored_team_id)) if whoscored_team_id is not None else None
        for player in side_data.get("players") or []:
            player_id = player.get("playerId")
            if player_id is None:
                continue
            players[int(player_id)] = {
                "name": player.get("name") or match_data.get("playerIdNameDictionary", {}).get(str(player_id)),
                "team_id": team_id,
                "whoscored_team_id": int(whoscored_team_id) if whoscored_team_id is not None else None,
            }
    for raw_player_id, name in (match_data.get("playerIdNameDictionary") or {}).items():
        player_id = int(raw_player_id)
        players.setdefault(player_id, {"name": name, "team_id": None, "whoscored_team_id": None})
    return players


def _upsert_team_mappings(
    conn: psycopg.Connection[Any],
    match_data: dict[str, Any],
    team_lookup: dict[str, dict[str, Any]],
) -> dict[int, str | None]:
    rows = []
    resolved: dict[int, str | None] = {}
    for side in ("home", "away"):
        team = match_data.get(side) or {}
        whoscored_team_id = int(team["teamId"])
        name = team.get("name") or str(whoscored_team_id)
        normalized = _normalize_name(name)
        match = team_lookup.get(normalized)
        team_id = match["team_id"] if match else None
        resolved[whoscored_team_id] = team_id
        rows.append(
            {
                "whoscored_team_id": whoscored_team_id,
                "team_id": team_id,
                "fpl_id": match["fpl_id"] if match else None,
                "whoscored_team_name": name,
                "normalized_name": normalized,
                "confidence": 1.0 if match else None,
                "mapping_source": "fpl_name_match" if match else "unresolved",
            }
        )
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO whoscored.team_mappings (
                whoscored_team_id, team_id, fpl_id, whoscored_team_name,
                normalized_name, confidence, mapping_source, updated_at
            )
            VALUES (
                %(whoscored_team_id)s, %(team_id)s, %(fpl_id)s, %(whoscored_team_name)s,
                %(normalized_name)s, %(confidence)s, %(mapping_source)s, now()
            )
            ON CONFLICT (whoscored_team_id) DO UPDATE SET
                team_id = EXCLUDED.team_id,
                fpl_id = EXCLUDED.fpl_id,
                whoscored_team_name = EXCLUDED.whoscored_team_name,
                normalized_name = EXCLUDED.normalized_name,
                confidence = EXCLUDED.confidence,
                mapping_source = EXCLUDED.mapping_source,
                updated_at = now()
            """,
            rows,
        )
    return resolved


def _upsert_player_mappings(
    conn: psycopg.Connection[Any],
    players: dict[int, dict[str, Any]],
    player_lookup: dict[tuple[str, str | None], dict[str, Any]],
    player_candidates: list[dict[str, Any]],
) -> dict[int, str | None]:
    rows = []
    resolved: dict[int, str | None] = {}
    for whoscored_player_id, player in players.items():
        name = player.get("name") or str(whoscored_player_id)
        team_id = player.get("team_id")
        normalized = _normalize_name(name)
        match = _match_player(normalized, team_id, player_lookup, player_candidates)
        player_catalog_id = match["player_catalog_id"] if match else None
        resolved[whoscored_player_id] = player_catalog_id
        rows.append(
            {
                "whoscored_player_id": whoscored_player_id,
                "player_catalog_id": player_catalog_id,
                "fpl_id": match["fpl_id"] if match else None,
                "whoscored_player_name": name,
                "normalized_name": normalized,
                "team_id": team_id,
                "whoscored_team_id": player.get("whoscored_team_id"),
                "confidence": 1.0 if match else None,
                "mapping_source": "name_team_match" if match else "unresolved",
            }
        )
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO whoscored.player_mappings (
                whoscored_player_id, player_catalog_id, fpl_id, whoscored_player_name,
                normalized_name, team_id, whoscored_team_id, confidence, mapping_source, updated_at
            )
            VALUES (
                %(whoscored_player_id)s, %(player_catalog_id)s, %(fpl_id)s, %(whoscored_player_name)s,
                %(normalized_name)s, %(team_id)s, %(whoscored_team_id)s, %(confidence)s, %(mapping_source)s, now()
            )
            ON CONFLICT (whoscored_player_id) DO UPDATE SET
                player_catalog_id = EXCLUDED.player_catalog_id,
                fpl_id = EXCLUDED.fpl_id,
                whoscored_player_name = EXCLUDED.whoscored_player_name,
                normalized_name = EXCLUDED.normalized_name,
                team_id = EXCLUDED.team_id,
                whoscored_team_id = EXCLUDED.whoscored_team_id,
                confidence = EXCLUDED.confidence,
                mapping_source = EXCLUDED.mapping_source,
                updated_at = now()
            """,
            rows,
        )
    return resolved


def _insert_match(
    conn: psycopg.Connection[Any],
    payload: dict[str, Any],
    team_ids: dict[int, str | None],
    *,
    competition: str,
    season: str,
) -> None:
    data = payload["matchCentreData"]
    home = data["home"]
    away = data["away"]
    home_score, away_score = _score_pair(data.get("score"))
    ht_home_score, ht_away_score = _score_pair(data.get("htScore"))
    ft_home_score, ft_away_score = _score_pair(data.get("ftScore"))
    et_home_score, et_away_score = _score_pair(data.get("etScore"))
    pk_home_score, pk_away_score = _score_pair(data.get("pkScore"))
    referee = data.get("referee") or {}
    row = {
        "match_id": payload["matchId"],
        "source_url": payload["url"],
        "fetched_at_utc": payload["fetchedAtUtc"],
        "competition": competition,
        "season": season,
        "start_date": _parse_date(data.get("startDate")),
        "start_time": _parse_time(data.get("startTime")),
        "status_code": data.get("statusCode"),
        "venue_name": data.get("venueName"),
        "attendance": data.get("attendance"),
        "referee_name": referee.get("name") if isinstance(referee, dict) else None,
        "home_team_id": team_ids.get(int(home["teamId"])),
        "home_whoscored_team_id": int(home["teamId"]),
        "home_team_name": home.get("name"),
        "away_team_id": team_ids.get(int(away["teamId"])),
        "away_whoscored_team_id": int(away["teamId"]),
        "away_team_name": away.get("name"),
        "home_score": home_score,
        "away_score": away_score,
        "ht_home_score": ht_home_score,
        "ht_away_score": ht_away_score,
        "ft_home_score": ft_home_score,
        "ft_away_score": ft_away_score,
        "et_home_score": et_home_score,
        "et_away_score": et_away_score,
        "pk_home_score": pk_home_score,
        "pk_away_score": pk_away_score,
        "raw_match_json": Jsonb(data),
    }
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO whoscored.matches (
                match_id, source_url, fetched_at_utc, competition, season, start_date, start_time,
                status_code, venue_name, attendance, referee_name,
                home_team_id, home_whoscored_team_id, home_team_name,
                away_team_id, away_whoscored_team_id, away_team_name,
                home_score, away_score, ht_home_score, ht_away_score,
                ft_home_score, ft_away_score, et_home_score, et_away_score,
                pk_home_score, pk_away_score, raw_match_json, updated_at
            )
            VALUES (
                %(match_id)s, %(source_url)s, %(fetched_at_utc)s, %(competition)s, %(season)s,
                %(start_date)s, %(start_time)s, %(status_code)s, %(venue_name)s,
                %(attendance)s, %(referee_name)s, %(home_team_id)s, %(home_whoscored_team_id)s,
                %(home_team_name)s, %(away_team_id)s, %(away_whoscored_team_id)s,
                %(away_team_name)s, %(home_score)s, %(away_score)s, %(ht_home_score)s,
                %(ht_away_score)s, %(ft_home_score)s, %(ft_away_score)s, %(et_home_score)s,
                %(et_away_score)s, %(pk_home_score)s, %(pk_away_score)s, %(raw_match_json)s, now()
            )
            ON CONFLICT (match_id) DO UPDATE SET
                source_url = EXCLUDED.source_url,
                fetched_at_utc = EXCLUDED.fetched_at_utc,
                competition = EXCLUDED.competition,
                season = EXCLUDED.season,
                start_date = EXCLUDED.start_date,
                start_time = EXCLUDED.start_time,
                status_code = EXCLUDED.status_code,
                venue_name = EXCLUDED.venue_name,
                attendance = EXCLUDED.attendance,
                referee_name = EXCLUDED.referee_name,
                home_team_id = EXCLUDED.home_team_id,
                home_whoscored_team_id = EXCLUDED.home_whoscored_team_id,
                home_team_name = EXCLUDED.home_team_name,
                away_team_id = EXCLUDED.away_team_id,
                away_whoscored_team_id = EXCLUDED.away_whoscored_team_id,
                away_team_name = EXCLUDED.away_team_name,
                home_score = EXCLUDED.home_score,
                away_score = EXCLUDED.away_score,
                ht_home_score = EXCLUDED.ht_home_score,
                ht_away_score = EXCLUDED.ht_away_score,
                ft_home_score = EXCLUDED.ft_home_score,
                ft_away_score = EXCLUDED.ft_away_score,
                et_home_score = EXCLUDED.et_home_score,
                et_away_score = EXCLUDED.et_away_score,
                pk_home_score = EXCLUDED.pk_home_score,
                pk_away_score = EXCLUDED.pk_away_score,
                raw_match_json = EXCLUDED.raw_match_json,
                updated_at = now()
            """,
            row,
        )


def _optional_value(payload: dict[str, Any], key: str) -> Any:
    value = payload.get(key)
    if isinstance(value, dict):
        return value.get("value")
    return value


def _optional_display(payload: dict[str, Any], key: str) -> str | None:
    value = payload.get(key)
    if isinstance(value, dict):
        return value.get("displayName")
    return None


def _insert_events(
    conn: psycopg.Connection[Any],
    payload: dict[str, Any],
    team_ids: dict[int, str | None],
    player_ids: dict[int, str | None],
) -> None:
    events = payload["matchCentreData"].get("events") or []
    rows = []
    for event in events:
        whoscored_team_id = event.get("teamId")
        whoscored_player_id = event.get("playerId")
        related_whoscored_player_id = event.get("relatedPlayerId")
        card_type = event.get("cardType")
        rows.append(
            {
                "match_id": payload["matchId"],
                "whoscored_event_id": str(event["id"]),
                "event_seq": event.get("eventId"),
                "team_id": team_ids.get(int(whoscored_team_id)) if whoscored_team_id is not None else None,
                "whoscored_team_id": int(whoscored_team_id) if whoscored_team_id is not None else None,
                "player_catalog_id": player_ids.get(int(whoscored_player_id)) if whoscored_player_id is not None else None,
                "whoscored_player_id": int(whoscored_player_id) if whoscored_player_id is not None else None,
                "related_event_id": event.get("relatedEventId"),
                "related_player_catalog_id": player_ids.get(int(related_whoscored_player_id)) if related_whoscored_player_id is not None else None,
                "related_whoscored_player_id": int(related_whoscored_player_id) if related_whoscored_player_id is not None else None,
                "minute": event.get("minute"),
                "second": event.get("second"),
                "expanded_minute": event.get("expandedMinute"),
                "period_value": _optional_value(event, "period"),
                "period_display_name": _optional_display(event, "period"),
                "type_value": _optional_value(event, "type"),
                "type_display_name": _optional_display(event, "type"),
                "outcome_value": _optional_value(event, "outcomeType"),
                "outcome_display_name": _optional_display(event, "outcomeType"),
                "x": event.get("x"),
                "y": event.get("y"),
                "end_x": event.get("endX"),
                "end_y": event.get("endY"),
                "blocked_x": event.get("blockedX"),
                "blocked_y": event.get("blockedY"),
                "goal_mouth_z": event.get("goalMouthZ"),
                "goal_mouth_y": event.get("goalMouthY"),
                "is_touch": event.get("isTouch"),
                "is_shot": event.get("isShot"),
                "is_goal": event.get("isGoal"),
                "card_type_value": card_type.get("value") if isinstance(card_type, dict) else None,
                "card_type_display_name": card_type.get("displayName") if isinstance(card_type, dict) else None,
                "qualifiers_json": Jsonb(event.get("qualifiers") or []),
                "satisfied_events_types_json": Jsonb(event.get("satisfiedEventsTypes") or []),
                "raw_event_json": Jsonb(event),
            }
        )
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO whoscored.match_events (
                match_id, whoscored_event_id, event_seq, team_id, whoscored_team_id,
                player_catalog_id, whoscored_player_id, related_event_id,
                related_player_catalog_id, related_whoscored_player_id,
                minute, second, expanded_minute, period_value, period_display_name,
                type_value, type_display_name, outcome_value, outcome_display_name,
                x, y, end_x, end_y, blocked_x, blocked_y, goal_mouth_z, goal_mouth_y,
                is_touch, is_shot, is_goal, card_type_value, card_type_display_name,
                qualifiers_json, satisfied_events_types_json, raw_event_json
            )
            VALUES (
                %(match_id)s, %(whoscored_event_id)s, %(event_seq)s, %(team_id)s,
                %(whoscored_team_id)s, %(player_catalog_id)s, %(whoscored_player_id)s,
                %(related_event_id)s, %(related_player_catalog_id)s,
                %(related_whoscored_player_id)s, %(minute)s, %(second)s,
                %(expanded_minute)s, %(period_value)s, %(period_display_name)s,
                %(type_value)s, %(type_display_name)s, %(outcome_value)s,
                %(outcome_display_name)s, %(x)s, %(y)s, %(end_x)s, %(end_y)s,
                %(blocked_x)s, %(blocked_y)s, %(goal_mouth_z)s, %(goal_mouth_y)s,
                %(is_touch)s, %(is_shot)s, %(is_goal)s, %(card_type_value)s,
                %(card_type_display_name)s, %(qualifiers_json)s,
                %(satisfied_events_types_json)s, %(raw_event_json)s
            )
            ON CONFLICT (match_id, whoscored_event_id) DO UPDATE SET
                event_seq = EXCLUDED.event_seq,
                team_id = EXCLUDED.team_id,
                whoscored_team_id = EXCLUDED.whoscored_team_id,
                player_catalog_id = EXCLUDED.player_catalog_id,
                whoscored_player_id = EXCLUDED.whoscored_player_id,
                raw_event_json = EXCLUDED.raw_event_json
            """,
            rows,
        )


def load_files(args: argparse.Namespace) -> None:
    raw_dir = Path(args.raw_dir)
    raw_files = sorted(raw_dir.glob("*.json.gz"))
    if not raw_files:
        raise RuntimeError(f"No encontre JSON .gz en {raw_dir}")
    env = _load_env_file(Path(args.supabase_env))
    database_url = args.database_url or os.environ.get("DATABASE_URL") or DEFAULT_DATABASE_URL

    with psycopg.connect(database_url) as conn:
        if args.sync_catalog:
            sync_supabase_catalog(conn, env)
        team_lookup = _load_local_team_lookup(conn)
        player_lookup, player_candidates = _load_player_lookup(conn)

        for path in raw_files:
            payload = _read_json_gz(path)
            match_data = payload["matchCentreData"]
            team_ids = _upsert_team_mappings(conn, match_data, team_lookup)
            players = _extract_players(match_data, team_ids)
            player_ids = _upsert_player_mappings(conn, players, player_lookup, player_candidates)
            _insert_match(conn, payload, team_ids, competition=args.competition, season=args.season)
            _insert_events(conn, payload, team_ids, player_ids)
            conn.commit()
            print(f"OK loaded matchId={payload['matchId']} events={len(match_data.get('events') or [])}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Carga datos WhoScored raw/split a Postgres local.")
    parser.add_argument("--raw-dir", required=True, help="Directorio con archivos raw <match_id>.json.gz.")
    parser.add_argument("--database-url", default=DEFAULT_DATABASE_URL, help="URL de Postgres.")
    parser.add_argument("--supabase-env", default=str(DEFAULT_SUPABASE_ENV), help="Archivo .env.local para leer Supabase.")
    parser.add_argument("--competition", default="Premier League", help="Competicion.")
    parser.add_argument("--season", default="2025-2026", help="Temporada.")
    parser.add_argument("--sync-catalog", action="store_true", help="Sincroniza teams/player_catalog desde Supabase antes de cargar.")
    args = parser.parse_args()
    load_files(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
