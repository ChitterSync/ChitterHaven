CREATE TABLE "RealtimeSequence" (
    "id" TEXT NOT NULL,
    "value" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RealtimeSequence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RealtimeEvent" (
    "sequence" BIGINT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityId" TEXT,
    "conversationId" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RealtimeEvent_pkey" PRIMARY KEY ("sequence")
);

CREATE TABLE "RealtimeCursor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "lastSequence" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RealtimeCursor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CallSession" (
    "room" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "initiator" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "eventId" TEXT NOT NULL,
    "eventSequence" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CallSession_pkey" PRIMARY KEY ("room")
);

CREATE TABLE "CallParticipant" (
    "id" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "deafened" BOOLEAN NOT NULL DEFAULT false,
    "videoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "screenSharing" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CallParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PresenceDeviceSession" (
    "socketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL DEFAULT true,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PresenceDeviceSession_pkey" PRIMARY KEY ("socketId")
);

CREATE TABLE "RoomReadState" (
    "id" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadMessageId" TEXT,
    "lastReadAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RoomReadState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageReadReceipt" (
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageReadReceipt_pkey" PRIMARY KEY ("messageId", "userId")
);

CREATE UNIQUE INDEX "RealtimeEvent_eventId_key" ON "RealtimeEvent"("eventId");
CREATE INDEX "RealtimeEvent_conversationId_sequence_idx" ON "RealtimeEvent"("conversationId", "sequence");
CREATE INDEX "RealtimeEvent_createdAt_idx" ON "RealtimeEvent"("createdAt");
CREATE UNIQUE INDEX "RealtimeCursor_userId_clientId_key" ON "RealtimeCursor"("userId", "clientId");
CREATE INDEX "RealtimeCursor_userId_updatedAt_idx" ON "RealtimeCursor"("userId", "updatedAt");
CREATE UNIQUE INDEX "CallParticipant_room_userId_key" ON "CallParticipant"("room", "userId");
CREATE INDEX "CallParticipant_userId_idx" ON "CallParticipant"("userId");
CREATE INDEX "PresenceDeviceSession_userId_connected_lastHeartbeat_idx" ON "PresenceDeviceSession"("userId", "connected", "lastHeartbeat");
CREATE UNIQUE INDEX "RoomReadState_room_userId_key" ON "RoomReadState"("room", "userId");
CREATE INDEX "RoomReadState_userId_unreadCount_idx" ON "RoomReadState"("userId", "unreadCount");
CREATE INDEX "MessageReadReceipt_userId_readAt_idx" ON "MessageReadReceipt"("userId", "readAt");

ALTER TABLE "CallParticipant" ADD CONSTRAINT "CallParticipant_room_fkey" FOREIGN KEY ("room") REFERENCES "CallSession"("room") ON DELETE CASCADE ON UPDATE CASCADE;
