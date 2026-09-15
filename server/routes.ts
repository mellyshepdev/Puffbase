import {
  insertActivitySchema,
  insertDeploymentSchema,
  insertMetricSchema,
  insertServiceSchema,
} from "@shared/schema";
import type { Metric } from "@shared/schema";
import type { Express, Request, Response } from "express";
import type { Server } from "node:http";
import { z } from "zod";
import {
  storage,
  type DeploymentEnvironment,
  type DeploymentStatus,
  type MetricType,
} from "./storage";
import {
  createDocument,
  deleteDocument,
  docDeleteFile,
  docRead,
  docTree,
  docWrite,
  listDocuments,
} from "./gitspace";
import { linearConfigured, listLinearIssues } from "./linear";
import { generateSite, reviseSite } from "./builder";
import { llmConfigured, llmModel } from "./llm";
import {
  createSubscription,
  ensureCustomer,
  lagoConfigured,
} from "./lago";
import { notify, notifyChannels } from "./notify";
import {
  mailConfigured,
  sendSiteLive,
  sendSiteReady,
  sendSurveyReceived,
} from "./mail";
import {
  confirmCardSetup,
  createCardSetupSession,
  stripeConfigured,
} from "./stripe";
import {
  deployDomain,
  registerDeploymentRoute,
  withdrawDeploymentRoute,
} from "./locator";

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
const createDeploymentSchema = insertDeploymentSchema.extend({
  host: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});
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

/** The caller's tenant key: Keycloak `sub`, guaranteed present by the
 *  requireAuth middleware mounted ahead of these routes. */
function ownerOf(req: Request): string {
  return req.session.user!.sub;
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
        ownerOf(req),
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
      const deployment = await storage.getDeployment(ownerOf(req), id);
      if (!deployment) {
        return res.status(404).json({ error: "Deployment not found" });
      }
      return res.json(deployment);
    } catch (error) {
      return res.status(500).json({ error: "Failed to get deployment" });
    }
  });

  app.post("/api/deployments", async (req, res) => {
    const parsed = createDeploymentSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error.issues);

    // A deployment asking for a subdomain gets a real edge route first:
    // locator emits Host(`<sub>.<deploy-domain>`) on its next /api/traefik
    // poll, and the row stores the computed public url.
    let url: string | null = null;
    if (parsed.data.subdomain) {
      if (!deployDomain()) {
        return res
          .status(503)
          .json({ error: "Deployment domain not configured" });
      }
      try {
        url = await registerDeploymentRoute({
          name: `deploy-${parsed.data.subdomain}`,
          subdomain: parsed.data.subdomain,
          host: parsed.data.host ?? "unit7",
          port: parsed.data.port ?? 80,
        });
      } catch (error) {
        return res
          .status(502)
          .json({ error: "Failed to register deployment route" });
      }
    }

    try {
      const deployment = await storage.createDeployment(ownerOf(req), {
        ...parsed.data,
        url,
      });
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
        ownerOf(req),
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
      const deployment = await storage.getDeployment(ownerOf(req), id);
      if (!deployment) {
        return res.status(404).json({ error: "Deployment not found" });
      }
      if (deployment.subdomain) {
        await withdrawDeploymentRoute(
          `deploy-${deployment.subdomain}`,
          deployment.host ?? "unit7",
        ).catch(() => {});
      }
      await storage.deleteDeployment(ownerOf(req), id);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete deployment" });
    }
  });

  app.get("/api/services", async (req, res) => {
    try {
      return res.json(await storage.listServices(ownerOf(req)));
    } catch (error) {
      return res.status(500).json({ error: "Failed to list services" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return sendValidationError(res, { id: "Must be a positive integer" });

    try {
      const service = await storage.getService(ownerOf(req), id);
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
      return res
        .status(201)
        .json(await storage.createService(ownerOf(req), parsed.data));
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
      const service = await storage.updateService(
        ownerOf(req),
        id,
        parsed.data,
      );
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
      if (!(await storage.deleteService(ownerOf(req), id))) {
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
        ownerOf(req),
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
        ownerOf(req),
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
      return res
        .status(201)
        .json(await storage.createMetric(ownerOf(req), parsed.data));
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
      return res.json(await storage.listActivity(ownerOf(req), limit));
    } catch (error) {
      return res.status(500).json({ error: "Failed to list activity" });
    }
  });

  app.post("/api/activity", async (req, res) => {
    const parsed = insertActivitySchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error.issues);

    try {
      return res
        .status(201)
        .json(await storage.createActivity(ownerOf(req), parsed.data));
    } catch (error) {
      return res.status(500).json({ error: "Failed to create activity" });
    }
  });

  /* ---- documents: each account's private file space. Every call resolves
   *  the document name through the caller's own prefix inside gitspace, so
   *  these routes never hand a name straight through to storage. ---- */

  const docName = (req: Request) => String(req.params.doc);
  const docFilePath = (req: Request) =>
    typeof req.query.path === "string" ? req.query.path : "";

  app.get("/api/documents", async (req, res) => {
    try {
      return res.json(await listDocuments(ownerOf(req)));
    } catch {
      return res.status(502).json({ error: "Failed to list documents" });
    }
  });

  app.post("/api/documents", async (req, res) => {
    const parsed = z
      .object({ name: z.string().min(1).max(51) })
      .strict()
      .safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error.issues);
    try {
      return res
        .status(201)
        .json(await createDocument(ownerOf(req), parsed.data.name));
    } catch {
      return res.status(502).json({ error: "Failed to create document" });
    }
  });

  app.delete("/api/documents/:doc", async (req, res) => {
    try {
      await deleteDocument(ownerOf(req), docName(req));
      return res.status(204).send();
    } catch {
      return res.status(404).json({ error: "Document not found" });
    }
  });

  app.get("/api/documents/:doc/tree", async (req, res) => {
    try {
      return res.json(await docTree(ownerOf(req), docName(req)));
    } catch {
      return res.status(404).json({ error: "Document not found" });
    }
  });

  app.get("/api/documents/:doc/file", async (req, res) => {
    const path = docFilePath(req);
    if (!path || path.includes("..")) {
      return sendValidationError(res, { path: "Required" });
    }
    try {
      return res.json(await docRead(ownerOf(req), docName(req), path));
    } catch {
      return res.status(404).json({ error: "File not found" });
    }
  });

  const docWriteSchema = z.object({
    path: z
      .string()
      .min(1)
      .refine((p) => !p.includes("..") && !p.startsWith("/")),
    content: z.string(),
    sha: z.string().optional(),
    message: z.string().max(500).optional(),
  });

  app.put("/api/documents/:doc/file", async (req, res) => {
    const parsed = docWriteSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error.issues);
    const { path, content, sha, message } = parsed.data;
    try {
      await docWrite(ownerOf(req), docName(req), path, { content, sha, message });
      return res.status(sha ? 200 : 201).json({ path });
    } catch {
      return res.status(502).json({ error: "Failed to save file" });
    }
  });

  app.delete("/api/documents/:doc/file", async (req, res) => {
    const parsed = z
      .object({
        path: z
          .string()
          .min(1)
          .refine((p) => !p.includes("..") && !p.startsWith("/")),
        sha: z.string().min(1),
      })
      .safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error.issues);
    try {
      await docDeleteFile(
        ownerOf(req),
        docName(req),
        parsed.data.path,
        parsed.data.sha,
      );
      return res.status(204).send();
    } catch {
      return res.status(502).json({ error: "Failed to delete file" });
    }
  });

  app.get("/api/linear/issues", async (_req, res) => {
    if (!linearConfigured()) {
      return res.json({ configured: false, issues: [] });
    }
    try {
      return res.json({ configured: true, issues: await listLinearIssues() });
    } catch (error) {
      return res.status(502).json({ error: "Failed to fetch Linear issues" });
    }
  });

  app.get("/api/dashboard", async (req, res) => {
    try {
      const owner = ownerOf(req);
      const startDate = startDateForDays(30);
      const [metricRows, deploymentRows, activityRows, serviceRows] =
        await Promise.all([
          storage.listMetrics(owner, undefined, startDate, new Date().toISOString()),
          storage.listDeployments(owner),
          storage.listActivity(owner, 8),
          storage.listServices(owner),
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

  /* ---- site builder: survey -> generate -> iterate -> publish -> bill ---- */

  const surveySchema = z.record(z.string(), z.string().max(2000));
  const createProjectSchema = z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().max(320),
    survey: surveySchema,
    subdomain: z
      .string()
      .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/)
      .optional(),
  });
  const reviseSchema = z
    .object({ instruction: z.string().min(1).max(4000) })
    .strict();

  /** Generation is async - local CPU inference takes minutes. The route marks
   *  the project generating and returns; the client polls the project row. */
  async function runGeneration(projectId: number, owner: string) {
    const project = await storage.getBuilderProject(owner, projectId);
    if (!project) return;
    try {
      const survey = JSON.parse(project.survey) as Record<string, string>;
      const html = await generateSite(project.name, survey);
      await storage.addBuilderRevision(projectId, "initial generation", html);
      await storage.updateBuilderProject(owner, projectId, {
        status: "preview",
        html,
      });
      void notify(`Puffbase: site generated for "${project.name}" (owner ${owner.slice(0, 8)}…)`);
      if (project.email) {
        sendSiteReady(
          project.email,
          project.name,
          `${process.env.APP_URL ?? ""}/#/builder/${projectId}`,
        );
      }
    } catch (error) {
      await storage.updateBuilderProject(owner, projectId, { status: "failed" });
      console.error("[builder] generation failed", error);
    }
  }

  async function runRevision(
    projectId: number,
    owner: string,
    instruction: string,
  ) {
    const project = await storage.getBuilderProject(owner, projectId);
    if (!project?.html) return;
    try {
      const survey = JSON.parse(project.survey) as Record<string, string>;
      const html = await reviseSite(
        project.name,
        survey,
        project.html,
        instruction,
      );
      await storage.addBuilderRevision(projectId, instruction, html);
      await storage.updateBuilderProject(owner, projectId, {
        status: "preview",
        html,
      });
    } catch (error) {
      await storage.updateBuilderProject(owner, projectId, { status: "preview" });
      console.error("[builder] revision failed", error);
    }
  }

  app.get("/api/builder/status", (_req, res) => {
    res.json({
      llm: llmConfigured(),
      model: llmModel(),
      lago: lagoConfigured(),
      stripe: stripeConfigured(),
      mail: mailConfigured(),
      deployDomain: deployDomain() || null,
      notify: notifyChannels(),
    });
  });

  app.get("/api/builder/projects", async (req, res) => {
    try {
      return res.json(await storage.listBuilderProjects(ownerOf(req)));
    } catch {
      return res.status(500).json({ error: "Failed to list projects" });
    }
  });

  /** The node locator routes builder sites to - where this app serves them.
   *  If locator ever migrates puffbase elsewhere this is the only thing that
   *  needs to change (or have the migration re-register). */
  const SITE_NODE = process.env.PUFFBASE_NODE ?? "unit7";
  const SITE_PORT = Number(process.env.PORT ?? 5000);

  /** Reserve the edge space with locator: the subdomain route exists (and
   *  serves the placeholder) before generation finishes. Publish re-registers
   *  idempotently, so a failure here only delays the reservation. */
  function reserveSiteSpace(
    subdomain: string,
    owner: string,
    projectId: number,
  ): void {
    if (!deployDomain()) return;
    void registerDeploymentRoute({
      name: `site-${subdomain}`,
      subdomain,
      host: SITE_NODE,
      port: SITE_PORT,
    })
      .then((url) =>
        storage.updateBuilderProject(owner, projectId, { url }).then(() => {}),
      )
      .catch((error) => {
        console.error(`[builder] space reservation failed for ${subdomain}`, error);
      });
  }

  app.post("/api/builder/projects", async (req, res) => {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error.issues);
    if (!llmConfigured()) {
      return res.status(503).json({ error: "LLM backend not configured" });
    }
    const owner = ownerOf(req);
    try {
      if (parsed.data.subdomain) {
        const claimed = await storage.findBuilderSite(parsed.data.subdomain);
        if (claimed) {
          return res.status(409).json({ error: "Subdomain already taken" });
        }
      }
      const project = await storage.createBuilderProject(owner, {
        name: parsed.data.name,
        email: parsed.data.email,
        status: stripeConfigured() ? "survey" : "generating",
        survey: JSON.stringify(parsed.data.survey),
        subdomain: parsed.data.subdomain ?? null,
      });
      const subdomain =
        project.subdomain ??
        `site-${owner.replace(/[^a-z0-9]/g, "").slice(0, 8)}-${project.id}`;
      let current = project;
      if (!project.subdomain) {
        current =
          (await storage.updateBuilderProject(owner, project.id, {
            subdomain,
          })) ?? project;
      }
      reserveSiteSpace(subdomain, owner, project.id);
      void notify(`Puffbase: new site survey "${project.name}" submitted`);

      // Card-first when Stripe is configured: park the project in "survey"
      // and hand back a hosted Checkout URL; generation starts on
      // /confirm-card. Without Stripe (dev) generation starts immediately.
      if (stripeConfigured()) {
        const checkoutUrl = await createCardSetupSession(
          project.id,
          parsed.data.email,
        );
        return res.status(201).json({ ...current, checkoutUrl });
      }
      sendSurveyReceived(parsed.data.email, project.name);
      void runGeneration(project.id, owner);
      return res.status(201).json(current);
    } catch {
      return res.status(500).json({ error: "Failed to create project" });
    }
  });

  /** Hosted card collection for a project still waiting in "survey" - same
   *  Checkout URL path as create, for users who left and came back. */
  app.post("/api/builder/projects/:id/card-setup", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return sendValidationError(res, { id: "Must be a positive integer" });
    if (!stripeConfigured()) {
      return res.status(503).json({ error: "Payments not configured" });
    }
    const owner = ownerOf(req);
    try {
      const project = await storage.getBuilderProject(owner, id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.stripeCustomerId) {
        return res.status(409).json({ error: "Card already on file" });
      }
      const checkoutUrl = await createCardSetupSession(id, project.email);
      return res.json({ checkoutUrl });
    } catch {
      return res.status(500).json({ error: "Failed to create checkout" });
    }
  });

  /** Return from Stripe Checkout: verify the setup session, save the
   *  customer, then kick off generation + the expectation email. */
  app.post("/api/builder/projects/:id/confirm-card", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return sendValidationError(res, { id: "Must be a positive integer" });
    const parsed = z
      .object({ sessionId: z.string().min(1).max(200) })
      .strict()
      .safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error.issues);
    const owner = ownerOf(req);
    try {
      const project = await storage.getBuilderProject(owner, id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.stripeCustomerId) {
        return res.json(project);
      }
      const customerId = await confirmCardSetup(id, parsed.data.sessionId);
      if (!customerId) {
        return res
          .status(402)
          .json({ error: "Card setup not completed" });
      }
      const updated = await storage.updateBuilderProject(owner, id, {
        stripeCustomerId: customerId,
        status: "generating",
      });
      if (project.email) sendSurveyReceived(project.email, project.name);
      void runGeneration(id, owner);
      return res.json(updated);
    } catch {
      return res.status(500).json({ error: "Failed to confirm card" });
    }
  });

  app.get("/api/builder/projects/:id", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return sendValidationError(res, { id: "Must be a positive integer" });
    try {
      const project = await storage.getBuilderProject(ownerOf(req), id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const revisions = await storage.listBuilderRevisions(id);
      return res.json({
        ...project,
        revisions: revisions.map((r) => ({
          id: r.id,
          instruction: r.instruction,
          createdAt: r.createdAt,
        })),
      });
    } catch {
      return res.status(500).json({ error: "Failed to get project" });
    }
  });

  /** Serves the generated document for the iframe preview. Same-origin +
   *  session cookie, so the console can embed it directly. */
  app.get("/api/builder/projects/:id/preview", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return sendValidationError(res, { id: "Must be a positive integer" });
    try {
      const project = await storage.getBuilderProject(ownerOf(req), id);
      if (!project?.html) return res.status(404).send("No generated site yet");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.send(project.html);
    } catch {
      return res.status(500).send("Preview failed");
    }
  });

  app.post("/api/builder/projects/:id/revise", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return sendValidationError(res, { id: "Must be a positive integer" });
    const parsed = reviseSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error.issues);
    const owner = ownerOf(req);
    try {
      const project = await storage.getBuilderProject(owner, id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (!project.html) {
        return res.status(409).json({ error: "Nothing generated yet" });
      }
      if (project.status === "generating") {
        return res.status(409).json({ error: "Generation already running" });
      }
      await storage.updateBuilderProject(owner, id, { status: "generating" });
      void runRevision(id, owner, parsed.data.instruction);
      return res.status(202).json({ status: "generating" });
    } catch {
      return res.status(500).json({ error: "Failed to revise" });
    }
  });

  /** Publish: register the edge route and flip the project live. The
   *  generated page is served by this app on <subdomain>.<deploy-domain>
   *  via the site-vhost middleware mounted in index.ts. */
  app.post("/api/builder/projects/:id/publish", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return sendValidationError(res, { id: "Must be a positive integer" });
    const owner = ownerOf(req);
    try {
      const project = await storage.getBuilderProject(owner, id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (!project.html) {
        return res.status(409).json({ error: "Nothing generated yet" });
      }
      const subdomain =
        project.subdomain ??
        `site-${owner.replace(/[^a-z0-9]/g, "").slice(0, 8)}-${id}`;
      if (!deployDomain()) {
        return res.status(503).json({ error: "Deploy domain not configured" });
      }
      await storage.updateBuilderProject(owner, id, { status: "deploying" });

      const url = await registerDeploymentRoute({
        name: `site-${subdomain}`,
        subdomain,
        host: SITE_NODE,
        port: SITE_PORT,
      });
      const updated = await storage.updateBuilderProject(owner, id, {
        status: "live",
        subdomain,
        url,
      });
      void notify(`Puffbase: "${project.name}" published at ${url}`);
      if (project.email) sendSiteLive(project.email, project.name, url);
      return res.json(updated);
    } catch (error) {
      await storage
        .updateBuilderProject(owner, id, { status: "preview" })
        .catch(() => {});
      console.error("[builder] publish failed", error);
      return res.status(502).json({ error: "Publish failed" });
    }
  });

  /** Billing: attach a Lago subscription to the project. Lago customers are
   *  keyed by the Keycloak sub so billing follows the account. */
  app.post("/api/builder/projects/:id/subscribe", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return sendValidationError(res, { id: "Must be a positive integer" });
    const parsed = z
      .object({ planCode: z.string().min(1).max(100) })
      .strict()
      .safeParse(req.body);
    if (!parsed.success) return sendValidationError(res, parsed.error.issues);
    if (!lagoConfigured()) {
      return res.status(503).json({ error: "Billing not configured" });
    }
    const owner = ownerOf(req);
    try {
      const project = await storage.getBuilderProject(owner, id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      const user = req.session.user!;
      const customerId = await ensureCustomer(owner, user.email ?? "", user.name);
      const subscriptionId = await createSubscription(owner, parsed.data.planCode);
      const updated = await storage.updateBuilderProject(owner, id, {
        lagoCustomerId: customerId,
        lagoSubscriptionId: subscriptionId,
      });
      void notify(
        `Puffbase: "${project.name}" subscribed to ${parsed.data.planCode}`,
      );
      return res.json(updated);
    } catch (error) {
      console.error("[builder] subscribe failed", error);
      return res.status(502).json({ error: "Subscription failed" });
    }
  });

  app.delete("/api/builder/projects/:id", async (req, res) => {
    const id = parsePositiveInteger(req.params.id);
    if (!id) return sendValidationError(res, { id: "Must be a positive integer" });
    const owner = ownerOf(req);
    try {
      const project = await storage.getBuilderProject(owner, id);
      if (!project) return res.status(404).json({ error: "Project not found" });
      if (project.subdomain) {
        await withdrawDeploymentRoute(
          `site-${project.subdomain}`,
          SITE_NODE,
        ).catch(() => {});
      }
      await storage.deleteBuilderProject(owner, id);
      return res.status(204).send();
    } catch {
      return res.status(500).json({ error: "Failed to delete project" });
    }
  });

  return httpServer;
}
