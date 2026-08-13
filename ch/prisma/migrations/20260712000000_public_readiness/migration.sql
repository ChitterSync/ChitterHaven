CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "email" TEXT,
    "roles" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ServerSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServerSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MessageHistory" (
    "id" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "edited" BOOLEAN DEFAULT false,
    "readBy" TEXT,
    CONSTRAINT "MessageHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "ServerSetting_key_key" ON "ServerSetting"("key");
CREATE INDEX IF NOT EXISTS "MessageHistory_room_timestamp_idx" ON "MessageHistory"("room", "timestamp");
