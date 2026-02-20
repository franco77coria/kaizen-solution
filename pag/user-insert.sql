-- Crear tabla User (si no existe)
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

-- Usuario Admin principal
INSERT INTO "User" ("id", "email", "name", "password", "role", "isActive", "createdAt", "updatedAt") VALUES ('admin001', 'gerencia@kaizensolutionscol.com', 'Gerencia Kaizen', '$2a$10$74f3v8JB60f3lyIB/oMjPelQjhwPKpirR1nhoWt8/nrnpQqhVyyvC', 'SUPER_ADMIN', true, NOW(), NOW());

-- Usuario de test para Meta
INSERT INTO "User" ("id", "email", "name", "password", "role", "isActive", "createdAt", "updatedAt") VALUES ('test001', 'test@kaizensolutionscol.com', 'Meta Test User', '$2a$10$.tRbWBhUX0Po4FiYAif.Suhl1jIG.xvpuulJP30/c4UZHzhQdoUu2', 'VIEWER', true, NOW(), NOW());