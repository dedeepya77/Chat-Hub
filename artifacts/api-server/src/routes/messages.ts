import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, messagesTable } from "@workspace/db";
import {
  ListMessagesQueryParams,
  ListMessagesResponse,
  SendMessageBody,
  SendMessageResponse,
} from "@workspace/api-zod";
import { getChatSocketServer } from "../lib/chatSocket";

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

  const [message] = await db
    .insert(messagesTable)
    .values(parsed.data)
    .returning();

  if (!message) {
    res.status(500).json({ error: "Failed to persist message" });
    return;
  }

  const responseBody = SendMessageResponse.parse(message);

  // Broadcast to every connected client (including the sender) over Socket.io
  // so all clients render the message the same way, from the same source of truth.
  const io = getChatSocketServer();
  io?.emit("message:new", responseBody);

  res.status(201).json(responseBody);
});

export default router;
