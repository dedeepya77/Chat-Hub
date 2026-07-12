import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// NOTE: passwords are stored in plain text on purpose. This app uses a small,
// fixed roster of demo accounts (see the seed script) so people can log in
// and try the real-time features quickly — it is not meant to be a
// production auth system. Don't reuse this pattern for real user data.
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  password: varchar("password", { length: 128 }).notNull(),
  displayName: varchar("display_name", { length: 64 }).notNull(),
  title: varchar("title", { length: 96 }).notNull().default(""),
  avatarColor: varchar("avatar_color", { length: 16 }).notNull().default("violet"),
  bio: text("bio").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
