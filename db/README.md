# Base de datos local

Configuracion local de PostgreSQL para desarrollo y carga de datos WhoScored.

## Estado local

En esta maquina se instalo PostgreSQL 16 nativo y se creo:

```text
database: primexi_local
user: primexi
schema: whoscored
```

La conexion local es:

```text
postgresql://primexi:primexi_dev_password@localhost:5432/primexi_local
```

Para verificar el servicio nativo:

```bash
systemctl status postgresql --no-pager
PGPASSWORD=primexi_dev_password psql -h localhost -U primexi -d primexi_local -c '\dt whoscored.*'
```

## Requisitos

- Docker con Docker Compose.
- Puerto `5432` libre, o ajustar `POSTGRES_PORT` en `.env`.

## Inicio rapido

Con Docker:

```bash
cp .env.example .env
docker compose up -d postgres
docker compose ps
```

La conexion por defecto queda:

```text
postgresql://primexi:primexi_dev_password@localhost:5432/primexi_local
```

## Verificacion

Con Docker:

```bash
docker compose exec postgres psql -U primexi -d primexi_local -c '\dt whoscored.*'
```

Con PostgreSQL nativo:

```bash
PGPASSWORD=primexi_dev_password psql -h localhost -U primexi -d primexi_local -c '\dt whoscored.*'
```

## Estructura inicial

El archivo `db/init/001_whoscored_schema.sql` se ejecuta solo la primera vez que se crea el volumen de Postgres. Crea:

- tablas minimas compatibles de `public.teams` y `public.player_catalog` si no existen en local
- `whoscored.team_mappings`
- `whoscored.player_mappings`
- `whoscored.matches`
- `whoscored.match_events`
- `whoscored.event_types`
- `whoscored.formations`
- `whoscored.event_qualifiers`

La relacion entre WhoScored y el modelo canonico de la app esta documentada en `db/WHOSCORED_RELATIONS.md`.

La migracion equivalente para Supabase esta en `Frontend_PRIMEXI/supabase/migrations/20260506_whoscored_schema.sql`. Esa migracion no crea `public.teams` ni `public.player_catalog`; los referencia como tablas canonicas ya existentes.

## Validacion de carga

Antes de subir datos o usarlos para modelos:

```bash
docker compose exec postgres psql -U primexi -d primexi_local -f db/queries/whoscored_validation.sql
```

Con PostgreSQL nativo:

```bash
PGPASSWORD=primexi_dev_password psql -h localhost -U primexi -d primexi_local -f db/queries/whoscored_validation.sql
```

Los conteos de issues deben ser `0` para considerar la carga completamente conectada al modelo Primexi.

## Reiniciar desde cero

Esto borra los datos locales:

```bash
docker compose down -v
docker compose up -d postgres
```

## Nota de migracion

El esquema usa PostgreSQL real con `JSONB`, indices `GIN`, llaves foraneas y tipos compatibles con Supabase/Postgres administrado. Eso reduce sorpresas cuando pasemos de local a produccion.
