import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()
const ALGORITHM = "aes-256-gcm"

function getEncryptionKey(): Buffer {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret-key-change-me"
    return crypto.scryptSync(secret, "whatsapp-salt", 32)
}

function decrypt(encryptedText: string): string {
    try {
        const key = getEncryptionKey()
        const [ivHex, authTagHex, encrypted] = encryptedText.split(":")
        const iv = Buffer.from(ivHex, "hex")
        const authTag = Buffer.from(authTagHex, "hex")
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
        decipher.setAuthTag(authTag)
        let decrypted = decipher.update(encrypted, "hex", "utf8")
        decrypted += decipher.final("utf8")
        return decrypted
    } catch (e) {
        return ""
    }
}

async function test() {
    console.log("Fetching config from DB...")
    const config = await prisma.whatsAppConfig.findFirst()
    if (!config) {
        console.log("No config found")
        process.exit(1)
    }

    const token = decrypt(config.apiToken)
    console.log("WABA ID:", config.wabaId)
    console.log("Phone ID:", config.phoneNumberId)
    console.log("Decrypted Token prefix:", token.substring(0, 15) + "...")

    console.log("\nTesting Message Templates fetch...")
    const url = `https://graph.facebook.com/${config.apiVersion}/${config.wabaId}/message_templates?limit=100`

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })

    const data = await response.json()
    console.log("HTTP STATUS:", response.status)
    console.log("RESPONSE DATA:", JSON.stringify(data, null, 2))
}

test().catch(console.error).finally(() => prisma.$disconnect())
