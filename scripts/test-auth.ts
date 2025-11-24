import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Testing authentication setup...\n')

    const email = 'kaizensolutions@kaizensolution.com'
    const password = 'kaisen2025'

    try {
        // Test database connection
        console.log('1. Testing database connection...')
        await prisma.$connect()
        console.log('   ✅ Database connected\n')

        // Check if user exists
        console.log('2. Checking user...')
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            console.log('   ❌ User not found!')
            console.log('   Creating user...')
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
            console.log('   ✅ User created:', newUser.email)
        } else {
            console.log('   ✅ User found:', user.email)
            console.log('   - ID:', user.id)
            console.log('   - Name:', user.name)
            console.log('   - Role:', user.role)
            console.log('   - Is Active:', user.isActive)
        }

        // Test password
        console.log('\n3. Testing password...')
        if (user) {
            const isValid = await bcrypt.compare(password, user.password)
            if (isValid) {
                console.log('   ✅ Password is valid')
            } else {
                console.log('   ❌ Password is invalid!')
                console.log('   Updating password...')
                const hashedPassword = await bcrypt.hash(password, 10)
                await prisma.user.update({
                    where: { email },
                    data: { password: hashedPassword }
                })
                console.log('   ✅ Password updated')
            }
        }

        // List all users
        console.log('\n4. All users in database:')
        const allUsers = await prisma.user.findMany({
            select: {
                email: true,
                name: true,
                role: true,
                isActive: true
            }
        })
        allUsers.forEach(u => {
            console.log(`   - ${u.email} (${u.role}) - Active: ${u.isActive}`)
        })

        console.log('\n✅ Authentication test completed!')
        console.log('\n📋 Login credentials:')
        console.log('   Email:', email)
        console.log('   Password:', password)

    } catch (error: any) {
        console.error('\n❌ Error:', error.message)
        if (error.code) {
            console.error('   Error code:', error.code)
        }
        throw error
    }
}

main()
    .catch((e) => {
        console.error('\n❌ Test failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

