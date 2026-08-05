-- ═══════════════════════════════════════════════════════════════════════════
--  Cierre de acceso público a las tablas del tablero de políticas públicas.
--
--  Supabase concede ALL sobre todas las tablas de public a anon y authenticated
--  (`grant all on all tables in schema public`). Sin esto, cualquiera con la
--  anon key —que es pública por diseño, va en el bundle del navegador— podría
--  leer y escribir el plan de desarrollo entero vía PostgREST, sin pasar por
--  la app.
--
--  Estas tablas se tocan únicamente desde el servidor de Next vía Prisma, que
--  conecta como owner. Se les revoca el privilegio y además se activa RLS sin
--  políticas: doble puerta. RLS sin FORCE no alcanza al owner, así que Prisma
--  sigue funcionando.
--
--  Correr con:  npx prisma db execute --file supabase/politica-privilegios.sql
--  Verificar:   information_schema.table_privileges con grantee='anon' → 0 filas
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
  tablas text[] := array[
    'PolMunicipio', 'PolPolitica', 'PolEje', 'PolLinea', 'PolDependencia',
    'PolIndicador', 'PolIndicadorMeta', 'PolActividad', 'PolActividadPolitica',
    'PolAvance', 'PolEvidencia', 'PolUsuario', 'PolPermiso', 'PolAuditoria'
  ];
begin
  foreach t in array tablas loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
