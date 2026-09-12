import {
  insertActivitySchema,
  insertDeploymentSchema,
  insertMetricSchema,
  insertServiceSchema,
} from "@shared/schema";
import type { Metric } from "@shared/schema";
import type { Express, Response } from "express";
import type { Server } from "node:http";
import { z } from "zod";
import {
  storage,
  type DeploymentEnvironment,
  type DeploymentStatus,
  type MetricType,
} from "./storage";
import { listRepos } from "./gitea";

const deploymentEnvironments = [
  "production",
  "staging",
  "development",
] as const;
const deploymentStatuses = [
  "deployed",
  "pending",
  "failed",
  "in-progress",
] as const;
const metricTypes = [
  "api_calls",
  "revenue",
  "latency",
  "errors",
  "uptime",
] as const;

const deploymentStatusSchema = z
  .object({ status: z.enum(deploymentStatuses) })
  .strict();
const servicePatchSchema = insertServiceSchema.partial();

function parsePositiveInteger(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function isOneOf<T extends string>(
  value: unknown,
  options: readonly T[],
): value is T {
  return typeof value === "string" && options.includes(value as T);
}

function sendValidationError(res: Response, issues: unknown): void {
  res.status(400).json({ error: "Invalid request", issues });
}

function startDateForDays(days: number): string {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start.toISOString();
}

function summarizeMetrics(metricRows: Metric[], periodDays: number) {
  const values = (type: MetricType) =>
    metricRows.filter((metric) => metric.type === type).map((metric) => metric.value);
  const apiCalls = values("api_calls");
  const revenue = values("revenue");
  const latency = values("latency");
  const uptime = values("uptime");
  const errors = values("errors");
  const average = (items: number[]) =>
    items.length
      ? items.reduce((sum, value) => sum + value, 0) / items.length
      : 0;

  return {
    totalApiCalls: apiCalls.reduce((sum, value) => sum + value, 0),
    totalRevenue: revenue.reduce((sum, value) => sum + value, 0),
    averageLatency: Math.round(average(latency)),
    uptime: Number((average(uptime) / 100).toFixed(3)),
    totalErrors: errors.reduce((sum, value) => sum + value, 0),
    periodDays,
  };
}

function buildChartData(metricRows: Metric[]) {
  const byDay = new Map<
    string,
    {
      date: string;
      apiCalls?: number;
      revenue?: number;
      latency?: number;
      errors?: number;
      uptime?: number;
    }
  >();

  for (const metric of metricRows) {
    const date = metric.timestamp.slice(0, 10);
    const point = byDay.get(date) ?? { date };
    const keyByType = {
      api_calls: "apiCalls",
      revenue: "revenue",
      latency: "latency",
      errors: "errors",
      uptime: "uptime",
    } as const;
    const key = keyByType[metric.type];
    point[key] = metric.type === "uptime" ? metric.value / 100 : metric.value;
    byDay.set(date, point);
  }

  return Array.from(byDay.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get("/api/deployments", async (req, res) => {
    try {
      const { environment } = req.query;
      if (
        environment !== undefined &&
        !isOneOf(environment, deploymentEnvironments)
      ) {
        return sendValidationError(res, {
          environment: `Must be one of: ${deploymentEnvironments.join(", ")}`,
        });
      }
      const rows = await storage.listDeployments(
        environment as DeploymentEnvironment | undefined,
      );
      return res.json(rows);
    } catch (error) {
      return res.status(500).json({ error: "Failed to list deployments" });
    }
  });

  app.get("/api/deployments/:id", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return sendValidationError(res, { id: "Must be a positive integer" });

    try {
      const deployment = await storage.getDeployment(id);
      if (!deployment) {
        return res.status(404).json({ error: "Deployment not found" });
      }
      return res.json(deployment);
    } catch (error) {
      return res.status(500).json({ error: "Failed to get deployment" });
    }
  });

  app.post("/api/deployments", async (req, res) => {
    const parsed = insertDeploymentSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error.issues);

    try {
      const deployment = await storage.createDeployment(parsed.data);
      return res.status(201).json(deployment);
    } catch (error) {
      return res.status(500).json({ error: "Failed to create deployment" });
    }
  });

  app.patch("/api/deployments/:id", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return sendValidationError(res, { id: "Must be a positive integer" });
    const parsed = deploymentStatusSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error.issues);

    try {
      const deployment = await storage.updateDeploymentStatus(
        id,
        parsed.data.status as DeploymentStatus,
      );
      if (!deployment) {
        return res.status(404).json({ error: "Deployment not found" });
      }
      return res.json(deployment);
    } catch (error) {
      return res.status(500).json({ error: "Failed to update deployment" });
    }
  });

  app.delete("/api/deployments/:id", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return sendValidationError(res, { id: "Must be a positive integer" });

    try {
      if (!(await storage.deleteDeployment(id))) {
        return res.status(404).json({ error: "Deployment not found" });
      }
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete deployment" });
    }
  });

  app.get("/api/services", async (_req, res) => {
    try {
      return res.json(await storage.listServices());
    } catch (error) {
      return res.status(500).json({ error: "Failed to list services" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return sendValidationError(res, { id: "Must be a positive integer" });

    try {
      const service = await storage.getService(id);
      if (!service) return res.status(404).json({ error: "Service not found" });
      return res.json(service);
    } catch (error) {
      return res.status(500).json({ error: "Failed to get service" });
    }
  });

  app.post("/api/services", async (req, res) => {
    const parsed = insertServiceSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error.issues);

    try {
      return res.status(201).json(await storage.createService(parsed.data));
    } catch (error) {
      return res.status(500).json({ error: "Failed to create service" });
    }
  });

  app.patch("/api/services/:id", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return sendValidationError(res, { id: "Must be a positive integer" });
    const parsed = servicePatchSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error.issues);
    if (Object.keys(parsed.data).length === 0) {
      return sendValidationError(res, { body: "At least one field is required" });
    }

    try {
      const service = await storage.updateService(id, parsed.data);
      if (!service) return res.status(404).json({ error: "Service not found" });
      return res.json(service);
    } catch (error) {
      return res.status(500).json({ error: "Failed to update service" });
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return sendValidationError(res, { id: "Must be a positive integer" });

    try {
      if (!(await storage.deleteService(id))) {
        return res.status(404).json({ error: "Service not found" });
      }
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete service" });
    }
  });

  app.get("/api/metrics/summary", async (req, res) => {
    const days =
      req.query.days === undefined ? 30 : parsePositiveInteger(req.query.days);
    if (!days || days > 365) {
      return sendValidationError(res, {
        days: "Must be a positive integer no greater than 365",
      });
    }

    try {
      const rows = await storage.listMetrics(
        undefined,
        startDateForDays(days),
        new Date().toISOString(),
      );
      return res.json(summarizeMetrics(rows, days));
    } catch (error) {
      return res.status(500).json({ error: "Failed to summarize metrics" });
    }
  });

  app.get("/api/metrics", async (req, res) => {
    const { type } = req.query;
    if (type !== undefined && !isOneOf(type, metricTypes)) {
      return sendValidationError(res, {
        type: `Must be one of: ${metricTypes.join(", ")}`,
      });
    }
    const days =
      req.query.days === undefined
        ? undefined
        : parsePositiveInteger(req.query.days);
    if (req.query.days !== undefined && (!days || days > 365)) {
      return sendValidationError(res, {
        days: "Must be a positive integer no greater than 365",
      });
    }

    try {
      const rows = await storage.listMetrics(
        type as MetricType | undefined,
        days ? startDateForDays(days) : undefined,
        days ? new Date().toISOString() : undefined,
      );
      return res.json(rows);
    } catch (error) {
      return res.status(500).json({ error: "Failed to list metrics" });
    }
  });

  app.post("/api/metrics", async (req, res) => {
    const parsed = insertMetricSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error.issues);

    try {
      return res.status(201).json(await storage.createMetric(parsed.data));
    } catch (error) {
      return res.status(500).json({ error: "Failed to create metric" });
    }
  });

  app.get("/api/activity", async (req, res) => {
    const limit =
      req.query.limit === undefined
        ? 12
        : parsePositiveInteger(req.query.limit);
    if (!limit || limit > 100) {
      return sendValidationError(res, {
        limit: "Must be a positive integer no greater than 100",
      });
    }

    try {
      return res.json(await storage.listActivity(limit));
    } catch (error) {
      return res.status(500).json({ error: "Failed to list activity" });
    }
  });

  app.post("/api/activity", async (req, res) => {
    const parsed = insertActivitySchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error.issues);

    try {
      return res.status(201).json(await storage.createActivity(parsed.data));
    } catch (error) {
      return res.status(500).json({ error: "Failed to create activity" });
    }
  });

  app.get("/api/repos", async (_req, res) => {
    try {
      return res.json(await listRepos());
    } catch (error) {
      return res.status(500).json({ error: "Failed to list Gitea repos" });
    }
  });

  app.get("/api/dashboard", async (_req, res) => {
    try {
      const startDate = startDateForDays(30);
      const [metricRows, deploymentRows, activityRows, serviceRows] =
        await Promise.all([
          storage.listMetrics(undefined, startDate, new Date().toISOString()),
          storage.listDeployments(),
          storage.listActivity(8),
          storage.listServices(),
        ]);
      const serviceStatus = serviceRows.reduce(
        (counts, service) => {
          counts[service.status] += 1;
          return counts;
        },
        { healthy: 0, degraded: 0, down: 0, idle: 0 },
      );

      return res.json({
        kpis: summarizeMetrics(metricRows, 30),
        recentDeployments: deploymentRows.slice(0, 6),
        recentActivity: activityRows,
        chartData: buildChartData(metricRows),
        services: {
          total: serviceRows.length,
          status: serviceStatus,
          items: serviceRows,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  return httpServer;
}
