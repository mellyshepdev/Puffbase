import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status", {
    enum: ["healthy", "degraded", "down", "idle"],
  }).notNull(),
  health: integer("health").notNull(),
  requests: integer("requests").notNull(),
  latency: integer("latency").notNull(),
  region: text("region").notNull(),
  url: text("url"),
  createdAt: text("created_at").notNull(),
});

export const insertServiceSchema = createInsertSchema(services, {
  status: z.enum(["healthy", "degraded", "down", "idle"]),
  health: z.number().int().min(0).max(100),
  requests: z.number().int().nonnegative(),
  latency: z.number().int().nonnegative(),
}).omit({ id: true });

export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;

// Table name is "puffbase_deployments", not "deployments" - this CockroachDB
// instance is shared with a separate app (pages/dashboard2) that already has
// its own unrelated "deployments" table (different columns entirely), so
// this app's own table needs a distinct name to avoid colliding with it.
export const deployments = pgTable("puffbase_deployments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status", {
    enum: ["deployed", "pending", "failed", "in-progress"],
  }).notNull(),
  environment: text("environment", {
    enum: ["production", "staging", "development"],
  }).notNull(),
  version: text("version").notNull(),
  serviceId: integer("service_id").references(() => services.id),
  lastDeployed: text("last_deployed").notNull(),
  commitSha: text("commit_sha"),
  duration: integer("duration"),
  // Edge addressing: locator turns subdomain+PUFFBASE_DEPLOY_DOMAIN into
  // Host(`<sub>.<dom>`) -> http://<host-ip>:<port>; url is the computed
  // public address handed back to the user.
  subdomain: text("subdomain"),
  url: text("url"),
  host: text("host"),
  port: integer("port"),
});

export const insertDeploymentSchema = createInsertSchema(deployments, {
  status: z.enum(["deployed", "pending", "failed", "in-progress"]),
  environment: z.enum(["production", "staging", "development"]),
  duration: z.number().int().nonnegative().nullable().optional(),
  subdomain: z
    .string()
    .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/)
    .nullable()
    .optional(),
  port: z.number().int().min(1).max(65535).nullable().optional(),
}).omit({ id: true });

export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deployments.$inferSelect;

export const metrics = pgTable("metrics", {
  id: serial("id").primaryKey(),
  type: text("type", {
    enum: ["api_calls", "revenue", "latency", "errors", "uptime"],
  }).notNull(),
  value: integer("value").notNull(),
  timestamp: text("timestamp").notNull(),
  metadata: text("metadata"),
});

export const insertMetricSchema = createInsertSchema(metrics, {
  type: z.enum(["api_calls", "revenue", "latency", "errors", "uptime"]),
  value: z.number().int(),
}).omit({ id: true });

export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type Metric = typeof metrics.$inferSelect;

export const activity = pgTable("activity", {
  id: serial("id").primaryKey(),
  type: text("type", {
    enum: ["deploy", "scale", "alert", "config", "auth"],
  }).notNull(),
  message: text("message").notNull(),
  severity: text("severity", {
    enum: ["info", "warning", "error", "success"],
  }).notNull(),
  timestamp: text("timestamp").notNull(),
  userId: integer("user_id"),
});

export const insertActivitySchema = createInsertSchema(activity, {
  type: z.enum(["deploy", "scale", "alert", "config", "auth"]),
  severity: z.enum(["info", "warning", "error", "success"]),
}).omit({ id: true });

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activity.$inferSelect;
