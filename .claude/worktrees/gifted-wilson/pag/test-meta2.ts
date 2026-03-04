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
    const config = await prisma.whatsAppConfig.findFirst()
    if (!config) return

    const token = decrypt(config.apiToken)

    console.log("Checking Token permissions / validity...")
    // Hacemos una llamada GET al WABA ID directamente para ver si tenemos permiso de leectura básica
    const getWabaUrl = `https://graph.facebook.com/${config.apiVersion}/${config.wabaId}`
    const wabaResponse = await fetch(getWabaUrl, {
        headers: { Authorization: `Bearer ${token}` }
    })
    const wabaData = await wabaResponse.json()
    console.log("WABA READ TEST:", wabaResponse.status, JSON.stringify(wabaData))


    console.log("\nChecking App ID from the Token itself (debug_token) ...")
    // Truco: Al llamar a /me con el token, devuelve los datos del system user o la app vinculada
    const getMeUrl = `https://graph.facebook.com/${config.apiVersion}/me`
    const meResponse = await fetch(getMeUrl, {
        headers: { Authorization: `Bearer ${token}` }
    })
    const meData = await meResponse.json()
    console.log("ME SCOPE TEST:", meResponse.status, JSON.stringify(meData))
}

test().catch(console.error).finally(() => prisma.$disconnect())
