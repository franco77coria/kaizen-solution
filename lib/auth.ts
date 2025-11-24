import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        CredentialsProvider({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    console.log("Auth: Missing credentials")
                    return null
                }

                try {
                    console.log("Auth: Attempting login for:", credentials.email)
                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email as string }
                    })

                    if (!user) {
                        console.log("Auth: User not found")
                        return null
                    }

                    if (!user.isActive) {
                        console.log("Auth: User is not active")
                        return null
                    }

                    const isValid = await bcrypt.compare(
                        credentials.password as string,
                        user.password
                    )

                    if (!isValid) {
                        console.log("Auth: Invalid password")
                        return null
                    }

                    console.log("Auth: Login successful for:", user.email)
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                    }
                } catch (error) {
                    console.error("Auth error:", error)
                    return null
                }
            }
        })
    ],
    session: {
        strategy: "jwt"
    },
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id as string
                token.role = user.role as string
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as string
            }
            return session
        }
    }
})
