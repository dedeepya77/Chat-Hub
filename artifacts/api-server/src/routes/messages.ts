import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, messagesTable, type Reactions } from "@workspace/db";
import {
  ListMessagesQueryParams,
  ListMessagesResponse,
  SendMessageBody,
  SendMessageResponse,
  ToggleReactionBody,
  ToggleReactionResponse,
} from "@workspace/api-zod";
import { getChatSocketServer, channelRoom, isAnyoneElseOnline } from "../lib/chatSocket";

const router: IRouter = Router();

router.get("/messages", async (req, res): Promise<void> => {
  const query = ListMessagesQueryParams.safeParse(req.query);
  if (!query.success) {
    req.log.warn({ errors: query.error.message }, "Invalid list messages query");
    res.status(400).json({ error: query.error.message });
    return;
  }

  const limit = query.data.limit ?? 100;

  const rows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.channelId, query.data.channelId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(limit);

  // Return oldest -> newest so the client can render top-to-bottom directly.
  const ordered = rows.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  res.json(ListMessagesResponse.parse(ordered));
});

router.post("/messages", async (req, res): Promise<void> => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid send message body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const status = isAnyoneElseOnline(parsed.data.username) ? "delivered" : "sent";

  const [message] = await db
    .insert(messagesTable)
    .values({ ...parsed.data, status })
    .returning();

  if (!message) {
    res.status(500).json({ error: "Failed to persist message" });
    return;
  }

  const responseBody = SendMessageResponse.parse(message);

  // Broadcast only to clients in the same channel room, including the
  // sender, so all clients render the message the same way from a single
  // source of truth.
  const io = getChatSocketServer();
  io?.to(channelRoom(message.channelId)).emit("message:new", responseBody);

  res.status(201).json(responseBody);
});

router.post("/messages/:id/reactions", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = ToggleReactionBody.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) {
    res.status(400).json({ error: "Invalid reaction request" });
    return;
  }

  const [existing] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const { username, emoji } = parsed.data;
  const reactions: Reactions = { ...existing.reactions };
  const current = new Set(reactions[emoji] ?? []);

  if (current.has(username)) {
    current.delete(username);
  } else {
    current.add(username);
  }

  if (current.size > 0) {
    reactions[emoji] = Array.from(current);
  } else {
    delete reactions[emoji];
  }

  const [updated] = await db
    .update(messagesTable)
    .set({ reactions })
    .where(eq(messagesTable.id, id))
    .returning();

  if (!updated) {
    res.status(500).json({ error: "Failed to update reactions" });
    return;
  }

  const responseBody = ToggleReactionResponse.parse(updated);

  const io = getChatSocketServer();
  io?.to(channelRoom(updated.channelId)).emit("message:updated", responseBody);

  res.json(responseBody);
});

export default router;
