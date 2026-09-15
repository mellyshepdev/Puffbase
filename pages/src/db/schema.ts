import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
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
