import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import AdminSessionProvider from './session-provider'

/**
 * Guarda server-side de /admin.
 *
 * Antes esto era solo un componente cliente y toda la protección de /admin
 * dependía del middleware. Eso es un punto único de falla: CVE-2025-29927
 * permite saltear el middleware de Next con un header, y las páginas de admin
 * solo redirigen desde el cliente (cuando el HTML con los datos ya se envió).
 *
 * Verificar la sesión acá corta el render del lado del servidor, sin depender
 * del middleware.
 */
export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session?.user) {
        redirect('/login')
    }

    const role = (session.user as { role?: string }).role
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        redirect('/login')
    }

    return <AdminSessionProvider>{children}</AdminSessionProvider>
}
