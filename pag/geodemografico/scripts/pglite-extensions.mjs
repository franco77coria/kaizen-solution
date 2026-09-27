/**
 * Extensiones que la base necesita, cargadas en PGlite.
 * En PostgreSQL administrado ya vienen disponibles; aqui hay que registrarlas
 * explicitamente antes de que `create extension` pueda encontrarlas.
 */
import { vector } from '@electric-sql/pglite-pgvector'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { unaccent } from '@electric-sql/pglite/contrib/unaccent'

export const extensions = { vector, pgcrypto, pg_trgm, unaccent }
