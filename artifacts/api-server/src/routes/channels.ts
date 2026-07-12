import { Router, type IRouter } from "express";
import { db, channelsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/channels", async (_req, res): Promise<void> => {
  const channels = await db
    .select()
    .from(channelsTable)
    .orderBy(channelsTable.id);
  res.json(channels);
});

export default router;
