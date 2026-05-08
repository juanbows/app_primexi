CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fpl_id INTEGER UNIQUE,
    code INTEGER,
    name TEXT,
    short_name TEXT,
    api_payload JSONB,
    updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.player_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fpl_id INTEGER UNIQUE,
    team_id UUID REFERENCES public.teams (id),
    web_name TEXT,
    full_name TEXT,
    api_payload JSONB,
    updated_at TIMESTAMPTZ
);

CREATE SCHEMA IF NOT EXISTS whoscored;

CREATE TABLE IF NOT EXISTS whoscored.team_mappings (
    whoscored_team_id BIGINT PRIMARY KEY,
    team_id UUID REFERENCES public.teams (id),
    fpl_id INTEGER,
    whoscored_team_name TEXT NOT NULL,
    normalized_name TEXT,
    confidence NUMERIC(5, 4),
    mapping_source TEXT NOT NULL DEFAULT 'manual',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whoscored.player_mappings (
    whoscored_player_id BIGINT PRIMARY KEY,
    player_catalog_id UUID REFERENCES public.player_catalog (id),
    fpl_id INTEGER,
    whoscored_player_name TEXT NOT NULL,
    normalized_name TEXT,
    team_id UUID REFERENCES public.teams (id),
    whoscored_team_id BIGINT REFERENCES whoscored.team_mappings (whoscored_team_id),
    confidence NUMERIC(5, 4),
    mapping_source TEXT NOT NULL DEFAULT 'manual',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whoscored.matches (
    match_id BIGINT PRIMARY KEY,
    source_url TEXT NOT NULL,
    fetched_at_utc TIMESTAMPTZ NOT NULL,
    competition TEXT,
    season TEXT,
    start_date DATE,
    start_time TIME,
    status_code SMALLINT,
    venue_name TEXT,
    attendance INTEGER,
    referee_name TEXT,
    home_team_id UUID REFERENCES public.teams (id),
    home_whoscored_team_id BIGINT NOT NULL REFERENCES whoscored.team_mappings (whoscored_team_id),
    home_team_name TEXT,
    away_team_id UUID REFERENCES public.teams (id),
    away_whoscored_team_id BIGINT NOT NULL REFERENCES whoscored.team_mappings (whoscored_team_id),
    away_team_name TEXT,
    home_score SMALLINT,
    away_score SMALLINT,
    ht_home_score SMALLINT,
    ht_away_score SMALLINT,
    ft_home_score SMALLINT,
    ft_away_score SMALLINT,
    et_home_score SMALLINT,
    et_away_score SMALLINT,
    pk_home_score SMALLINT,
    pk_away_score SMALLINT,
    raw_match_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whoscored.match_events (
    event_pk BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL REFERENCES whoscored.matches (match_id) ON DELETE CASCADE,
    whoscored_event_id NUMERIC NOT NULL,
    event_seq INTEGER,
    team_id UUID REFERENCES public.teams (id),
    whoscored_team_id BIGINT REFERENCES whoscored.team_mappings (whoscored_team_id),
    player_catalog_id UUID REFERENCES public.player_catalog (id),
    whoscored_player_id BIGINT REFERENCES whoscored.player_mappings (whoscored_player_id),
    related_event_id NUMERIC,
    related_player_catalog_id UUID REFERENCES public.player_catalog (id),
    related_whoscored_player_id BIGINT REFERENCES whoscored.player_mappings (whoscored_player_id),
    minute SMALLINT,
    second SMALLINT,
    expanded_minute SMALLINT,
    period_value SMALLINT,
    period_display_name TEXT,
    type_value SMALLINT,
    type_display_name TEXT,
    outcome_value SMALLINT,
    outcome_display_name TEXT,
    x NUMERIC(6, 3),
    y NUMERIC(6, 3),
    end_x NUMERIC(6, 3),
    end_y NUMERIC(6, 3),
    blocked_x NUMERIC(6, 3),
    blocked_y NUMERIC(6, 3),
    goal_mouth_z NUMERIC(6, 3),
    goal_mouth_y NUMERIC(6, 3),
    is_touch BOOLEAN,
    is_shot BOOLEAN,
    is_goal BOOLEAN,
    card_type_value SMALLINT,
    card_type_display_name TEXT,
    qualifiers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    satisfied_events_types_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    raw_event_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (match_id, whoscored_event_id)
);

CREATE TABLE IF NOT EXISTS whoscored.event_types (
    type_value SMALLINT PRIMARY KEY,
    type_name TEXT NOT NULL,
    raw_type_json JSONB
);

CREATE TABLE IF NOT EXISTS whoscored.formations (
    formation_id SMALLINT PRIMARY KEY,
    formation_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS whoscored.event_qualifiers (
    event_qualifier_pk BIGSERIAL PRIMARY KEY,
    event_pk BIGINT NOT NULL REFERENCES whoscored.match_events (event_pk) ON DELETE CASCADE,
    match_id BIGINT NOT NULL,
    qualifier_type_value SMALLINT,
    qualifier_type_display_name TEXT,
    qualifier_value TEXT,
    raw_qualifier_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_matches_competition_season
    ON whoscored.matches (competition, season);

CREATE INDEX IF NOT EXISTS idx_matches_teams
    ON whoscored.matches (home_team_id, away_team_id);

CREATE INDEX IF NOT EXISTS idx_matches_whoscored_teams
    ON whoscored.matches (home_whoscored_team_id, away_whoscored_team_id);

CREATE INDEX IF NOT EXISTS idx_match_events_order
    ON whoscored.match_events (match_id, period_value, expanded_minute, minute, second, event_seq);

CREATE INDEX IF NOT EXISTS idx_match_events_team_time
    ON whoscored.match_events (team_id, match_id, expanded_minute);

CREATE INDEX IF NOT EXISTS idx_match_events_whoscored_team_time
    ON whoscored.match_events (whoscored_team_id, match_id, expanded_minute);

CREATE INDEX IF NOT EXISTS idx_match_events_type
    ON whoscored.match_events (type_value);

CREATE INDEX IF NOT EXISTS idx_match_events_player
    ON whoscored.match_events (player_catalog_id);

CREATE INDEX IF NOT EXISTS idx_match_events_whoscored_player
    ON whoscored.match_events (whoscored_player_id);

CREATE INDEX IF NOT EXISTS idx_match_events_qualifiers_gin
    ON whoscored.match_events USING GIN (qualifiers_json);

CREATE INDEX IF NOT EXISTS idx_event_qualifiers_event
    ON whoscored.event_qualifiers (event_pk);

CREATE INDEX IF NOT EXISTS idx_event_qualifiers_type
    ON whoscored.event_qualifiers (qualifier_type_value);

CREATE OR REPLACE VIEW whoscored.unresolved_team_mappings AS
SELECT *
FROM whoscored.team_mappings
WHERE team_id IS NULL;

CREATE OR REPLACE VIEW whoscored.unresolved_player_mappings AS
SELECT *
FROM whoscored.player_mappings
WHERE player_catalog_id IS NULL;
