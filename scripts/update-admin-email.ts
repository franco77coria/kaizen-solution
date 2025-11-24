import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🔄 Updating admin user email...')

    const oldEmail = 'kaizensolutions'
    const newEmail = 'kaizensolutions@kaizensolution.com'
    const password = 'kaisen2025'
    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        // Check if old user exists
        const existingUser = await prisma.user.findUnique({
            where: { email: oldEmail }
        })

        if (existingUser) {
            // Delete old user
            await prisma.user.delete({
                where: { email: oldEmail }
            })
            console.log('✅ Deleted old user with invalid email')
        }

        // Check if new user already exists
        const newUserExists = await prisma.user.findUnique({
            where: { email: newEmail }
        })

        if (newUserExists) {
            // Update existing user
            await prisma.user.update({
                where: { email: newEmail },
                data: {
                    password: hashedPassword,
                    role: 'SUPER_ADMIN',
                    isActive: true
                }
            })
            console.log('✅ Updated existing user')
        } else {
            // Create new user with correct email
            const adminUser = await prisma.user.create({
                data: {
                    email: newEmail,
                    name: 'Super Admin',
                    password: hashedPassword,
                    role: 'SUPER_ADMIN',
                    isActive: true,
                },
            })
            console.log('✅ Created new admin user with correct email')
        }

        console.log('📧 Email:', newEmail)
        console.log('🔑 Password:', password)
        console.log('✅ Admin user ready!')
    } catch (error) {
        console.error('❌ Error:', error)
        throw error
    }
}

main()
    .catch((e) => {
        console.error('❌ Error updating admin:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

