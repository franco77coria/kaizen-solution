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
  provinceIds: z.string().max(800).transform(v => v.split(',')).pipe(z.array(z.string().min(1).max(40)).min(1).max(15)).optional(),
  municipalityCodes: z.string().max(700).transform(v => v.split(',')).pipe(z.array(z.string().regex(/^25\d{3}$/)).min(1).max(116)).optional(),
  months: z.string().max(960).transform(v => v.split(',')).pipe(z.array(z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)).min(1).max(120)).optional(),
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
    if ((f.provinceId && f.provinceIds) || (f.municipalityCode && f.municipalityCodes) || (f.month && f.months)) throw validationFailed('no mezcles filtros individuales y múltiples')
    const provinceIds = [...new Set(f.provinceIds ?? (f.provinceId ? [f.provinceId] : []))]
    const municipalityCodes = [...new Set(f.municipalityCodes ?? (f.municipalityCode ? [f.municipalityCode] : []))]
    const months = [...new Set(f.months ?? (f.month ? [f.month] : []))]
    const selectedProvinces = CUNDINAMARCA_PROVINCES.filter(p => provinceIds.includes(p.id))
    if (selectedProvinces.length !== provinceIds.length) throw validationFailed('provincia inválida')
    if (municipalityCodes.some(code => !findMunicipality(code) || (provinceIds.length && !selectedProvinces.some(p => p.municipalityCodes.includes(code))))) throw validationFailed('municipio fuera de las provincias seleccionadas')
    if (f.level === 'vereda' && !municipalityCodes.length) throw validationFailed('elegí un municipio para consultar sus veredas')
    if (f.level === 'province' && municipalityCodes.length) throw validationFailed('el nivel provincia no admite municipios')
    await admitir('analytics', `${session.tenantId}:${session.userId}`)
    const catalog = f.level === 'province'
      ? CUNDINAMARCA_PROVINCES.filter(p => !provinceIds.length || provinceIds.includes(p.id)).map(p => ({ code: p.id, name: p.name }))
      : f.level === 'municipality'
        ? CUNDINAMARCA_MUNICIPALITIES.filter(m => (!provinceIds.length || selectedProvinces.some(p => p.municipalityCodes.includes(m.code))) && (!municipalityCodes.length || municipalityCodes.includes(m.code))).map(m => ({ code: m.code, name: displayName(m.code) }))
        : municipalityCodes.flatMap(code => veredasOf(code).map(v => ({ code: v.code, name: municipalityCodes.length > 1 ? `${v.name} · ${displayName(code)}` : v.name })))
    // Las únicas expresiones SQL posibles están escritas acá; los filtros
    // viajan como parámetros. Se cuenta cada receptor una sola vez.
    const group = f.level === 'province' ? 'm.province_id' : f.level === 'municipality' ? 'r.municipality_code' : "coalesce(r.vereda_code, '__unassigned')"
    const raw = await withAuthorizedTransaction('app', txContext(session), async client => {
      await client.query(`set local statement_timeout = ${LIMITS.ANALYTICS_TIMEOUT_MS}`)
      const result = await client.query<{ grupo: string; cantidad: number }>(`
        select ${group} as grupo, count(*)::int as cantidad
          from person_records r join municipality_catalog m on m.code = r.municipality_code
         where r.purpose_id = $1 and r.status in ('submitted','approved')
           and ($2::text[] is null or m.province_id = any($2))
           and ($3::text[] is null or r.municipality_code = any($3))
           and ($4::text[] is null or to_char(r.created_at at time zone 'America/Bogota','YYYY-MM') = any($4))
           and ($5::text = 'records' or exists (
             select 1 from referrals x join person_records ref on ref.id = x.referrer_record_id and ref.tenant_id = x.tenant_id
              where x.referred_record_id = r.id and x.tenant_id = r.tenant_id
                and x.purpose_id = r.purpose_id and ref.purpose_id = r.purpose_id
                and ref.status in ('submitted','approved')
           ))
         group by 1 order by 1`,
        [session.purposeId, provinceIds.length ? provinceIds : null, municipalityCodes.length ? municipalityCodes : null, months.length ? months : null, f.metric],
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
