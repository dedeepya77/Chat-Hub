import type { Server as HttpServer } from "http";
import { Server as SocketIoServer, type Socket } from "socket.io";
import { logger } from "./logger";

/**
 * Tracks which usernames are currently connected and which sockets belong to
 * each username, so presence stays correct even if one person has multiple
 * tabs open.
 */
const socketsByUsername = new Map<string, Set<string>>();
const usernameBySocketId = new Map<string, string>();
const typingUsernames = new Set<string>();

let io: SocketIoServer | undefined;

function broadcastPresence(): void {
  if (!io) return;
  io.emit("presence:update", { online: Array.from(socketsByUsername.keys()) });
}

function broadcastTyping(): void {
  if (!io) return;
  // Send each connected socket the list of *other* people typing.
  for (const [socketId, username] of usernameBySocketId.entries()) {
    const others = Array.from(typingUsernames).filter((u) => u !== username);
    io.to(socketId).emit("typing:update", { usernames: others });
  }
}

function removeSocket(socket: Socket): void {
  const username = usernameBySocketId.get(socket.id);
  usernameBySocketId.delete(socket.id);

  if (!username) return;

  const sockets = socketsByUsername.get(username);
  if (sockets) {
    sockets.delete(socket.id);
    if (sockets.size === 0) {
      socketsByUsername.delete(username);
      typingUsernames.delete(username);
    }
  }

  broadcastPresence();
  broadcastTyping();
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

    socket.on("typing:start", () => {
      const username = usernameBySocketId.get(socket.id);
      if (!username) return;
      typingUsernames.add(username);
      broadcastTyping();
    });

    socket.on("typing:stop", () => {
      const username = usernameBySocketId.get(socket.id);
      if (!username) return;
      typingUsernames.delete(username);
      broadcastTyping();
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
