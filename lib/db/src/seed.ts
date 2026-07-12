import { db, pool } from "./index";
import { usersTable, channelsTable, messagesTable } from "./schema";

/**
 * Seeds a small, realistic team roster, a set of channels, and mock
 * conversation history so the chat app has something to look at on first
 * run. Safe to re-run: it clears the three tables first.
 */

const DEMO_PASSWORD = "pulse123";

const TEAM = [
  {
    username: "amara",
    displayName: "Amara Chen",
    title: "Product Designer",
    avatarColor: "violet",
    bio: "Designs the bits you touch. Coffee-powered, Figma-native.",
  },
  {
    username: "diego",
    displayName: "Diego Alvarez",
    title: "Frontend Engineer",
    avatarColor: "cyan",
    bio: "Ships pixels that don't jiggle. React and cats.",
  },
  {
    username: "priya",
    displayName: "Priya Nair",
    title: "Backend Engineer",
    avatarColor: "violet",
    bio: "Keeps the lights on. Believes in idempotency and naps.",
  },
  {
    username: "jonah",
    displayName: "Jonah Blake",
    title: "Product Manager",
    avatarColor: "cyan",
    bio: "Turns Slack threads into roadmaps. Allergic to scope creep.",
  },
  {
    username: "sofia",
    displayName: "Sofia Rossi",
    title: "QA Lead",
    avatarColor: "violet",
    bio: "Finds the bug before your customers do.",
  },
  {
    username: "malik",
    displayName: "Malik Johnson",
    title: "DevOps Engineer",
    avatarColor: "cyan",
    bio: "If it's on fire, I'm already looking at the dashboard.",
  },
  {
    username: "yuki",
    displayName: "Yuki Tanaka",
    title: "Engineering Manager",
    avatarColor: "violet",
    bio: "Unblocks people for a living. Ex-IC, still writes code sometimes.",
  },
] as const;

const CHANNELS = [
  { slug: "general", name: "general", description: "Team-wide announcements and chat" },
  { slug: "design", name: "design", description: "Design reviews, feedback, and inspiration" },
  { slug: "engineering", name: "engineering", description: "Technical discussion and code reviews" },
  { slug: "random", name: "random", description: "Off-topic banter and memes" },
  { slug: "announcements", name: "announcements", description: "Company-wide updates" },
] as const;

// [channelSlug, username, content, minutesAgo, reactions?, status?]
type Seed = [string, string, string, number, Record<string, string[]>?, string?];

const CONVERSATIONS: Seed[] = [
  ["general", "yuki", "Morning all — standup in 15, same link as always.", 620],
  ["general", "amara", "On it, just grabbing coffee ☕", 615],
  ["general", "diego", "o7", 614, { "🚀": ["amara", "priya"] }],
  ["general", "jonah", "Reminder: sprint review moved to 3pm today, not 2pm.", 480],
  ["general", "sofia", "Noted, updating my calendar now.", 475],
  ["general", "malik", "Deploy to staging is green ✅", 300, { "🎉": ["diego", "yuki", "priya"] }],
  ["general", "priya", "Nice, I'll run the migration check after lunch.", 298],
  ["general", "yuki", "Thanks team, great velocity this week.", 60],

  ["design", "amara", "Pushed the new onboarding flow to Figma, would love eyes on it before EOD.", 500],
  ["design", "diego", "Looking now — love the split-panel login, much cleaner than the old modal.", 480, { "❤️": ["amara"] }],
  ["design", "jonah", "Agreed, this finally feels on-brand. Can we get the violet/cyan gradient into the empty states too?", 470],
  ["design", "amara", "Yep, already sketching that. Will have variants tomorrow.", 460],
  ["design", "sofia", "One nit: the demo account buttons could use a subtle hover state.", 200, { "👍": ["amara", "diego"] }],
  ["design", "amara", "Good catch, fixing now.", 190],

  ["engineering", "priya", "PR up for the reactions endpoint, mind reviewing? #142", 400],
  ["engineering", "diego", "On it. Quick q — are reactions per-message or per-thread?", 390],
  ["engineering", "priya", "Per-message, stored as an emoji -> usernames map.", 385],
  ["engineering", "diego", "Makes sense, approved 👍", 370, { "👍": ["priya"] }],
  ["engineering", "malik", "Heads up, bumping the socket.io server to the latest patch release tonight.", 250],
  ["engineering", "yuki", "Any breaking changes we should watch for?", 245],
  ["engineering", "malik", "Nope, just a reconnect-timing fix.", 240],
  ["engineering", "sofia", "I'll smoke-test presence + typing indicators after the bump.", 235, { "🙏": ["malik"] }],

  ["random", "jonah", "Anyone else's plant dying at their desk or is it just mine", 350],
  ["random", "malik", "It's the fluorescent lighting, plants hate it as much as we do", 345, { "😂": ["jonah", "amara", "sofia"] }],
  ["random", "yuki", "Get a snake plant, they're nearly impossible to kill", 340],
  ["random", "diego", "this is now a plant support group", 330, { "😂": ["jonah", "malik", "priya", "yuki"] }],

  ["announcements", "yuki", "Team all-hands moved to Thursday 10am, calendar invite incoming.", 700],
  ["announcements", "jonah", "We hit 10k active rooms this week 🎉 huge thanks to everyone.", 100, { "🎉": ["amara", "diego", "priya", "sofia", "malik"], "🔥": ["yuki"] }],
];

async function seed() {
  console.log("Seeding database...");

  await db.delete(messagesTable);
  await db.delete(channelsTable);
  await db.delete(usersTable);

  await db.insert(usersTable).values(
    TEAM.map((member) => ({ ...member, password: DEMO_PASSWORD })),
  );

  const insertedChannels = await db
    .insert(channelsTable)
    .values([...CHANNELS])
    .returning();

  const channelIdBySlug = new Map(insertedChannels.map((c) => [c.slug, c.id]));
  const now = Date.now();

  await db.insert(messagesTable).values(
    CONVERSATIONS.map(([slug, username, content, minutesAgo, reactions, status]) => {
      const channelId = channelIdBySlug.get(slug);
      if (!channelId) throw new Error(`Unknown channel slug in seed data: ${slug}`);
      return {
        channelId,
        username,
        content,
        reactions: reactions ?? {},
        status: status ?? "read",
        createdAt: new Date(now - minutesAgo * 60_000),
      };
    }),
  );

  console.log(
    `Seeded ${TEAM.length} users, ${insertedChannels.length} channels, ${CONVERSATIONS.length} messages.`,
  );
  console.log(`Demo login password for every account: "${DEMO_PASSWORD}"`);
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    return pool.end().finally(() => process.exit(1));
  });
