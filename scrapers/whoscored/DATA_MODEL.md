# Modelo de datos WhoScored

Este documento define la estructura recomendada para persistir `matchCentreData` y sus eventos. El objetivo es mantener un modelo estable para consultas, reconstruccion de secuencias y futuros modelos de simulacion Monte Carlo.

## Principios

- Separar el partido (`matches`) de la secuencia de eventos (`match_events`).
- Usar `match_id` como llave comun entre partido y eventos.
- Usar `public.teams.id` y `public.player_catalog.id` como llaves canonicas de la app.
- Guardar IDs de WhoScored en columnas explicitas `whoscored_*_id`; no deben reemplazar las llaves internas.
- Resolver equipos y jugadores mediante tablas puente antes de considerar la carga lista.
- Conservar el evento crudo en `raw_event_json` para no perder campos de WhoScored que todavia no esten modelados.
- Guardar los arreglos flexibles (`qualifiers`, `satisfiedEventsTypes`) como `JSONB` y normalizarlos despues solo si aportan valor analitico.
- Mantener tablas catalogo para valores reutilizables, como tipos de evento y formaciones.

## Tabla `matches`

Una fila por partido scrapeado.

| Columna | Tipo sugerido | Requerido | Descripcion |
| --- | --- | --- | --- |
| `match_id` | `BIGINT` | Si | Identificador del partido en WhoScored. Llave primaria. |
| `source_url` | `TEXT` | Si | URL original usada para obtener el partido. |
| `fetched_at_utc` | `TIMESTAMPTZ` | Si | Fecha/hora UTC de extraccion. |
| `competition` | `TEXT` | No | Competicion normalizada, por ejemplo `Premier League`. |
| `season` | `TEXT` | No | Temporada, por ejemplo `2024-2025`. |
| `start_date` | `DATE` | No | Fecha de inicio segun `matchCentreData.startDate`. |
| `start_time` | `TIME` | No | Hora de inicio segun `matchCentreData.startTime`. |
| `status_code` | `SMALLINT` | No | Estado del partido en WhoScored. |
| `venue_name` | `TEXT` | No | Estadio o sede del partido. |
| `attendance` | `INTEGER` | No | Asistencia reportada. |
| `referee_name` | `TEXT` | No | Nombre del arbitro, si esta disponible. |
| `home_team_id` | `UUID` | No | FK canonica a `public.teams.id` para el equipo local. |
| `home_whoscored_team_id` | `BIGINT` | Si | ID externo de WhoScored del equipo local. |
| `home_team_name` | `TEXT` | No | Nombre del equipo local. |
| `away_team_id` | `UUID` | No | FK canonica a `public.teams.id` para el equipo visitante. |
| `away_whoscored_team_id` | `BIGINT` | Si | ID externo de WhoScored del equipo visitante. |
| `away_team_name` | `TEXT` | No | Nombre del equipo visitante. |
| `home_score` | `SMALLINT` | No | Goles locales en marcador actual/final. |
| `away_score` | `SMALLINT` | No | Goles visitantes en marcador actual/final. |
| `ht_home_score` | `SMALLINT` | No | Goles locales al descanso. |
| `ht_away_score` | `SMALLINT` | No | Goles visitantes al descanso. |
| `ft_home_score` | `SMALLINT` | No | Goles locales al final del tiempo regular. |
| `ft_away_score` | `SMALLINT` | No | Goles visitantes al final del tiempo regular. |
| `et_home_score` | `SMALLINT` | No | Goles locales tras prorroga, si aplica. |
| `et_away_score` | `SMALLINT` | No | Goles visitantes tras prorroga, si aplica. |
| `pk_home_score` | `SMALLINT` | No | Penales convertidos por local, si aplica. |
| `pk_away_score` | `SMALLINT` | No | Penales convertidos por visitante, si aplica. |
| `raw_match_json` | `JSONB` | Si | `matchCentreData` completo para auditoria y reprocesamiento. |

Llaves e indices recomendados:

```sql
PRIMARY KEY (match_id);
CREATE INDEX idx_matches_competition_season ON matches (competition, season);
CREATE INDEX idx_matches_teams ON matches (home_team_id, away_team_id);
CREATE INDEX idx_matches_whoscored_teams ON matches (home_whoscored_team_id, away_whoscored_team_id);
```

## Tabla `team_mappings`

Tabla puente entre equipos de WhoScored y equipos canonicos de Primexi.

| Columna | Tipo sugerido | Requerido | Descripcion |
| --- | --- | --- | --- |
| `whoscored_team_id` | `BIGINT` | Si | ID externo de equipo en WhoScored. Llave primaria. |
| `team_id` | `UUID` | No | FK a `public.teams.id`. Debe resolverse antes de analitica final. |
| `fpl_id` | `INTEGER` | No | ID FPL auxiliar para resolver equipos. |
| `whoscored_team_name` | `TEXT` | Si | Nombre observado en WhoScored. |
| `normalized_name` | `TEXT` | No | Nombre normalizado para matching. |
| `confidence` | `NUMERIC(5,4)` | No | Confianza del mapeo. |
| `mapping_source` | `TEXT` | Si | Origen del mapeo: `manual`, `name_match`, `fixture_match`, etc. |
| `notes` | `TEXT` | No | Observaciones de auditoria. |

## Tabla `player_mappings`

Tabla puente entre jugadores de WhoScored y `public.player_catalog`.

| Columna | Tipo sugerido | Requerido | Descripcion |
| --- | --- | --- | --- |
| `whoscored_player_id` | `BIGINT` | Si | ID externo de jugador en WhoScored. Llave primaria. |
| `player_catalog_id` | `UUID` | No | FK a `public.player_catalog.id`. Debe resolverse antes de analitica final. |
| `fpl_id` | `INTEGER` | No | ID FPL auxiliar para resolver jugadores. |
| `whoscored_player_name` | `TEXT` | Si | Nombre observado en WhoScored. |
| `normalized_name` | `TEXT` | No | Nombre normalizado para matching. |
| `team_id` | `UUID` | No | FK a `public.teams.id` para desambiguar jugador/equipo. |
| `whoscored_team_id` | `BIGINT` | No | Equipo WhoScored observado. |
| `confidence` | `NUMERIC(5,4)` | No | Confianza del mapeo. |
| `mapping_source` | `TEXT` | Si | Origen del mapeo. |
| `notes` | `TEXT` | No | Observaciones de auditoria. |

## Tabla `match_events`

Una fila por evento dentro de un partido. El campo `match_id` no viene dentro del evento original; se agrega durante la carga usando el partido padre.

| Columna | Tipo sugerido | Requerido | Descripcion |
| --- | --- | --- | --- |
| `event_pk` | `BIGSERIAL` | Si | Llave primaria interna. |
| `match_id` | `BIGINT` | Si | FK hacia `matches.match_id`. |
| `whoscored_event_id` | `NUMERIC` | Si | Campo `id` del evento WhoScored. Es el identificador mas fuerte del evento. |
| `event_seq` | `INTEGER` | No | Campo `eventId`. Sirve para ordenar dentro del partido, pero puede repetirse. |
| `team_id` | `UUID` | No | FK canonica a `public.teams.id`. |
| `whoscored_team_id` | `BIGINT` | No | ID externo de equipo en WhoScored. |
| `player_catalog_id` | `UUID` | No | FK canonica a `public.player_catalog.id`. |
| `whoscored_player_id` | `BIGINT` | No | ID externo de jugador en WhoScored. |
| `related_event_id` | `NUMERIC` | No | Evento relacionado, si WhoScored lo informa. |
| `related_player_catalog_id` | `UUID` | No | FK canonica del jugador relacionado. |
| `related_whoscored_player_id` | `BIGINT` | No | ID externo del jugador relacionado. |
| `minute` | `SMALLINT` | No | Minuto oficial del evento. |
| `second` | `SMALLINT` | No | Segundo dentro del minuto. |
| `expanded_minute` | `SMALLINT` | No | Minuto expandido, util para descuento/prorroga. |
| `period_value` | `SMALLINT` | No | Codigo numerico del periodo. |
| `period_display_name` | `TEXT` | No | Nombre del periodo, por ejemplo `FirstHalf`. |
| `type_value` | `SMALLINT` | No | Codigo numerico del tipo de evento. |
| `type_display_name` | `TEXT` | No | Nombre del tipo de evento, por ejemplo `Pass`, `Shot`, `Start`. |
| `outcome_value` | `SMALLINT` | No | Codigo numerico del resultado. |
| `outcome_display_name` | `TEXT` | No | Resultado legible, por ejemplo `Successful` o `Unsuccessful`. |
| `x` | `NUMERIC(6,3)` | No | Coordenada X inicial en escala WhoScored. |
| `y` | `NUMERIC(6,3)` | No | Coordenada Y inicial en escala WhoScored. |
| `end_x` | `NUMERIC(6,3)` | No | Coordenada X final, si aplica. |
| `end_y` | `NUMERIC(6,3)` | No | Coordenada Y final, si aplica. |
| `blocked_x` | `NUMERIC(6,3)` | No | Coordenada X de bloqueo, si aplica. |
| `blocked_y` | `NUMERIC(6,3)` | No | Coordenada Y de bloqueo, si aplica. |
| `goal_mouth_z` | `NUMERIC(6,3)` | No | Altura en boca de arco para tiros, si aplica. |
| `goal_mouth_y` | `NUMERIC(6,3)` | No | Posicion lateral en boca de arco para tiros, si aplica. |
| `is_touch` | `BOOLEAN` | No | Indica si el evento cuenta como toque. |
| `is_shot` | `BOOLEAN` | No | Indica si el evento es tiro. |
| `is_goal` | `BOOLEAN` | No | Indica si el evento termina en gol. |
| `card_type_value` | `SMALLINT` | No | Codigo de tarjeta, si aplica. |
| `card_type_display_name` | `TEXT` | No | Nombre de tarjeta, si aplica. |
| `qualifiers_json` | `JSONB` | Si | Arreglo `qualifiers` original del evento. |
| `satisfied_events_types_json` | `JSONB` | Si | Arreglo `satisfiedEventsTypes` original. |
| `raw_event_json` | `JSONB` | Si | Evento completo tal como vino de WhoScored. |

Llaves e indices recomendados:

```sql
PRIMARY KEY (event_pk);
FOREIGN KEY (match_id) REFERENCES matches (match_id);
UNIQUE (match_id, whoscored_event_id);
CREATE INDEX idx_match_events_order ON match_events (match_id, period_value, expanded_minute, minute, second, event_seq);
CREATE INDEX idx_match_events_team_time ON match_events (team_id, match_id, expanded_minute);
CREATE INDEX idx_match_events_whoscored_team_time ON match_events (whoscored_team_id, match_id, expanded_minute);
CREATE INDEX idx_match_events_type ON match_events (type_value);
CREATE INDEX idx_match_events_player ON match_events (player_catalog_id);
CREATE INDEX idx_match_events_whoscored_player ON match_events (whoscored_player_id);
CREATE INDEX idx_match_events_qualifiers_gin ON match_events USING GIN (qualifiers_json);
```

## Tabla `event_types`

Catalogo para los valores de `matchCentreEventTypeJson`.

| Columna | Tipo sugerido | Requerido | Descripcion |
| --- | --- | --- | --- |
| `type_value` | `SMALLINT` | Si | Codigo WhoScored del tipo de evento. Llave primaria. |
| `type_name` | `TEXT` | Si | Nombre normalizado del tipo de evento. |
| `raw_type_json` | `JSONB` | No | Registro crudo si el origen trae mas metadata. |

## Tabla `formations`

Catalogo para `formationIdNameMappings`.

| Columna | Tipo sugerido | Requerido | Descripcion |
| --- | --- | --- | --- |
| `formation_id` | `SMALLINT` | Si | ID WhoScored de la formacion. Llave primaria. |
| `formation_name` | `TEXT` | Si | Nombre de la formacion, por ejemplo `4-3-3`. |

## Tabla opcional `event_qualifiers`

Esta tabla conviene crear cuando empecemos a usar calificadores como features del modelo. Mientras tanto, `qualifiers_json` alcanza.

| Columna | Tipo sugerido | Requerido | Descripcion |
| --- | --- | --- | --- |
| `event_qualifier_pk` | `BIGSERIAL` | Si | Llave primaria interna. |
| `event_pk` | `BIGINT` | Si | FK hacia `match_events.event_pk`. |
| `match_id` | `BIGINT` | Si | Copia util para particionado/consultas. |
| `qualifier_type_value` | `SMALLINT` | No | Codigo del tipo de qualifier. |
| `qualifier_type_display_name` | `TEXT` | No | Nombre del qualifier. |
| `qualifier_value` | `TEXT` | No | Valor asociado, si existe. |
| `raw_qualifier_json` | `JSONB` | Si | Qualifier completo original. |

Llaves e indices recomendados:

```sql
PRIMARY KEY (event_qualifier_pk);
FOREIGN KEY (event_pk) REFERENCES match_events (event_pk);
CREATE INDEX idx_event_qualifiers_event ON event_qualifiers (event_pk);
CREATE INDEX idx_event_qualifiers_type ON event_qualifiers (qualifier_type_value);
```

## Orden de eventos

Para reconstruir la secuencia de partido se recomienda ordenar por:

```sql
ORDER BY match_id, period_value, expanded_minute, minute, second, event_seq, whoscored_event_id
```

`eventId` puede repetirse en el scrape observado, por eso no debe usarse como identificador unico. La clave estable recomendada es `(match_id, whoscored_event_id)`.

## Uso para Monte Carlo

Este modelo conserva las piezas necesarias para construir simulaciones a partir de secuencias reales:

- Estado temporal: `period_value`, `minute`, `second`, `expanded_minute`.
- Estado espacial: `x`, `y`, `end_x`, `end_y`.
- Actor y equipo: `team_id`, `player_catalog_id`, mas IDs externos `whoscored_team_id`, `whoscored_player_id` para trazabilidad.
- Tipo y resultado: `type_value`, `type_display_name`, `outcome_value`, `outcome_display_name`.
- Contexto adicional: `qualifiers_json`, `satisfied_events_types_json`, `raw_event_json`.

Con esta base se pueden derivar posesiones, tiros, transiciones, ritmo por minuto, estados de marcador y cadenas de eventos para muestrear escenarios en un modelo Monte Carlo.

## Carga recomendada

1. Guardar primero el archivo raw por partido (`<match_id>.json.gz`).
2. Insertar o actualizar la fila de `matches`.
3. Resolver equipos en `team_mappings`.
4. Resolver jugadores en `player_mappings`.
5. Insertar los eventos en `match_events` agregando `match_id`, `team_id` y `player_catalog_id`.
6. Poblar catalogos (`event_types`, `formations`) de forma idempotente.
7. Normalizar `event_qualifiers` solo cuando se definan features que lo necesiten.

## Validacion antes de subir

Antes de migrar o usar datos para modelos, estas vistas deben estar vacias:

```sql
SELECT * FROM whoscored.unresolved_team_mappings;
SELECT * FROM whoscored.unresolved_player_mappings;
```

La carga puede tolerar mappings pendientes durante ingesta, pero no deberia considerarse lista si los eventos quedan sin `team_id` o sin `player_catalog_id` cuando el raw trae equipo/jugador.
