-- Mappings pendientes. Deben devolver cero filas para una carga lista.
SELECT 'unresolved_team_mappings' AS check_name, COUNT(*) AS issue_count
FROM whoscored.unresolved_team_mappings
UNION ALL
SELECT 'unresolved_player_mappings' AS check_name, COUNT(*) AS issue_count
FROM whoscored.unresolved_player_mappings;

-- Eventos con equipo externo pero sin equipo canonico.
SELECT COUNT(*) AS events_without_team
FROM whoscored.match_events
WHERE whoscored_team_id IS NOT NULL
  AND team_id IS NULL;

-- Eventos con jugador externo pero sin jugador canonico.
SELECT COUNT(*) AS events_without_player
FROM whoscored.match_events
WHERE whoscored_player_id IS NOT NULL
  AND player_catalog_id IS NULL;

-- Partidos con equipos externos pero sin equipo canonico.
SELECT COUNT(*) AS matches_without_canonical_teams
FROM whoscored.matches
WHERE home_team_id IS NULL
   OR away_team_id IS NULL;

-- Eventos duplicados por partido segun el ID externo fuerte de WhoScored.
SELECT match_id, whoscored_event_id, COUNT(*) AS duplicates
FROM whoscored.match_events
GROUP BY match_id, whoscored_event_id
HAVING COUNT(*) > 1;
