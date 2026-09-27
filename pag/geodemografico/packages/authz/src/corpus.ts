import type { PoolClient } from 'pg'
import { notFound } from '@kaizen/contracts'

/**
 * Resuelve el corpus documental de un (tenant, proposito). El cliente NUNCA
 * manda el corpus_id: se deriva del ambito del servidor.
 */
export async function resolveCorpusId(
  client: PoolClient,
  tenantId: string,
  purposeId: string,
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `select id from corpora
      where tenant_id = $1 and purpose_id = $2 and status = 'active'
      order by created_at asc
      limit 1`,
    [tenantId, purposeId],
  )

  const id = rows[0]?.id
  if (!id) throw notFound('el proposito no tiene corpus activo')
  return id
}
