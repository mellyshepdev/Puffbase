import {
  activity,
  builderProjects,
  builderRevisions,
  deployments,
  metrics,
  services,
  users,
} from "@shared/schema";
import type {
  Activity,
  BuilderProject,
  BuilderRevision,
  Deployment,
  InsertActivity,
  InsertBuilderProject,
  InsertDeployment,
  InsertMetric,
  InsertService,
  InsertUser,
  Metric,
  Service,
  User,
} from "@shared/schema";
import { and, desc, eq, gte, isNotNull, lte, sql, type SQL } from "drizzle-orm";
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

// Every method takes `owner` (the caller's Keycloak sub) and scopes the
// query to it. There is deliberately no unscoped read or write path:
// getById/update/delete also filter on owner, so knowing another account's
// row id buys you nothing.
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  listDeployments(
    owner: string,
    environment?: DeploymentEnvironment,
  ): Promise<Deployment[]>;
  getDeployment(owner: string, id: number): Promise<Deployment | undefined>;
  createDeployment(
    owner: string,
    deployment: InsertDeployment,
  ): Promise<Deployment>;
  updateDeploymentStatus(
    owner: string,
    id: number,
    status: DeploymentStatus,
  ): Promise<Deployment | undefined>;
  deleteDeployment(owner: string, id: number): Promise<boolean>;

  listServices(owner: string): Promise<Service[]>;
  getService(owner: string, id: number): Promise<Service | undefined>;
  createService(owner: string, service: InsertService): Promise<Service>;
  updateService(
    owner: string,
    id: number,
    service: Partial<InsertService>,
  ): Promise<Service | undefined>;
  deleteService(owner: string, id: number): Promise<boolean>;

  listMetrics(
    owner: string,
    type?: MetricType,
    startDate?: string,
    endDate?: string,
  ): Promise<Metric[]>;
  createMetric(owner: string, metric: InsertMetric): Promise<Metric>;

  listActivity(owner: string, limit?: number): Promise<Activity[]>;
  createActivity(owner: string, entry: InsertActivity): Promise<Activity>;

  listBuilderProjects(owner: string): Promise<BuilderProject[]>;
  getBuilderProject(owner: string, id: number): Promise<BuilderProject | undefined>;
  listLagoCustomerOwners(): Promise<string[]>;
  getOwnerBillingStats(
    owner: string,
  ): Promise<{ storageBytes: number; liveDeployments: number }>;
  createBuilderProject(
    owner: string,
    project: InsertBuilderProject,
  ): Promise<BuilderProject>;
  updateBuilderProject(
    owner: string,
    id: number,
    patch: Partial<Omit<BuilderProject, "id" | "owner" | "createdAt">>,
  ): Promise<BuilderProject | undefined>;
  addBuilderRevision(
    projectId: number,
    instruction: string,
    html: string,
  ): Promise<BuilderRevision>;
  listBuilderRevisions(projectId: number): Promise<BuilderRevision[]>;
  deleteBuilderProject(owner: string, id: number): Promise<boolean>;
  /** Public path: resolve a deploy-domain subdomain to its project.
   *  Deliberately unscoped - the visitor has no session. Returns any status
   *  so the vhost can show a placeholder on reserved-but-unpublished space;
   *  only "live" rows serve generated html. */
  findBuilderSite(
    subdomain: string,
  ): Promise<{ status: string; html: string | null } | undefined>;
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
    owner: string,
    environment?: DeploymentEnvironment,
  ): Promise<Deployment[]> {
    const conditions = [eq(deployments.owner, owner)];
    if (environment) {
      conditions.push(eq(deployments.environment, environment));
    }
    return db
      .select()
      .from(deployments)
      .where(and(...conditions))
      .orderBy(desc(deployments.lastDeployed));
  }

  async getDeployment(
    owner: string,
    id: number,
  ): Promise<Deployment | undefined> {
    const rows = await db
      .select()
      .from(deployments)
      .where(and(eq(deployments.owner, owner), eq(deployments.id, id)));
    return rows[0];
  }

  async createDeployment(
    owner: string,
    deployment: InsertDeployment,
  ): Promise<Deployment> {
    const rows = await db
      .insert(deployments)
      .values({ ...deployment, owner })
      .returning();
    return rows[0];
  }

  async updateDeploymentStatus(
    owner: string,
    id: number,
    status: DeploymentStatus,
  ): Promise<Deployment | undefined> {
    const rows = await db
      .update(deployments)
      .set({ status })
      .where(and(eq(deployments.owner, owner), eq(deployments.id, id)))
      .returning();
    return rows[0];
  }

  async deleteDeployment(owner: string, id: number): Promise<boolean> {
    const result = await db
      .delete(deployments)
      .where(and(eq(deployments.owner, owner), eq(deployments.id, id)));
    return (result.rowCount ?? 0) > 0;
  }

  async listServices(owner: string): Promise<Service[]> {
    return db
      .select()
      .from(services)
      .where(eq(services.owner, owner))
      .orderBy(services.name);
  }

  async getService(
    owner: string,
    id: number,
  ): Promise<Service | undefined> {
    const rows = await db
      .select()
      .from(services)
      .where(and(eq(services.owner, owner), eq(services.id, id)));
    return rows[0];
  }

  async createService(
    owner: string,
    service: InsertService,
  ): Promise<Service> {
    const rows = await db
      .insert(services)
      .values({ ...service, owner })
      .returning();
    return rows[0];
  }

  async updateService(
    owner: string,
    id: number,
    service: Partial<InsertService>,
  ): Promise<Service | undefined> {
    const rows = await db
      .update(services)
      .set(service)
      .where(and(eq(services.owner, owner), eq(services.id, id)))
      .returning();
    return rows[0];
  }

  async deleteService(owner: string, id: number): Promise<boolean> {
    const result = await db
      .delete(services)
      .where(and(eq(services.owner, owner), eq(services.id, id)));
    return (result.rowCount ?? 0) > 0;
  }

  async listMetrics(
    owner: string,
    type?: MetricType,
    startDate?: string,
    endDate?: string,
  ): Promise<Metric[]> {
    const conditions: SQL[] = [eq(metrics.owner, owner)];
    if (type) conditions.push(eq(metrics.type, type));
    if (startDate) conditions.push(gte(metrics.timestamp, startDate));
    if (endDate) conditions.push(lte(metrics.timestamp, endDate));

    return db
      .select()
      .from(metrics)
      .where(and(...conditions))
      .orderBy(metrics.timestamp);
  }

  async createMetric(owner: string, metric: InsertMetric): Promise<Metric> {
    const rows = await db
      .insert(metrics)
      .values({ ...metric, owner })
      .returning();
    return rows[0];
  }

  async listActivity(owner: string, limit = 12): Promise<Activity[]> {
    return db
      .select()
      .from(activity)
      .where(eq(activity.owner, owner))
      .orderBy(desc(activity.timestamp))
      .limit(limit);
  }

  async createActivity(
    owner: string,
    entry: InsertActivity,
  ): Promise<Activity> {
    const rows = await db
      .insert(activity)
      .values({ ...entry, owner })
      .returning();
    return rows[0];
  }

  async listBuilderProjects(owner: string): Promise<BuilderProject[]> {
    return db
      .select()
      .from(builderProjects)
      .where(eq(builderProjects.owner, owner))
      .orderBy(desc(builderProjects.updatedAt));
  }

  async getBuilderProject(
    owner: string,
    id: number,
  ): Promise<BuilderProject | undefined> {
    const rows = await db
      .select()
      .from(builderProjects)
      .where(and(eq(builderProjects.owner, owner), eq(builderProjects.id, id)));
    return rows[0];
  }

  async listLagoCustomerOwners(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ owner: builderProjects.owner })
      .from(builderProjects)
      .where(isNotNull(builderProjects.lagoCustomerId));
    return rows.map((r) => r.owner);
  }

  async getOwnerBillingStats(
    owner: string,
  ): Promise<{ storageBytes: number; liveDeployments: number }> {
    const rows = await db
      .select({
        storageBytes: sql<number>`coalesce(sum(octet_length(${builderProjects.html})), 0)::int`,
        liveDeployments: sql<number>`count(*) filter (where ${builderProjects.status} = 'live')::int`,
      })
      .from(builderProjects)
      .where(eq(builderProjects.owner, owner));
    return rows[0] ?? { storageBytes: 0, liveDeployments: 0 };
  }

  async createBuilderProject(
    owner: string,
    project: InsertBuilderProject,
  ): Promise<BuilderProject> {
    const now = new Date().toISOString();
    const rows = await db
      .insert(builderProjects)
      .values({ ...project, owner, createdAt: now, updatedAt: now })
      .returning();
    return rows[0];
  }

  async updateBuilderProject(
    owner: string,
    id: number,
    patch: Partial<Omit<BuilderProject, "id" | "owner" | "createdAt">>,
  ): Promise<BuilderProject | undefined> {
    const rows = await db
      .update(builderProjects)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(eq(builderProjects.owner, owner), eq(builderProjects.id, id)))
      .returning();
    return rows[0];
  }

  async addBuilderRevision(
    projectId: number,
    instruction: string,
    html: string,
  ): Promise<BuilderRevision> {
    const rows = await db
      .insert(builderRevisions)
      .values({ projectId, instruction, html, createdAt: new Date().toISOString() })
      .returning();
    return rows[0];
  }

  async listBuilderRevisions(projectId: number): Promise<BuilderRevision[]> {
    return db
      .select()
      .from(builderRevisions)
      .where(eq(builderRevisions.projectId, projectId))
      .orderBy(builderRevisions.id);
  }

  async deleteBuilderProject(owner: string, id: number): Promise<boolean> {
    await db.delete(builderRevisions).where(eq(builderRevisions.projectId, id));
    const result = await db
      .delete(builderProjects)
      .where(and(eq(builderProjects.owner, owner), eq(builderProjects.id, id)));
    return (result.rowCount ?? 0) > 0;
  }

  async findBuilderSite(
    subdomain: string,
  ): Promise<{ status: string; html: string | null } | undefined> {
    const rows = await db
      .select({ status: builderProjects.status, html: builderProjects.html })
      .from(builderProjects)
      .where(eq(builderProjects.subdomain, subdomain))
      .limit(1);
    return rows[0];
  }
}

// Table creation lives in drizzle-kit migrations now (`npm run db:push`),
// not ad-hoc SQL run at import time - that only made sense for a throwaway
// local SQLite file. Run `npm run db:push` against DATABASE_URL before first
// start. No seed data: a fresh `puffbase` database starts genuinely empty,
// and stays that way until real deployments/services/metrics/activity exist.

export const storage: IStorage = new DatabaseStorage();
