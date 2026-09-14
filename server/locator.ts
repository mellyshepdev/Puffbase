// Locator is the fleet registry and owns the edge: Traefik polls its
// /api/traefik every 30s and turns each registered service carrying a
// subdomain+domain pair into Host(`<sub>.<dom>`) -> http://<node-ip>:<port>
// with a per-host cert. Registering a deployment here is what gives it a
// public address; re-registering with an empty subdomain withdraws the route.
const LOCATOR_URL = (process.env.LOCATOR_URL ?? "http://100.82.31.92:50500").replace(/\/$/, "");

export function deployDomain(): string {
  return process.env.PUFFBASE_DEPLOY_DOMAIN ?? "";
}

export interface DeploymentRouteRequest {
  name: string;
  subdomain: string;
  host: string;
  port: number;
}

export async function registerDeploymentRoute(
  route: DeploymentRouteRequest,
): Promise<string> {
  const domain = deployDomain();
  const url = `https://${route.subdomain}.${domain}`;
  const resp = await fetch(`${LOCATOR_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: route.name,
      type: "deployment",
      host: route.host,
      port: route.port,
      url,
      internal: `http://${route.name}:${route.port}`,
      subdomain: route.subdomain,
      domain,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`locator /register ${resp.status}: ${detail.slice(0, 200)}`);
  }
  return url;
}

export async function withdrawDeploymentRoute(
  name: string,
  host: string,
): Promise<void> {
  await fetch(`${LOCATOR_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, host, subdomain: "", domain: "" }),
    signal: AbortSignal.timeout(10_000),
  });
}
