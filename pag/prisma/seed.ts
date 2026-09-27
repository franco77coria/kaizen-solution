import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seed...')

    // Super admin. La contraseña NO va en el código (el repo es público):
    // llega por entorno y solo se usa para crear la cuenta la primera vez.
    const adminEmail = process.env.SEED_ADMIN_EMAIL
    const adminPassword = process.env.SEED_ADMIN_PASSWORD
    if (!adminEmail || !adminPassword || adminPassword.length < 16) {
        throw new Error('Faltan SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD (16 caracteres o más)')
    }
    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    const adminUser = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            name: 'Super Admin',
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            isActive: true,
        },
    })
    console.log('✅ Created Super Admin:', adminUser.email)

    // Create Site Configuration
    const siteConfig = await prisma.siteConfig.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            companyName: 'KAIZEN SOLUTION S.A.S.',
            email: '1133985163f@gmail.com',
            phone: '+57 300 000 0000',
            whatsappNumber: '573000000000',
            whatsappMessage: 'Hola, me gustaría agendar un Diagnóstico de Madurez Digital',
            address: 'Bogotá D.C.',
            city: 'Bogotá',
            country: 'Colombia',
            heroTitle: 'Transformación Digital con Propósito',
            heroSubtitle: 'Soluciones digitales a medida para tu negocio y la gestión pública. Impulsamos la mejora continua, la eficiencia y la adopción inteligente de tecnología.',
            ctaText: 'Agenda tu Diagnóstico de Madurez Digital',
        },
    })
    console.log('✅ Created Site Configuration')

    // Create Strategic Pillars (Services)
    const services = [
        {
            id: 'consultoria-estrategica-en-ti',
            title: 'Consultoría Estratégica en TI',
            description: 'Diseño y estructuración de PETI (Planes Estratégicos de TI), alineación estratégica tecnología-negocio, diagnóstico de madurez digital y asesoría en seguridad y cumplimiento.',
            icon: 'strategy',
            category: 'consulting',
            order: 1,
            features: JSON.stringify(['Diseño de PETI', 'Alineación estratégica', 'Diagnóstico de madurez digital', 'Asesoría en seguridad']),
        },
        {
            id: 'analitica-y-business-intelligence',
            title: 'Analítica y Business Intelligence',
            description: 'Implementación de tableros interactivos y KPIs, visualización en tiempo real del desempeño institucional e identificación de oportunidades de mejora.',
            icon: 'analytics',
            category: 'analytics',
            order: 2,
            features: JSON.stringify(['Tableros interactivos', 'KPIs en tiempo real', 'Análisis de datos', 'Identificación de oportunidades']),
        },
        {
            id: 'adopcion-e-implementacion-tecnologica',
            title: 'Adopción e Implementación Tecnológica',
            description: 'Despliegue de herramientas productivas (Google Workspace, cloud), migración de correo y datos, automatización de procesos colaborativos.',
            icon: 'implementation',
            category: 'implementation',
            order: 3,
            features: JSON.stringify(['Google Workspace', 'Migración a la nube', 'Automatización de procesos', 'Capacitación de equipos']),
        },
    ]

    for (const service of services) {
        await prisma.service.upsert({
            where: { id: service.id },
            update: {},
            create: service,
        })
    }
    console.log('✅ Created Strategic Pillars (Services)')

    // Create Custom Solutions (Projects)
    const projects = [
        {
            id: 'sistema-de-gestion-integral-lubricentro',
            title: 'Sistema de Gestión Integral - Lubricentro',
            description: 'Sistema ERP completo para gestión de ventas, control de stock, órdenes de venta, historial de servicios y gestión de clientes.',
            category: 'ERP/CRM',
            tags: JSON.stringify(['ERP', 'Gestión de Stock', 'CRM', 'Ventas']),
            clientName: 'Lubricentro',
            results: 'Reducción del 40% en tiempo de gestión administrativa',
            order: 1,
        },
        {
            id: 'sistema-de-ordenes-de-trabajo-taller-mecanico',
            title: 'Sistema de Órdenes de Trabajo - Taller Mecánico',
            description: 'Sistema para recepción de vehículos, órdenes de trabajo, cierre de servicios, control de ganancias y emisión de boletas.',
            category: 'Gestión de Servicios',
            tags: JSON.stringify(['Órdenes de Trabajo', 'Gestión', 'Facturación']),
            clientName: 'Taller Mecánico',
            results: 'Mejora del 60% en seguimiento de servicios',
            order: 2,
        },
        {
            id: 'sistema-de-reservacion-y-agendamiento',
            title: 'Sistema de Reservación y Agendamiento',
            description: 'Gestión de citas y turnos en tiempo real con agenda automatizada, respuestas inteligentes y formularios avanzados.',
            category: 'Agendamiento',
            tags: JSON.stringify(['Reservas', 'Turnos', 'Automatización']),
            results: 'Reducción del 70% en llamadas de agendamiento',
            order: 3,
        },
        {
            id: 'e-commerce-personalizado',
            title: 'E-commerce Personalizado',
            description: 'Plataforma de comercio electrónico con seguimiento de inventario automatizado y panel de administración completo.',
            category: 'E-commerce',
            tags: JSON.stringify(['Tienda Online', 'Inventario', 'Pagos']),
            results: 'Aumento del 150% en ventas online',
            order: 4,
        },
    ]

    for (const project of projects) {
        await prisma.project.upsert({
            where: { id: project.id },
            update: {},
            create: project,
        })
    }
    console.log('✅ Created Custom Solutions (Projects)')

    console.log('🎉 Database seeded successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
