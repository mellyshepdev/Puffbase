import {
  activity,
  deployments,
  metrics,
  services,
  users,
} from "@shared/schema";
import type {
  Activity,
  Deployment,
  InsertActivity,
  InsertDeployment,
  InsertMetric,
  InsertService,
  InsertUser,
  Metric,
  Service,
  User,
} from "@shared/schema";
import Database from "better-sqlite3";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite);

export type DeploymentStatus =
  | "deployed"
  | "pending"
  | "failed"
  | "in-progress";
export type DeploymentEnvironment =
  | "production"
  | "staging"
  | "development";
export type MetricType =
  | "api_calls"
  | "revenue"
  | "latency"
  | "errors"
  | "uptime";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  listDeployments(environment?: DeploymentEnvironment): Promise<Deployment[]>;
  getDeployment(id: number): Promise<Deployment | undefined>;
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  updateDeploymentStatus(
    id: number,
    status: DeploymentStatus,
  ): Promise<Deployment | undefined>;
  deleteDeployment(id: number): Promise<boolean>;

  listServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(
    id: number,
    service: Partial<InsertService>,
  ): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;

  listMetrics(
    type?: MetricType,
    startDate?: string,
    endDate?: string,
  ): Promise<Metric[]>;
  createMetric(metric: InsertMetric): Promise<Metric>;

  listActivity(limit?: number): Promise<Activity[]>;
  createActivity(entry: InsertActivity): Promise<Activity>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return db.insert(users).values(insertUser).returning().get();
  }

  async listDeployments(
    environment?: DeploymentEnvironment,
  ): Promise<Deployment[]> {
    if (environment) {
      return db
        .select()
        .from(deployments)
        .where(eq(deployments.environment, environment))
        .orderBy(desc(deployments.lastDeployed))
        .all();
    }

    return db
      .select()
      .from(deployments)
      .orderBy(desc(deployments.lastDeployed))
      .all();
  }

  async getDeployment(id: number): Promise<Deployment | undefined> {
    return db
      .select()
      .from(deployments)
      .where(eq(deployments.id, id))
      .get();
  }

  async createDeployment(
    deployment: InsertDeployment,
  ): Promise<Deployment> {
    return db.insert(deployments).values(deployment).returning().get();
  }

  async updateDeploymentStatus(
    id: number,
    status: DeploymentStatus,
  ): Promise<Deployment | undefined> {
    return db
      .update(deployments)
      .set({ status })
      .where(eq(deployments.id, id))
      .returning()
      .get();
  }

  async deleteDeployment(id: number): Promise<boolean> {
    return db
      .delete(deployments)
      .where(eq(deployments.id, id))
      .run().changes > 0;
  }

  async listServices(): Promise<Service[]> {
    return db.select().from(services).orderBy(services.name).all();
  }

  async getService(id: number): Promise<Service | undefined> {
    return db.select().from(services).where(eq(services.id, id)).get();
  }

  async createService(service: InsertService): Promise<Service> {
    return db.insert(services).values(service).returning().get();
  }

  async updateService(
    id: number,
    service: Partial<InsertService>,
  ): Promise<Service | undefined> {
    return db
      .update(services)
      .set(service)
      .where(eq(services.id, id))
      .returning()
      .get();
  }

  async deleteService(id: number): Promise<boolean> {
    return db.delete(services).where(eq(services.id, id)).run().changes > 0;
  }

  async listMetrics(
    type?: MetricType,
    startDate?: string,
    endDate?: string,
  ): Promise<Metric[]> {
    const conditions: SQL[] = [];
    if (type) conditions.push(eq(metrics.type, type));
    if (startDate) conditions.push(gte(metrics.timestamp, startDate));
    if (endDate) conditions.push(lte(metrics.timestamp, endDate));

    if (conditions.length > 0) {
      return db
        .select()
        .from(metrics)
        .where(and(...conditions))
        .orderBy(metrics.timestamp)
        .all();
    }

    return db.select().from(metrics).orderBy(metrics.timestamp).all();
  }

  async createMetric(metric: InsertMetric): Promise<Metric> {
    return db.insert(metrics).values(metric).returning().get();
  }

  async listActivity(limit = 12): Promise<Activity[]> {
    return db
      .select()
      .from(activity)
      .orderBy(desc(activity.timestamp))
      .limit(limit)
      .all();
  }

  async createActivity(entry: InsertActivity): Promise<Activity> {
    return db.insert(activity).values(entry).returning().get();
  }
}

function initializeDatabase(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down', 'idle')),
      health INTEGER NOT NULL CHECK (health BETWEEN 0 AND 100),
      requests INTEGER NOT NULL,
      latency INTEGER NOT NULL,
      region TEXT NOT NULL,
      url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deployments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('deployed', 'pending', 'failed', 'in-progress')),
      environment TEXT NOT NULL CHECK (environment IN ('production', 'staging', 'development')),
      version TEXT NOT NULL,
      service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
      last_deployed TEXT NOT NULL,
      commit_sha TEXT,
      duration INTEGER
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('api_calls', 'revenue', 'latency', 'errors', 'uptime')),
      value INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('deploy', 'scale', 'alert', 'config', 'auth')),
      message TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'success')),
      timestamp TEXT NOT NULL,
      user_id INTEGER
    );

    CREATE INDEX IF NOT EXISTS deployments_environment_idx
      ON deployments(environment);
    CREATE INDEX IF NOT EXISTS metrics_type_timestamp_idx
      ON metrics(type, timestamp);
    CREATE INDEX IF NOT EXISTS activity_timestamp_idx
      ON activity(timestamp);
  `);
}

function isoDaysAgo(days: number, additionalHoursAgo = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(date.getUTCHours() - additionalHoursAgo);
  return date.toISOString();
}

export function seedDatabase(): void {
  const serviceCount = db
    .select({ id: services.id })
    .from(services)
    .limit(1)
    .get();

  if (!serviceCount) {
    const sampleServices: InsertService[] = [
      {
        name: "api-gateway",
        status: "healthy",
        health: 99,
        requests: 184_320,
        latency: 42,
        region: "us-east-1",
        url: "https://api.puffbase.dev",
        createdAt: isoDaysAgo(420),
      },
      {
        name: "auth-service",
        status: "healthy",
        health: 100,
        requests: 92_450,
        latency: 31,
        region: "us-east-1",
        url: "https://auth.puffbase.dev",
        createdAt: isoDaysAgo(395),
      },
      {
        name: "billing-api",
        status: "degraded",
        health: 91,
        requests: 28_730,
        latency: 186,
        region: "us-west-2",
        url: "https://billing.puffbase.dev",
        createdAt: isoDaysAgo(350),
      },
      {
        name: "user-service",
        status: "healthy",
        health: 98,
        requests: 76_210,
        latency: 58,
        region: "eu-west-1",
        url: "https://users.puffbase.dev",
        createdAt: isoDaysAgo(330),
      },
      {
        name: "worker-queue",
        status: "healthy",
        health: 97,
        requests: 51_980,
        latency: 74,
        region: "us-east-1",
        url: null,
        createdAt: isoDaysAgo(280),
      },
      {
        name: "notification-service",
        status: "idle",
        health: 100,
        requests: 12_640,
        latency: 89,
        region: "eu-central-1",
        url: "https://notify.puffbase.dev",
        createdAt: isoDaysAgo(240),
      },
      {
        name: "analytics-engine",
        status: "healthy",
        health: 96,
        requests: 44_890,
        latency: 112,
        region: "us-west-2",
        url: null,
        createdAt: isoDaysAgo(210),
      },
      {
        name: "storage-proxy",
        status: "healthy",
        health: 99,
        requests: 61_300,
        latency: 47,
        region: "ap-southeast-1",
        url: "https://storage.puffbase.dev",
        createdAt: isoDaysAgo(170),
      },
      {
        name: "webhooks-service",
        status: "down",
        health: 42,
        requests: 8_920,
        latency: 410,
        region: "us-east-2",
        url: "https://hooks.puffbase.dev",
        createdAt: isoDaysAgo(120),
      },
    ];

    db.insert(services).values(sampleServices).run();
  }

  const deploymentCount = db
    .select({ id: deployments.id })
    .from(deployments)
    .limit(1)
    .get();

  if (!deploymentCount) {
    const serviceIds = new Map(
      db
        .select({ id: services.id, name: services.name })
        .from(services)
        .all()
        .map((service) => [service.name, service.id]),
    );
    const sampleDeployments: InsertDeployment[] = [
      ["api-gateway", "deployed", "production", "v3.14.2", 1, 0, "f8a91c2", 142],
      ["auth-service", "deployed", "production", "v2.8.0", 2, 1, "b172d4e", 96],
      ["billing-api", "failed", "staging", "v1.19.1", 3, 1, "9da310f", 73],
      ["user-service", "deployed", "production", "v4.6.3", 4, 2, "1e7bd52", 181],
      ["worker-queue", "in-progress", "staging", "v2.2.0", 5, 2, "02ca8be", null],
      ["notification-service", "pending", "development", "v1.12.4", 6, 3, "ac62e19", null],
      ["analytics-engine", "deployed", "production", "v5.1.0", 7, 4, "663bd90", 238],
      ["storage-proxy", "deployed", "production", "v2.7.5", 8, 5, "e07d183", 116],
      ["webhooks-service", "failed", "production", "v1.4.7", 9, 6, "4f891ab", 54],
      ["api-gateway", "deployed", "staging", "v3.14.1", 1, 7, "331daca", 129],
      ["billing-api", "deployed", "production", "v1.18.9", 3, 8, "7c4ee21", 164],
      ["auth-service", "deployed", "staging", "v2.7.9", 2, 10, "a36dd80", 91],
      ["user-service", "deployed", "development", "v4.6.2", 4, 12, "de8c441", 153],
      ["worker-queue", "deployed", "production", "v2.1.8", 5, 14, "095bd61", 207],
      ["notification-service", "deployed", "production", "v1.12.3", 6, 16, "74adf09", 108],
      ["analytics-engine", "deployed", "staging", "v5.0.8", 7, 18, "bc4039e", 226],
      ["storage-proxy", "deployed", "staging", "v2.7.4", 8, 21, "5371faf", 119],
      ["webhooks-service", "deployed", "development", "v1.4.6", 9, 25, "c6388b0", 82],
    ].map(
      ([name, status, environment, version, _serviceId, days, commitSha, duration]) => ({
        name: name as string,
        status: status as DeploymentStatus,
        environment: environment as DeploymentEnvironment,
        version: version as string,
        serviceId: serviceIds.get(name as string) ?? null,
        lastDeployed: isoDaysAgo(days as number, 16),
        commitSha: commitSha as string,
        duration: duration as number | null,
      }),
    );

    db.insert(deployments).values(sampleDeployments).run();
  }

  const metricCount = db
    .select({ id: metrics.id })
    .from(metrics)
    .limit(1)
    .get();

  if (!metricCount) {
    const sampleMetrics: InsertMetric[] = [];
    for (let daysAgo = 29; daysAgo >= 0; daysAgo -= 1) {
      const dayIndex = 29 - daysAgo;
      const weekendFactor = [0, 6].includes(
        new Date(isoDaysAgo(daysAgo)).getUTCDay(),
      )
        ? 0.76
        : 1;
      const timestamp = isoDaysAgo(daysAgo);
      const apiCalls = Math.round(
        (455_000 + dayIndex * 7_250 + (dayIndex % 5) * 8_100) *
          weekendFactor,
      );
      const revenue = Math.round(
        (15_800 + dayIndex * 265 + (dayIndex % 4) * 190) * weekendFactor,
      );
      const latency = 68 + ((dayIndex * 7) % 23);
      const errors = 310 + ((dayIndex * 53) % 280);
      const uptimeBasisPoints =
        dayIndex === 17 ? 9_942 : 9_975 + ((dayIndex * 3) % 24);

      sampleMetrics.push(
        {
          type: "api_calls",
          value: apiCalls,
          timestamp,
          metadata: JSON.stringify({ unit: "requests", period: "daily" }),
        },
        {
          type: "revenue",
          value: revenue,
          timestamp,
          metadata: JSON.stringify({ currency: "USD", unit: "cents" }),
        },
        {
          type: "latency",
          value: latency,
          timestamp,
          metadata: JSON.stringify({ unit: "ms", percentile: "average" }),
        },
        {
          type: "errors",
          value: errors,
          timestamp,
          metadata: JSON.stringify({ unit: "events", period: "daily" }),
        },
        {
          type: "uptime",
          value: uptimeBasisPoints,
          timestamp,
          metadata: JSON.stringify({ unit: "basis_points" }),
        },
      );
    }
    db.insert(metrics).values(sampleMetrics).run();
  }

  const activityCount = db
    .select({ id: activity.id })
    .from(activity)
    .limit(1)
    .get();

  if (!activityCount) {
    const sampleActivity: InsertActivity[] = [
      ["deploy", "api-gateway v3.14.2 deployed to production", "success", 0, 1],
      ["alert", "webhooks-service health dropped below 50%", "error", 0, 2],
      ["scale", "worker-queue scaled from 6 to 10 instances", "info", 1, 1],
      ["deploy", "billing-api staging deployment failed", "error", 1, 3],
      ["auth", "New production API key created", "warning", 2, 2],
      ["config", "Rate limit increased to 2,000 requests/minute", "info", 3, 1],
      ["deploy", "user-service v4.6.3 deployed to production", "success", 4, 4],
      ["alert", "Billing latency exceeded 180ms threshold", "warning", 5, null],
      ["scale", "analytics-engine autoscaling policy updated", "info", 6, 3],
      ["config", "Custom domain certificate renewed", "success", 8, 1],
      ["auth", "Suspicious login attempt blocked", "warning", 9, null],
      ["deploy", "storage-proxy v2.7.5 deployed to production", "success", 11, 2],
      ["alert", "All regional health checks recovered", "success", 14, null],
    ].map(([type, message, severity, days, userId]) => ({
      type: type as InsertActivity["type"],
      message: message as string,
      severity: severity as InsertActivity["severity"],
      timestamp: isoDaysAgo(days as number, 18),
      userId: userId as number | null,
    }));

    db.insert(activity).values(sampleActivity).run();
  }
}

initializeDatabase();
seedDatabase();

export const storage: IStorage = new DatabaseStorage();
