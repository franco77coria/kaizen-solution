import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🔐 Creating admin user...')

    const email = 'kaizensolutions'
    const password = 'kaisen2025'
    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            // Update password
            await prisma.user.update({
                where: { email },
                data: {
                    password: hashedPassword,
                    role: 'SUPER_ADMIN',
                    isActive: true
                }
            })
            console.log('✅ Updated existing user password')
        } else {
            // Create new user
            const adminUser = await prisma.user.create({
                data: {
                    email,
                    name: 'Super Admin',
                    password: hashedPassword,
                    role: 'SUPER_ADMIN',
                    isActive: true,
                },
            })
            console.log('✅ Created new admin user:', adminUser.email)
        }

        console.log('📧 Email:', email)
        console.log('🔑 Password:', password)
        console.log('✅ Admin user ready!')
    } catch (error) {
        console.error('❌ Error:', error)
        throw error
    }
}

main()
    .catch((e) => {
        console.error('❌ Error creating admin:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

