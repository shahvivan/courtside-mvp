import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  title: text("title").notNull(),
  sport: text("sport").notNull(),
  venue: text("venue").notNull(),
  starts: text("starts").notNull(),
  capacity: integer("capacity").notNull(),
  description: text("description").notNull(),
  access: text("access").notNull(),
  status: text("status").notNull().default("draft"),
  demo: integer("demo").notNull().default(1),
});
export const rsvps = sqliteTable(
  "rsvps",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    event: text("event").notNull(),
    session: text("session").notNull(),
    role: text("role").notNull(),
    state: text("state").notNull(),
    created: text("created").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_rsvp_identity").on(table.event, table.session, table.role),
    index("idx_rsvp_event_role_state").on(table.event, table.role, table.state),
  ],
);
