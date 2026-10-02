import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { forbidden, LIMITS, validationFailed } from '@kaizen/contracts'
import { withAuthorizedTransaction } from '@kaizen/db'
import { CUNDINAMARCA_PROVINCES, CUNDINAMARCA_MUNICIPALITIES, displayName, findMunicipality, veredasOf } from '@kaizen/geography'
import { aplicarSupresion } from '@kaizen/query-plans'
import { resolveScope, txContext } from '../plugins/session.js'
import { leerAmbito } from './scope.js'
import { admitir } from '../plugins/admission.js'
import { registrarAuditoria } from '../services/audit.js'

const filters = z.object({
  level: z.enum(['province', 'municipality', 'vereda']).default('province'),
  provinceId: z.string().max(40).optional(),
  municipalityCode: z.string().regex(/^25\d{3}$/).optional(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  metric: z.enum(['records', 'referrals']).default('records'),
}).strict()

/** Agregados territoriales: ninguna fila nominal ni coordenada de personas. */
export async function territoryRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/geography/veredas', async request => {
    const session = await resolveScope(request, leerAmbito(request), [])
    if (!session.permissions.has('analytics.aggregate') && !session.permissions.has('records.capture')) throw forbidden('sin acceso al catálogo territorial')
    const query = z.object({ municipalityCode: z.string().regex(/^25\d{3}$/) }).strict().safeParse(request.query)
    if (!query.success || !findMunicipality(query.data.municipalityCode)) throw validationFailed('municipio inválido')
    return { veredas: veredasOf(query.data.municipalityCode) }
  })

  app.get('/v1/geography/territory', async request => {
    const session = await resolveScope(request, leerAmbito(request), ['analytics.aggregate'])
    const parsed = filters.safeParse(request.query ?? {})
    if (!parsed.success) throw validationFailed('filtros territoriales inválidos')
    const f = parsed.data
    const province = f.provinceId ? CUNDINAMARCA_PROVINCES.find(p => p.id === f.provinceId) : undefined
    if (f.provinceId && !province) throw validationFailed('provincia inválida')
    if (f.municipalityCode && (!findMunicipality(f.municipalityCode) || (province && !province.municipalityCodes.includes(f.municipalityCode)))) throw validationFailed('municipio fuera de la provincia')
    if (f.level === 'vereda' && !f.municipalityCode) throw validationFailed('elegí un municipio para consultar sus veredas')
    if (f.level === 'province' && f.municipalityCode) throw validationFailed('el nivel provincia no admite un municipio')
    await admitir('analytics', `${session.tenantId}:${session.userId}`)
    const catalog = f.level === 'province'
      ? CUNDINAMARCA_PROVINCES.map(p => ({ code: p.id, name: p.name }))
      : f.level === 'municipality'
        ? CUNDINAMARCA_MUNICIPALITIES.filter(m => (!province || province.municipalityCodes.includes(m.code)) && (!f.municipalityCode || m.code === f.municipalityCode)).map(m => ({ code: m.code, name: displayName(m.code) }))
        : veredasOf(f.municipalityCode ?? '').map(v => ({ code: v.code, name: v.name }))
    // Las únicas expresiones SQL posibles están escritas acá; los filtros
    // viajan como parámetros. Se cuenta cada receptor una sola vez.
    const group = f.level === 'province' ? 'm.province_id' : f.level === 'municipality' ? 'r.municipality_code' : "coalesce(r.vereda_code, '__unassigned')"
    const raw = await withAuthorizedTransaction('app', txContext(session), async client => {
      await client.query(`set local statement_timeout = ${LIMITS.ANALYTICS_TIMEOUT_MS}`)
      const result = await client.query<{ grupo: string; cantidad: number }>(`
        select ${group} as grupo, count(*)::int as cantidad
          from person_records r join municipality_catalog m on m.code = r.municipality_code
         where r.purpose_id = $1 and r.status in ('submitted','approved')
           and ($2::text is null or m.province_id = $2)
           and ($3::text is null or r.municipality_code = $3)
           and ($4::text is null or to_char(r.created_at at time zone 'America/Bogota','YYYY-MM') = $4)
           and ($5::text = 'records' or exists (
             select 1 from referrals x join person_records ref on ref.id = x.referrer_record_id and ref.tenant_id = x.tenant_id
              where x.referred_record_id = r.id and x.tenant_id = r.tenant_id
                and x.purpose_id = r.purpose_id and ref.purpose_id = r.purpose_id
                and ref.status in ('submitted','approved')
           ))
         group by 1 order by 1`,
        [session.purposeId, f.provinceId ?? null, f.municipalityCode ?? null, f.month ?? null, f.metric],
      )
      return result.rows
    })
    const names = new Map(catalog.map(a => [a.code, a.name]))
    const suppressed = aplicarSupresion(raw, key => names.get(key) ?? 'Sin vereda asignada')
    const byCode = new Map(suppressed.rows.map(row => [row.key, row]))
    const total = aplicarSupresion([{ grupo: 'total', cantidad: raw.reduce((sum, row) => sum + row.cantidad, 0) }]).rows[0]
    const unassigned = byCode.get('__unassigned') ?? { key: '__unassigned', label: 'Sin vereda asignada', value: 0, suppressed: false }
    await registrarAuditoria({ actorUserId: session.userId, tenantId: session.tenantId, purposeId: session.purposeId, action: 'analytics.run', resourceRef: null, result: 'allowed', requestId: request.requestId, detail: { surface: 'territory', level: f.level, metric: f.metric } })
    return {
      level: f.level, metric: f.metric, total, unassigned,
      rows: catalog.map(a => byCode.get(a.code) ?? { key: a.code, label: a.name, value: 0, suppressed: false }),
      coveredAreas: raw.filter(row => row.grupo !== '__unassigned' && row.cantidad > 0).length,
      areaCount: catalog.length, suppressionThreshold: suppressed.threshold, executedAt: new Date().toISOString(),
    }
  })
}
