import type { Server as HttpServer } from "http";
import { Server as SocketIoServer, type Socket } from "socket.io";
import { eq } from "drizzle-orm";
import { db, messagesTable } from "@workspace/db";
import { logger } from "./logger";

/**
 * Tracks which usernames are currently connected and which sockets belong to
 * each username, so presence stays correct even if one person has multiple
 * tabs open. Typing state and "active channel" are tracked per channel so
 * they only broadcast to people looking at the same room.
 */
const socketsByUsername = new Map<string, Set<string>>();
const usernameBySocketId = new Map<string, string>();
const channelBySocketId = new Map<string, number>();
const typingByChannel = new Map<number, Set<string>>();

let io: SocketIoServer | undefined;

export function channelRoom(channelId: number): string {
  return `channel:${channelId}`;
}

function broadcastPresence(): void {
  if (!io) return;
  io.emit("presence:update", { online: Array.from(socketsByUsername.keys()) });
}

function broadcastTyping(channelId: number): void {
  if (!io) return;
  const typing = typingByChannel.get(channelId);
  io.to(channelRoom(channelId)).emit("typing:update", {
    channelId,
    usernames: typing ? Array.from(typing) : [],
  });
}

function removeSocket(socket: Socket): void {
  const username = usernameBySocketId.get(socket.id);
  const channelId = channelBySocketId.get(socket.id);
  usernameBySocketId.delete(socket.id);
  channelBySocketId.delete(socket.id);

  if (username) {
    const sockets = socketsByUsername.get(username);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        socketsByUsername.delete(username);
      }
    }
  }

  if (username && channelId !== undefined) {
    const typing = typingByChannel.get(channelId);
    if (typing?.delete(username)) broadcastTyping(channelId);
  }

  broadcastPresence();
}

export function isAnyoneElseOnline(exceptUsername: string): boolean {
  for (const username of socketsByUsername.keys()) {
    if (username !== exceptUsername) return true;
  }
  return false;
}

export function initChatSocket(httpServer: HttpServer): SocketIoServer {
  io = new SocketIoServer(httpServer, {
    path: "/api/socket.io/",
    cors: { origin: "*" },
  });

  io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    socket.on("identify", (payload: unknown) => {
      const username =
        typeof payload === "object" &&
        payload !== null &&
        "username" in payload &&
        typeof (payload as { username: unknown }).username === "string"
          ? (payload as { username: string }).username.trim().slice(0, 32)
          : "";

      if (!username) {
        logger.warn({ socketId: socket.id }, "Invalid identify payload");
        return;
      }

      // If this socket previously identified as someone else, clean that up first.
      removeSocket(socket);

      usernameBySocketId.set(socket.id, username);
      const sockets = socketsByUsername.get(username) ?? new Set<string>();
      sockets.add(socket.id);
      socketsByUsername.set(username, sockets);

      broadcastPresence();
    });

    socket.on("channel:join", (payload: unknown) => {
      const channelId =
        typeof payload === "object" &&
        payload !== null &&
        "channelId" in payload &&
        typeof (payload as { channelId: unknown }).channelId === "number"
          ? (payload as { channelId: number }).channelId
          : undefined;

      if (channelId === undefined) return;

      const prevChannelId = channelBySocketId.get(socket.id);
      if (prevChannelId !== undefined) {
        socket.leave(channelRoom(prevChannelId));
        const username = usernameBySocketId.get(socket.id);
        const typing = typingByChannel.get(prevChannelId);
        if (username && typing?.delete(username)) broadcastTyping(prevChannelId);
      }

      socket.join(channelRoom(channelId));
      channelBySocketId.set(socket.id, channelId);
    });

    socket.on("typing:start", () => {
      const username = usernameBySocketId.get(socket.id);
      const channelId = channelBySocketId.get(socket.id);
      if (!username || channelId === undefined) return;
      const typing = typingByChannel.get(channelId) ?? new Set<string>();
      typing.add(username);
      typingByChannel.set(channelId, typing);
      broadcastTyping(channelId);
    });

    socket.on("typing:stop", () => {
      const username = usernameBySocketId.get(socket.id);
      const channelId = channelBySocketId.get(socket.id);
      if (!username || channelId === undefined) return;
      const typing = typingByChannel.get(channelId);
      if (typing?.delete(username)) broadcastTyping(channelId);
    });

    socket.on("message:read", async (payload: unknown) => {
      const ids =
        typeof payload === "object" &&
        payload !== null &&
        "messageIds" in payload &&
        Array.isArray((payload as { messageIds: unknown }).messageIds)
          ? ((payload as { messageIds: unknown[] }).messageIds.filter(
              (id): id is number => typeof id === "number",
            ))
          : [];

      const channelId = channelBySocketId.get(socket.id);
      if (!io || channelId === undefined || ids.length === 0) return;

      for (const id of ids) {
        const [updated] = await db
          .update(messagesTable)
          .set({ status: "read" })
          .where(eq(messagesTable.id, id))
          .returning();
        if (updated) {
          io.to(channelRoom(channelId)).emit("message:updated", updated);
        }
      }
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket disconnected");
      removeSocket(socket);
    });

    socket.on("error", (err: unknown) => {
      logger.error({ err, socketId: socket.id }, "Socket error");
    });
  });

  return io;
}

export function getChatSocketServer(): SocketIoServer | undefined {
  return io;
}
