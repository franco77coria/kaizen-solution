import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { F, seedRegistros, CONSENT_TEXT_VERSION } from '@kaizen/fixtures'
import { veredasOf } from '@kaizen/geography'
import { setupTestEnv, type TestEnv } from '../helpers/db.js'

let env: TestEnv
let app: FastifyInstance
const cookies = new Map<string, { cookie: string; csrf: string }>()
const veredas = veredasOf('25035')
const record = (n: number) => `a2${String(n).padStart(6, '0')}-0000-4000-8000-000000000001`
function headers(subject = 'sub-a2', tenant = F.tenantA as string, purpose = F.purposeA as string) {
  const s = cookies.get(subject)!
  return { cookie: s.cookie, 'x-csrf-token': s.csrf, 'x-tenant-id': tenant, 'x-purpose-id': purpose }
}
async function consulta(query: string, subject = 'sub-a2', tenant = F.tenantA as string, purpose = F.purposeA as string) {
  return app.inject({ method: 'GET', url: `/v1/geography/territory?${query}`, headers: headers(subject, tenant, purpose) })
}

beforeAll(async () => {
  env = await setupTestEnv()
  await seedRegistros(env.owner)
  // Ocho en una vereda, dos en otra y dos históricos sin ubicación rural.
  for (let n = 1; n <= 12; n++) await env.owner.query('update person_records set municipality_code=$1, vereda_code=$2, created_at=$3 where id=$4', ['25035', n <= 8 ? veredas[0]!.code : n <= 10 ? veredas[1]!.code : null, '2026-09-20T12:00:00Z', record(n)])
  await env.owner.query("update person_records set municipality_code='25898' where id=$1", [record(33)])
  // Referente doble: la métrica debe contar receptores únicos, no enlaces.
  for (let n = 3; n <= 8; n++) await env.owner.query('insert into referrals (tenant_id,purpose_id,referrer_record_id,referred_record_id) values ($1,$2,$3,$4)', [F.tenantA, F.purposeA, record(1), record(n)])
  await env.owner.query('insert into referrals (tenant_id,purpose_id,referrer_record_id,referred_record_id) values ($1,$2,$3,$4)', [F.tenantA, F.purposeA, record(2), record(3)])
  // Un segundo tenant y otra finalidad con personas reales para el escenario,
  // pero completamente sintéticas: no alcanza con probar espacios vacíos.
  for (const [tenant, purpose, user] of [[F.tenantB, F.purposeB, F.userB1], [F.tenantA, F.purposeA2, F.userA1]]) {
    const text = await env.owner.query<{ id: string }>("insert into consent_texts (tenant_id,purpose_id,version,body,controller_name) values ($1,$2,'territory-test','Aviso sintético','Fixture') returning id", [tenant, purpose])
    for (let n = 0; n < 5; n++) {
      const row = await env.owner.query<{ id: string }>("insert into person_records (tenant_id,purpose_id,full_name,document_number,municipality_code,captured_by) values ($1,$2,'Persona sintética',$3,'25035',$4) returning id", [tenant, purpose, `territory-${n}`, user])
      await env.owner.query("insert into consent_records (tenant_id,purpose_id,record_id,consent_text_id,evidence_kind,evidence_ref) values ($1,$2,$3,$4,'formulario_papel','fixture')", [tenant, purpose, row.rows[0]!.id, text.rows[0]!.id])
      await env.owner.query("update person_records set status='submitted', version=2 where id=$1", [row.rows[0]!.id])
    }
  }
  Object.assign(process.env, { APP_ENV: 'local', OIDC_PROVIDER: 'fake', OIDC_ALLOWED_HD: 'kaizensolutionscol.com', SESSION_SECRET: 'clave-de-prueba-suficientemente-larga', LLM_PROVIDER: 'fake', EMBEDDINGS_PROVIDER: 'fake' })
  const { buildApp } = await import('../../apps/api/src/app.js')
  const { reiniciarAdmision } = await import('../../apps/api/src/plugins/admission.js')
  app = await buildApp(); await app.ready()
  for (const subject of ['sub-a2', 'sub-a3', 'sub-b1']) {
    reiniciarAdmision()
    const start = await app.inject({ method: 'GET', url: '/auth/start' })
    const state = new URL(start.headers.location as string).searchParams.get('state')!
    const callback = await app.inject({ method: 'GET', url: `/auth/callback?code=${subject}&state=${encodeURIComponent(state)}`, cookies: { kaizen_oauth: start.cookies.find(c => c.name === 'kaizen_oauth')!.value } })
    const session = callback.cookies.find(c => c.name === 'kaizen_session')!
    const csrf = callback.cookies.find(c => c.name === 'kaizen_csrf')!.value
    cookies.set(subject, { cookie: `kaizen_session=${session.value}; kaizen_csrf=${csrf}`, csrf })
  }
  reiniciarAdmision()
}, 120_000)
afterAll(async () => { await app?.close(); await env?.close() })

describe('mapa territorial, permisos y agregados', () => {
  it('exige sesión y analítica, aunque el usuario pueda capturar', async () => {
    expect((await app.inject({ method: 'GET', url: '/v1/geography/territory', headers: { 'x-tenant-id': F.tenantA, 'x-purpose-id': F.purposeA } })).statusCode).toBe(401)
    expect((await consulta('level=province', 'sub-a3')).statusCode).toBe(403)
    expect((await consulta('level=province', 'sub-a2', F.tenantB, F.purposeB)).statusCode).toBe(403)
    expect((await consulta('level=province', 'sub-a2', F.tenantA, F.purposeA2)).statusCode).toBe(403)
  })
  it('separa tenant y finalidad con datos presentes en ambos', async () => {
    const a = await consulta('level=vereda&municipalityCode=25035')
    expect(a.statusCode).toBe(200)
    expect(a.json().total.value).toBe(12)
    const b = await consulta('level=vereda&municipalityCode=25035', 'sub-b1', F.tenantB, F.purposeB)
    expect(b.statusCode).toBe(200)
    expect(b.json().total.value).toBe(5)
    expect(b.json().unassigned.value).toBe(5)
    expect(b.json().rows.every((r: { value: number }) => r.value === 0)).toBe(true)
  })
  it('devuelve las 27 veredas, ceros verdaderos y cifras suprimidas distintas', async () => {
    const r = (await consulta('level=vereda&provinceId=tequendama&municipalityCode=25035')).json()
    expect(r.rows).toHaveLength(27)
    expect(r.rows.find((v: { key: string }) => v.key === veredas[0]!.code)).toMatchObject({ value: 8, suppressed: false })
    expect(r.rows.find((v: { key: string }) => v.key === veredas[1]!.code)).toMatchObject({ value: null, suppressed: true })
    expect(r.unassigned).toMatchObject({ value: null, suppressed: true })
    expect(r.rows.filter((v: { value: number }) => v.value === 0)).toHaveLength(25)
    expect(r.areaCount).toBe(27)
  })
  it('aplica la supresión complementaria cuando un grupo pequeño permitiría una resta', async () => {
    const r = (await consulta('level=municipality&provinceId=sabana_occidente')).json()
    // Zipacón 1 y su complemento Madrid 5: la resta no revela el grupo pequeño.
    expect(r.rows.find((v: { key: string }) => v.key === '25898')).toMatchObject({ value: null, suppressed: true })
    expect(r.rows.find((v: { key: string }) => v.key === '25430')).toMatchObject({ value: null, suppressed: true })
  })
  it('la métrica de referidos cuenta una persona una sola vez', async () => {
    const r = (await consulta('level=vereda&municipalityCode=25035&metric=referrals')).json()
    expect(r.total.value).toBe(6)
    expect(r.rows.find((v: { key: string }) => v.key === veredas[0]!.code).value).toBe(6)
    expect(r.unassigned.value).toBe(0)
  })
  it('filtra por mes de Colombia y rechaza combinaciones y parámetros inválidos', async () => {
    expect((await consulta('level=vereda&municipalityCode=25035&month=2026-09')).json().total.value).toBe(12)
    expect((await consulta('level=vereda&municipalityCode=25035&month=2026-08')).json().total.value).toBe(0)
    for (const q of ['level=vereda', 'municipalityCode=11001', 'level=vereda&provinceId=soacha&municipalityCode=25035', 'level=province&municipalityCode=25035', 'month=2026-13', 'limit=999']) expect((await consulta(q)).statusCode).toBe(400)
  })
  it('el capturador accede al catálogo sin obtener cifras', async () => {
    const r = await app.inject({ method: 'GET', url: '/v1/geography/veredas?municipalityCode=25035', headers: headers('sub-a3') })
    expect(r.statusCode).toBe(200)
    expect(r.json().veredas).toHaveLength(27)
  })
  it('guarda la vereda opcional y rechaza una de otro municipio también en la base', async () => {
    const payload = { idempotencyKey: 'territory-capture-001', fullName: 'Persona sintética rural', documentNumber: 'territory-capture', municipalityCode: '25035', veredaCode: veredas[0]!.code, gender: 'prefiere_no_decir', relationship: 'amistad', usesWhatsapp: false, consentGiven: true, consentTextVersion: CONSENT_TEXT_VERSION, evidenceKind: 'formulario_papel', evidenceRef: 'fixture' }
    const good = await app.inject({ method: 'POST', url: '/v1/capture/records', headers: headers('sub-a3'), payload })
    expect(good.statusCode).toBe(200)
    expect((await env.owner.query('select vereda_code from person_records where id=$1', [good.json().id])).rows[0].vereda_code).toBe(veredas[0]!.code)
    const bad = await app.inject({ method: 'POST', url: '/v1/capture/records', headers: headers('sub-a3'), payload: { ...payload, municipalityCode: '25175' } })
    expect(bad.statusCode).toBe(400)
    await expect(env.owner.query('update person_records set vereda_code=$1 where id=$2', [veredasOf('25175')[0]!.code, record(1)])).rejects.toMatchObject({ code: '23503' })
  })
})
