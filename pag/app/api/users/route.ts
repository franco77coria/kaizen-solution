import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(users)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching users' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, name, password, role } = body

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                role: role || 'ADMIN',
                isActive: true,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
            }
        })

        return NextResponse.json(user)
    } catch (error) {
        return NextResponse.json({ error: 'Error creating user' }, { status: 500 })
    }
}
