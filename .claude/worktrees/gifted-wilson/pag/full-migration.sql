-- 1. Tablas de WhatsApp
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

-- 2. Tabla de Usuarios e Inserción de Datos
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NULL,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'VIEWER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- Aquí está el usuario con el hash específico que mencionaste
INSERT INTO "User" ("id", "email", "name", "password", "role", "isActive", "createdAt", "updatedAt") VALUES ('admin001', 'gerencia@kaizensolutionscol.com', 'Gerencia Kaizen', '$2a$10$74f3v8JB60f3lyIB/oMjPelQjhwPKpirR1nhoWt8/nrnpQqhVyyvC', 'SUPER_ADMIN', true, NOW(), NOW());
INSERT INTO "User" ("id", "email", "name", "password", "role", "isActive", "createdAt", "updatedAt") VALUES ('test001', 'test@kaizensolutionscol.com', 'Meta Test User', '$2a$10$.tRbWBhUX0Po4FiYAif.Suhl1jIG.xvpuulJP30/c4UZHzhQdoUu2', 'VIEWER', true, NOW(), NOW());