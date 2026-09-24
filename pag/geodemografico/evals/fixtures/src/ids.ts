/**
 * Identificadores fijos de los fixtures. Son UUID validos y estables para que
 * las pruebas puedan referirse a ellos sin leerlos de la base, pero NO son
 * secretos ni conceden acceso: todo pasa igual por RLS y por permisos.
 */
export const F = {
  tenantA: '11111111-1111-4111-8111-111111111111',
  tenantB: '22222222-2222-4222-8222-222222222222',

  purposeA: 'aaaa1111-0000-4000-8000-000000000001',
  purposeA2: 'aaaa1111-0000-4000-8000-000000000002',
  purposeB: 'bbbb2222-0000-4000-8000-000000000001',

  corpusA: 'ccccaaaa-0000-4000-8000-000000000001',
  corpusA2: 'ccccaaaa-0000-4000-8000-000000000002',
  corpusB: 'ccccbbbb-0000-4000-8000-000000000001',

  // A1 y A2 comparten las notas de A. A3 pertenece a A pero sin analitica
  // sensible. adminSinLectura administra pero no puede leer notas.
  userA1: 'dddd0001-0000-4000-8000-000000000001',
  userA2: 'dddd0001-0000-4000-8000-000000000002',
  userA3: 'dddd0001-0000-4000-8000-000000000003',
  userAdminSinLectura: 'dddd0001-0000-4000-8000-000000000004',
  userB1: 'dddd0002-0000-4000-8000-000000000001',
  // Cuenta autenticada del mismo dominio, SIN invitacion ni membresia.
  userSinInvitacion: 'dddd0003-0000-4000-8000-000000000001',

  connA: 'eeee0001-0000-4000-8000-000000000001',
  connA2: 'eeee0001-0000-4000-8000-000000000002',
  connB: 'eeee0002-0000-4000-8000-000000000001',

  collectionA: 'ffff0001-0000-4000-8000-000000000001',
  collectionB: 'ffff0002-0000-4000-8000-000000000001',

  // Documentos con TITULOS IGUALES entre A y B, con canarios distintos.
  docAnotas: '0a000001-0000-4000-8000-000000000001',
  docAtranscripcion: '0a000001-0000-4000-8000-000000000002',
  docAvieja: '0a000001-0000-4000-8000-000000000003',
  docArevocada: '0a000001-0000-4000-8000-000000000004',
  docBnotas: '0b000001-0000-4000-8000-000000000001',

  meetingA: '0c000001-0000-4000-8000-000000000001',
  meetingB: '0c000002-0000-4000-8000-000000000001',
} as const

/** Canarios: cadenas unicas que no deben aparecer nunca fuera de su tenant. */
export const CANARIOS = {
  tenantA: 'CANARIO-ALFA-7Q4X',
  tenantB: 'CANARIO-BETA-9Z2M',
  purposeA2: 'CANARIO-ALFA-SEGUNDA-FINALIDAD-5K1P',
} as const
