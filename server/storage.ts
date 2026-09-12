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
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required (e.g. postgresql://root@cockroach:26257/puffbase?sslmode=disable)",
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool);

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
    const rows = await db.select().from(users).where(eq(users.id, id));
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return rows[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const rows = await db.insert(users).values(insertUser).returning();
    return rows[0];
  }

  async listDeployments(
    environment?: DeploymentEnvironment,
  ): Promise<Deployment[]> {
    if (environment) {
      return db
        .select()
        .from(deployments)
        .where(eq(deployments.environment, environment))
        .orderBy(desc(deployments.lastDeployed));
    }

    return db.select().from(deployments).orderBy(desc(deployments.lastDeployed));
  }

  async getDeployment(id: number): Promise<Deployment | undefined> {
    const rows = await db
      .select()
      .from(deployments)
      .where(eq(deployments.id, id));
    return rows[0];
  }

  async createDeployment(
    deployment: InsertDeployment,
  ): Promise<Deployment> {
    const rows = await db.insert(deployments).values(deployment).returning();
    return rows[0];
  }

  async updateDeploymentStatus(
    id: number,
    status: DeploymentStatus,
  ): Promise<Deployment | undefined> {
    const rows = await db
      .update(deployments)
      .set({ status })
      .where(eq(deployments.id, id))
      .returning();
    return rows[0];
  }

  async deleteDeployment(id: number): Promise<boolean> {
    const result = await db.delete(deployments).where(eq(deployments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async listServices(): Promise<Service[]> {
    return db.select().from(services).orderBy(services.name);
  }

  async getService(id: number): Promise<Service | undefined> {
    const rows = await db.select().from(services).where(eq(services.id, id));
    return rows[0];
  }

  async createService(service: InsertService): Promise<Service> {
    const rows = await db.insert(services).values(service).returning();
    return rows[0];
  }

  async updateService(
    id: number,
    service: Partial<InsertService>,
  ): Promise<Service | undefined> {
    const rows = await db
      .update(services)
      .set(service)
      .where(eq(services.id, id))
      .returning();
    return rows[0];
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await db.delete(services).where(eq(services.id, id));
    return (result.rowCount ?? 0) > 0;
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
        .orderBy(metrics.timestamp);
    }

    return db.select().from(metrics).orderBy(metrics.timestamp);
  }

  async createMetric(metric: InsertMetric): Promise<Metric> {
    const rows = await db.insert(metrics).values(metric).returning();
    return rows[0];
  }

  async listActivity(limit = 12): Promise<Activity[]> {
    return db
      .select()
      .from(activity)
      .orderBy(desc(activity.timestamp))
      .limit(limit);
  }

  async createActivity(entry: InsertActivity): Promise<Activity> {
    const rows = await db.insert(activity).values(entry).returning();
    return rows[0];
  }
}

// Table creation lives in drizzle-kit migrations now (`npm run db:push`),
// not ad-hoc SQL run at import time - that only made sense for a throwaway
// local SQLite file. Run `npm run db:push` against DATABASE_URL before first
// start. No seed data: a fresh `puffbase` database starts genuinely empty,
// and stays that way until real deployments/services/metrics/activity exist.

export const storage: IStorage = new DatabaseStorage();
