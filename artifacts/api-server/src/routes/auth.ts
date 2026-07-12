import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, SignupBody } from "@workspace/api-zod";

const router: IRouter = Router();

const AVATAR_COLORS = ["violet", "cyan"];

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, parsed.data.username.toLowerCase()))
    .limit(1);

  if (!user || user.password !== parsed.data.password) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  res.json(user);
});

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid signup body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const username = parsed.data.username.toLowerCase();

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (existing) {
    res.status(400).json({ error: "That username is already taken" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      username,
      password: parsed.data.password,
      displayName: parsed.data.displayName,
      title: "New teammate",
      avatarColor: AVATAR_COLORS[username.length % AVATAR_COLORS.length],
      bio: "",
    })
    .returning();

  if (!user) {
    res.status(500).json({ error: "Failed to create account" });
    return;
  }

  res.status(201).json(user);
});

router.get("/users", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.id);
  res.json(users);
});

export default router;
