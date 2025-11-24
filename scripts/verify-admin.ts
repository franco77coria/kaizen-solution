import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Verifying admin user...')

    const email = 'kaizensolutions@kaizensolution.com'
    const password = 'kaisen2025'

    try {
        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            console.log('❌ User not found!')
            console.log('Creating user...')
            
            const hashedPassword = await bcrypt.hash(password, 10)
            const newUser = await prisma.user.create({
                data: {
                    email,
                    name: 'Super Admin',
                    password: hashedPassword,
                    role: 'SUPER_ADMIN',
                    isActive: true,
                },
            })
            console.log('✅ User created:', newUser.email)
        } else {
            console.log('✅ User found:')
            console.log('  - Email:', user.email)
            console.log('  - Name:', user.name)
            console.log('  - Role:', user.role)
            console.log('  - Is Active:', user.isActive)
            
            // Test password
            const isValid = await bcrypt.compare(password, user.password)
            console.log('  - Password valid:', isValid)
            
            if (!isValid) {
                console.log('⚠️  Password mismatch! Updating password...')
                const hashedPassword = await bcrypt.hash(password, 10)
                await prisma.user.update({
                    where: { email },
                    data: { password: hashedPassword }
                })
                console.log('✅ Password updated!')
            }
        }

        console.log('\n📋 Login credentials:')
        console.log('  Email:', email)
        console.log('  Password:', password)
    } catch (error) {
        console.error('❌ Error:', error)
        throw error
    }
}

main()
    .catch((e) => {
        console.error('❌ Error verifying admin:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

