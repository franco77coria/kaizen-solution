-- 0009 — Catalogo territorial versionado.
-- Las geometrias provienen de una fuente oficial verificada. NO se generan
-- con IA, no se dibujan a mano y no se inventan poligonos de barrios.

create table geography_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  -- Procedencia obligatoria: sin fuente declarada la version no se activa.
  source_name text not null,
  source_url text not null,
  source_published_on date,
  crs text not null default 'EPSG:4326',
  status text not null default 'draft' check (status in ('draft','active','retired')),
  -- Se llena al cargar; si no hay geometrias cargadas se declara, no se simula.
  geometry_loaded boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create table areas (
  id uuid primary key default gen_random_uuid(),
  geography_version_id uuid not null references geography_versions(id) on delete cascade,
  level text not null check (level in ('department','municipality')),
  -- Codigo DIVIPOLA. Es la clave real: los homonimos existen y el nombre no basta.
  code text not null,
  name text not null,
  parent_code text,
  -- GeoJSON de la geometria oficial. NULL declara ausencia, no se rellena.
  geometry jsonb,
  -- Centroide precalculado para etiquetas, derivado de la geometria cargada.
  centroid_lon double precision,
  centroid_lat double precision,
  constraint area_codigo_unico unique (geography_version_id, code)
);

-- El catalogo territorial del proyecto: los 116 municipios de Cundinamarca.
-- Bogota D.C. queda FUERA del conjunto departamental por decision explicita.
create table municipality_catalog (
  code text primary key check (code ~ '^[0-9]{5}$'),
  name text not null,
  department_code text not null,
  department_name text not null,
  in_project_scope boolean not null default true,
  note text
);

create index on areas (geography_version_id, level);
create index on areas (code);
