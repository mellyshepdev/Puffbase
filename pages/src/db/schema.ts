import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";

export const repositories = pgTable("repositories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  language: varchar("language", { length: 50 }),
  visibility: varchar("visibility", { length: 20 }).default("public").notNull(),
  stars: integer("stars").default(0).notNull(),
  forks: integer("forks").default(0).notNull(),
  defaultBranch: varchar("default_branch", { length: 100 }).default("main").notNull(),
  lastCommitMessage: text("last_commit_message"),
  lastCommitAt: timestamp("last_commit_at"),
  /** Owning account - null on pre-account seed rows. */
  accountId: uuid("account_id"),
  isFavorite: boolean("is_favorite").default(false).notNull(),
  ciEnabled: boolean("ci_enabled").default(false).notNull(),
  sastEnabled: boolean("sast_enabled").default(false).notNull(),
  secretScanEnabled: boolean("secret_scan_enabled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  repoId: integer("repo_id").references(() => repositories.id).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  body: text("body"),
  status: varchar("status", { length: 20 }).default("open").notNull(),
  priority: varchar("priority", { length: 20 }).default("medium").notNull(),
  assignee: varchar("assignee", { length: 255 }),
  labels: jsonb("labels").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pipelines = pgTable("pipelines", {
  id: serial("id").primaryKey(),
  repoId: integer("repo_id").references(() => repositories.id).notNull(),
  branch: varchar("branch", { length: 255 }).notNull(),
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  stage: varchar("stage", { length: 50 }).default("build").notNull(),
  commitSha: varchar("commit_sha", { length: 40 }),
  commitMessage: text("commit_message"),
  duration: integer("duration"),
  logs: text("logs"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  repoId: integer("repo_id").references(() => repositories.id).notNull(),
  environment: varchar("environment", { length: 50 }).default("production").notNull(),
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  url: varchar("url", { length: 500 }),
  domain: varchar("domain", { length: 255 }),
  branch: varchar("branch", { length: 255 }),
  commitSha: varchar("commit_sha", { length: 40 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// A Keycloak user (userSub) can own a personal account plus any number of
// business accounts. The active one rides in the session cookie
// (SessionUser.accountId) - switching accounts re-signs it.
export const accounts = pgTable("accounts", {
  // uuid, not serial: crdb SERIAL is int8/unique_rowid() which overflows
  // JS numbers and breaks id round-trips through JSON.
  id: uuid("id").primaryKey().defaultRandom(),
  userSub: varchar("user_sub", { length: 255 }).notNull(),
  kind: varchar("kind", { length: 20 }).default("personal").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  // "sheep-N" id, an http(s) avatar URL (e.g. synced from the BlackSheep
  // account), or a data: URL from an uploaded image. Text, not varchar:
  // data URLs blow past any sane length cap.
  avatar: text("avatar").default("sheep-1").notNull(),
  businessUrl: varchar("business_url", { length: 500 }),
  // Membership tier: "free" | "pro-monthly" | "pro-yearly" | "business".
  // stripeCustomerId = card on file (Checkout setup mode); invoicing rides
  // the platform's Lago pipeline, same as builder projects.
  plan: varchar("plan", { length: 20 }).default("free").notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 80 }),
  // GitLab-style "set status" - an emoji + short line shown in the user menu.
  statusEmoji: varchar("status_emoji", { length: 8 }),
  statusText: varchar("status_text", { length: 120 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Third-party integrations (GitHub, GitLab, Linear, Notion) per account.
// tokenEnc is AES-256-GCM with the SESSION_SECRET key - never returned by
// the API, only decrypted server-side when calling the provider.
export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull(),
  provider: varchar("provider", { length: 20 }).notNull(),
  tokenEnc: text("token_enc").notNull(),
  externalName: varchar("external_name", { length: 255 }),
  meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// SSH public keys for git-over-ssh access. Keys belong to the Keycloak user
// (userSub), not an account - the same identity clones across workspaces.
export const sshKeys = pgTable("ssh_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userSub: varchar("user_sub", { length: 255 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  publicKey: text("public_key").notNull(),
  // SHA256:<base64> fingerprint, shown in the list instead of the full key.
  fingerprint: varchar("fingerprint", { length: 80 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Groups = teams inside an account (business accounts especially).
export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
