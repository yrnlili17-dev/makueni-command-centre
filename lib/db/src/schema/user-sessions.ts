import {
  index,
  json,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const userSessions = pgTable(
  "user_sessions",
  {
    sid: varchar("sid").primaryKey().notNull(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", {
      precision: 6,
      mode: "date",
    }).notNull(),
  },
  (table) => [
    index("IDX_user_sessions_expire").on(table.expire),
  ],
);
