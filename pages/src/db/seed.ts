import { db } from "./index";
import { repositories, issues, pipelines, deployments } from "./schema";

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  await db.delete(deployments);
  await db.delete(pipelines);
  await db.delete(issues);
  await db.delete(repositories);

  // Insert repositories
  const repos = await db
    .insert(repositories)
    .values([
      {
        name: "slime-ui",
        description: "A gooey component library with purple slime aesthetics and fluid animations",
        language: "TypeScript",
        visibility: "public",
        stars: 2847,
        forks: 312,
        defaultBranch: "main",
        lastCommitMessage: "feat: add dripping animation variants to Button component",
        lastCommitAt: new Date(Date.now() - 1000 * 60 * 15),
      },
      {
        name: "purple-api",
        description: "RESTful API backend powering the SlimeGit ecosystem with real-time webhooks",
        language: "TypeScript",
        visibility: "public",
        stars: 1523,
        forks: 198,
        defaultBranch: "main",
        lastCommitMessage: "fix: resolve auth token refresh race condition",
        lastCommitAt: new Date(Date.now() - 1000 * 60 * 45),
      },
      {
        name: "gooey-deploy",
        description: "One-click deployment engine with auto-scaling and edge distribution",
        language: "Go",
        visibility: "public",
        stars: 4201,
        forks: 567,
        defaultBranch: "main",
        lastCommitMessage: "chore: update k8s manifests for v2.4.0",
        lastCommitAt: new Date(Date.now() - 1000 * 60 * 120),
      },
      {
        name: "slime-docs",
        description: "Documentation site built with Next.js, featuring interactive API explorer",
        language: "MDX",
        visibility: "public",
        stars: 891,
        forks: 145,
        defaultBranch: "main",
        lastCommitMessage: "docs: add pipeline configuration guide",
        lastCommitAt: new Date(Date.now() - 1000 * 60 * 200),
      },
      {
        name: "drip-analytics",
        description: "Real-time analytics dashboard for monitoring deployments and traffic patterns",
        language: "Python",
        visibility: "private",
        stars: 567,
        forks: 89,
        defaultBranch: "develop",
        lastCommitMessage: "feat: add traffic heatmap visualization",
        lastCommitAt: new Date(Date.now() - 1000 * 60 * 300),
      },
      {
        name: "slime-vscode",
        description: "VS Code extension with purple slime theme and integrated Git commands",
        language: "TypeScript",
        visibility: "public",
        stars: 3102,
        forks: 278,
        defaultBranch: "main",
        lastCommitMessage: "feat: inline git blame annotations with slime highlighting",
        lastCommitAt: new Date(Date.now() - 1000 * 60 * 60),
      },
      {
        name: "ooze-auth",
        description: "Authentication microservice with OAuth2, SSO, and session management",
        language: "Rust",
        visibility: "private",
        stars: 1890,
        forks: 234,
        defaultBranch: "main",
        lastCommitMessage: "fix: patch OAuth callback redirect vulnerability",
        lastCommitAt: new Date(Date.now() - 1000 * 60 * 180),
      },
      {
        name: "blob-storage",
        description: "Distributed object storage with S3-compatible API and edge caching",
        language: "Go",
        visibility: "public",
        stars: 2156,
        forks: 345,
        defaultBranch: "main",
        lastCommitMessage: "perf: optimize chunk deduplication algorithm",
        lastCommitAt: new Date(Date.now() - 1000 * 60 * 90),
      },
    ])
    .returning();

  // Insert issues
  const issueData = [
    { repoId: repos[0].id, title: "Button drip animation stutters on Safari", body: "The drip animation on the primary button component stutters when viewed in Safari 17.x. Works fine in Chrome and Firefox.", status: "open", priority: "high", assignee: "slime_dev", labels: ["bug", "safari", "animation"] },
    { repoId: repos[0].id, title: "Add glow intensity prop to all components", body: "Need a configurable glowIntensity prop (low, medium, high, ultra) across all components.", status: "open", priority: "medium", assignee: "gooey_queen", labels: ["enhancement", "api"] },
    { repoId: repos[0].id, title: "Dropdown menus not closing on outside click", body: "Reported by multiple users.", status: "closed", priority: "low", assignee: "slime_dev", labels: ["bug", "ux"] },
    { repoId: repos[1].id, title: "Rate limiter bypassed with concurrent requests", body: "When sending 100+ concurrent requests, the rate limiter appears to allow more than the configured limit.", status: "open", priority: "critical", assignee: "blob_master", labels: ["security", "critical"] },
    { repoId: repos[1].id, title: "Add GraphQL subscription support", body: "Customers are requesting real-time updates via GraphQL subscriptions.", status: "open", priority: "medium", assignee: null, labels: ["enhancement", "graphql"] },
    { repoId: repos[2].id, title: "Deploy fails on ARM64 instances", body: "Kubernetes pods crash with segfault when deploying to ARM64 nodes.", status: "open", priority: "high", assignee: "drip_ops", labels: ["bug", "arm64", "k8s"] },
    { repoId: repos[2].id, title: "Support blue-green deployments", body: "Add native blue-green deployment strategy alongside rolling updates.", status: "open", priority: "medium", assignee: "drip_ops", labels: ["feature", "deployment"] },
    { repoId: repos[4].id, title: "Dashboard loading slow with large datasets", body: "When viewing analytics for repos with 10k+ commits, the dashboard takes 15+ seconds to load.", status: "open", priority: "high", assignee: "slime_dev", labels: ["performance", "dashboard"] },
    { repoId: repos[6].id, title: "Session tokens not expiring correctly", body: "Tokens remain valid 24 hours past their configured expiration time.", status: "open", priority: "critical", assignee: "blob_master", labels: ["security", "auth"] },
  ];

  await db.insert(issues).values(issueData);

  // Insert pipelines
  const pipelineData = [
    { repoId: repos[0].id, branch: "main", status: "success", stage: "deploy", commitSha: "a3f8d2e", commitMessage: "feat: add dripping animation variants", duration: 142, startedAt: new Date(Date.now() - 1000 * 60 * 20), finishedAt: new Date(Date.now() - 1000 * 60 * 18) },
    { repoId: repos[0].id, branch: "feat/glow-props", status: "running", stage: "test", commitSha: "b7c1e4a", commitMessage: "wip: glow intensity prop implementation", duration: null, startedAt: new Date(Date.now() - 1000 * 60 * 3) },
    { repoId: repos[1].id, branch: "main", status: "failed", stage: "test", commitSha: "d4e5f6a", commitMessage: "fix: auth token refresh race condition", duration: 87, startedAt: new Date(Date.now() - 1000 * 60 * 50), finishedAt: new Date(Date.now() - 1000 * 60 * 49) },
    { repoId: repos[1].id, branch: "fix/rate-limiter", status: "success", stage: "build", commitSha: "e8f9a0b", commitMessage: "fix: rate limiter concurrent request handling", duration: 203, startedAt: new Date(Date.now() - 1000 * 60 * 100), finishedAt: new Date(Date.now() - 1000 * 60 * 97) },
    { repoId: repos[2].id, branch: "main", status: "success", stage: "deploy", commitSha: "c1d2e3f", commitMessage: "chore: update k8s manifests for v2.4.0", duration: 310, startedAt: new Date(Date.now() - 1000 * 60 * 130), finishedAt: new Date(Date.now() - 1000 * 60 * 125) },
    { repoId: repos[2].id, branch: "feat/blue-green", status: "pending", stage: "lint", commitSha: "f4a5b6c", commitMessage: "wip: blue-green deployment strategy", duration: null },
    { repoId: repos[5].id, branch: "main", status: "success", stage: "deploy", commitSha: "a1b2c3d", commitMessage: "feat: inline git blame annotations", duration: 95, startedAt: new Date(Date.now() - 1000 * 60 * 70), finishedAt: new Date(Date.now() - 1000 * 60 * 69) },
    { repoId: repos[6].id, branch: "hotfix/session-expiry", status: "running", stage: "test", commitSha: "d4e5f6g", commitMessage: "fix: session token expiration logic", duration: null, startedAt: new Date(Date.now() - 1000 * 60 * 2) },
  ];

  await db.insert(pipelines).values(pipelineData);

  // Insert deployments
  const deploymentData = [
    { repoId: repos[0].id, environment: "production", status: "active", url: "https://slime-ui.slimegit.dev", domain: "slime-ui.slimegit.dev", branch: "main", commitSha: "a3f8d2e" },
    { repoId: repos[0].id, environment: "preview", status: "active", url: "https://slime-ui-preview-abc123.slimegit.dev", domain: "slime-ui-preview-abc123.slimegit.dev", branch: "feat/glow-props", commitSha: "b7c1e4a" },
    { repoId: repos[1].id, environment: "production", status: "active", url: "https://api.slimegit.dev", domain: "api.slimegit.dev", branch: "main", commitSha: "d4e5f6a" },
    { repoId: repos[2].id, environment: "production", status: "active", url: "https://deploy.slimegit.dev", domain: "deploy.slimegit.dev", branch: "main", commitSha: "c1d2e3f" },
    { repoId: repos[3].id, environment: "production", status: "active", url: "https://docs.slimegit.dev", domain: "docs.slimegit.dev", branch: "main", commitSha: "g7h8i9j" },
    { repoId: repos[4].id, environment: "staging", status: "deploying", url: "https://analytics-staging.slimegit.dev", domain: "analytics-staging.slimegit.dev", branch: "develop", commitSha: "k1l2m3n" },
    { repoId: repos[5].id, environment: "production", status: "active", url: "https://marketplace.visualstudio.com/items?itemName=slimegit.theme", domain: "marketplace.visualstudio.com", branch: "main", commitSha: "a1b2c3d" },
  ];

  await db.insert(deployments).values(deploymentData);

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
