/**
 * Verifica que las tablas Pol* estén cerradas a anon/authenticated.
 *
 * Un permiso mal cerrado no avisa: PostgREST devuelve 204 en un UPDATE que no
 * matcheó filas aunque el privilegio siga estando (patrón #36 del CLAUDE.md).
 * Por eso se verifica contra el catálogo y no probando la API.
 *
 *   npx tsx scripts/politica/verificar-privilegios.ts
 */
import { prisma } from '../../lib/prisma'

async function main() {
    const privilegios = await prisma.$queryRaw<
        Array<{ grantee: string; table_name: string; privilege_type: string }>
    >`
        SELECT grantee, table_name, privilege_type
        FROM information_schema.table_privileges
        WHERE table_schema = 'public'
          AND table_name LIKE 'Pol%'
          AND grantee IN ('anon', 'authenticated')
        ORDER BY table_name, grantee
    `

    const rls = await prisma.$queryRaw<Array<{ relname: string; relrowsecurity: boolean }>>`
        SELECT c.relname, c.relrowsecurity
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname LIKE 'Pol%' AND c.relkind = 'r'
        ORDER BY c.relname
    `

    const sinRls = rls.filter((t) => !t.relrowsecurity)

    console.log(`Tablas Pol* encontradas:        ${rls.length}`)
    console.log(`Privilegios de anon/authenticated: ${privilegios.length} (esperado: 0)`)
    console.log(`Tablas sin RLS:                 ${sinRls.length} (esperado: 0)`)

    if (privilegios.length > 0) {
        console.error('\nFALLA — todavía hay privilegios abiertos:')
        for (const p of privilegios) {
            console.error(`  ${p.grantee} → ${p.table_name}.${p.privilege_type}`)
        }
    }
    if (sinRls.length > 0) {
        console.error('\nFALLA — tablas sin RLS:')
        for (const t of sinRls) console.error(`  ${t.relname}`)
    }

    const ok = privilegios.length === 0 && sinRls.length === 0 && rls.length === 14
    console.log(ok ? '\nOK — las tablas están cerradas.' : '\nRevisar lo de arriba.')
    process.exitCode = ok ? 0 : 1
}

main()
    .catch((e) => {
        console.error(e)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
