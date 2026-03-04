CREATE TABLE IF NOT EXISTS "WhatsAppConfig" (
  "id" TEXT NOT NULL,
  "apiToken" TEXT NOT NULL,
  "phoneNumberId" TEXT NOT NULL,
  "wabaId" TEXT NULL,
  "verifyToken" TEXT NOT NULL DEFAULT 'kaizen_whatsapp_2026',
  "apiVersion" TEXT NOT NULL DEFAULT 'v21.0',
  "isConfigured" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WhatsAppMessage" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NULL,
  "direction" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "contactName" TEXT NULL,
  "content" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'text',
  "status" TEXT NOT NULL DEFAULT 'sent',
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppMessage_messageId_key" ON "WhatsAppMessage"("messageId");
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_phone_idx" ON "WhatsAppMessage"("phone");
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_direction_idx" ON "WhatsAppMessage"("direction");
CREATE INDEX IF NOT EXISTS "WhatsAppMessage_timestamp_idx" ON "WhatsAppMessage"("timestamp");

CREATE TABLE IF NOT EXISTS "WhatsAppContact" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT NULL,
  "lastMessageAt" TIMESTAMP(3) NULL,
  "totalMessages" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppContact_phone_key" ON "WhatsAppContact"("phone");

CREATE TABLE IF NOT EXISTS "WhatsAppLog" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
