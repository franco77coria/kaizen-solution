'use client'

import { SessionProvider } from 'next-auth/react'

/**
 * SessionProvider aislado en su propio componente cliente para que el layout
 * de /admin pueda ser un Server Component y validar la sesión antes de
 * renderizar nada.
 */
export default function AdminSessionProvider({
    children,
}: {
    children: React.ReactNode
}) {
    return <SessionProvider>{children}</SessionProvider>
}
