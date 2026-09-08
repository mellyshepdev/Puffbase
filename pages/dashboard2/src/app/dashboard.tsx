"use client";

import { useMemo, useState } from "react";

type IconName =
  | "overview"
  | "repo"
  | "issues"
  | "pipeline"
  | "deploy"
  | "activity"
  | "settings"
  | "search"
  | "bell"
  | "chevron"
  | "plus"
  | "arrow"
  | "dots"
  | "branch"
  | "commit"
  | "check"
  | "clock"
  | "external"
  | "code"
  | "terminal"
  | "cloud"
  | "shield"
  | "merge"
  | "sparkle"
  | "close"
  | "git";

function Icon({ name, size = 18, strokeWidth = 1.8 }: { name: IconName; size?: number; strokeWidth?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "overview":
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case "repo":
      return <svg {...common}><path d="M6 3.5h9l3 3V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" /><path d="M15 3.5V7h3M8 11h8M8 15h6" /></svg>;
    case "issues":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 8v5M12 16.5h.01" /></svg>;
    case "pipeline":
      return <svg {...common}><rect x="3.5" y="4" width="6" height="5" rx="1" /><rect x="14.5" y="15" width="6" height="5" rx="1" /><path d="M9.5 6.5h2a3 3 0 0 1 3 3v5.5M14.5 17.5h-2a3 3 0 0 1-3-3V9" /></svg>;
    case "deploy":
      return <svg {...common}><path d="m12 3 8 8-8 8-8-8 8-8Z" /><path d="m8.5 11 2.5 2.5 4.5-5M12 19v2M7 21h10" /></svg>;
    case "activity":
      return <svg {...common}><path d="M3 12h4l2-6 4 12 2-6h6" /></svg>;
    case "settings":
      return <svg {...common}><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /><circle cx="12" cy="12" r="4" /></svg>;
    case "search":
      return <svg {...common}><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.5 4.5" /></svg>;
    case "bell":
      return <svg {...common}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>;
    case "chevron":
      return <svg {...common}><path d="m7 9 5 5 5-5" /></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "arrow":
      return <svg {...common}><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
    case "dots":
      return <svg {...common}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></svg>;
    case "branch":
      return <svg {...common}><circle cx="6" cy="5" r="2" /><circle cx="18" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M6 7v5a7 7 0 0 0 7 7h3M6 7v2a6 6 0 0 0 6 6h4" /></svg>;
    case "commit":
      return <svg {...common}><circle cx="12" cy="12" r="3.5" /><path d="M3 12h5.5M15.5 12H21" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4.2 4.2L19 6.5" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></svg>;
    case "external":
      return <svg {...common}><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></svg>;
    case "code":
      return <svg {...common}><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" /></svg>;
    case "terminal":
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3M13 15h4" /></svg>;
    case "cloud":
      return <svg {...common}><path d="M7.5 18.5h10a4 4 0 0 0 .5-7.97A6.5 6.5 0 0 0 5.6 9.1a4.8 4.8 0 0 0 1.9 9.4Z" /></svg>;
    case "shield":
      return <svg {...common}><path d="M12 3 19 6v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case "merge":
      return <svg {...common}><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><path d="M6 8v3a5 5 0 0 0 5 5h5M18 16v-5a5 5 0 0 0-5-5h-3" /></svg>;
    case "sparkle":
      return <svg {...common}><path d="m12 3 1.2 5.8L19 10l-5.8 1.2L12 17l-1.2-5.8L5 10l5.8-1.2L12 3ZM19 16l.5 2.5L22 19l-2.5.5L19 22l-.5-2.5L16 19l2.5-.5L19 16Z" /></svg>;
    case "close":
      return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case "git":
      return <svg {...common}><path d="m20.2 11.3-7.5-7.5a2.7 2.7 0 0 0-3.8 0L7.3 5.4l2.1 2.1a2.6 2.6 0 0 1 3.3 3.3l2 2a2.6 2.6 0 0 1 3.3 3.3l1.7 1.7a2.7 2.7 0 0 0 .5-6.5Z" /><path d="m9.4 8.5-3 3a2.7 2.7 0 0 0 0 3.8l5.4 5.4a2.7 2.7 0 0 0 3.8 0l1.2-1.2M12.7 10.8l3.7 3.7" /></svg>;
    default:
      return null;
  }
}

type Project = {
  name: string;
  description: string;
  visibility: string;
  status: "Live" | "Building" | "Paused";
  accent: string;
  initials: string;
  branch: string;
  time: string;
  commit: string;
  language: string;
  languageClass: string;
  deploy: string;
};

const initialProjects: Project[] = [
  {
    name: "orbit-ui",
    description: "The component library behind your favorite products.",
    visibility: "Private",
    status: "Live",
    accent: "violet",
    initials: "ou",
    branch: "main",
    time: "8 min ago",
    commit: "8f3ac1b",
    language: "TypeScript",
    languageClass: "typescript",
    deploy: "Production",
  },
  {
    name: "moss-api",
    description: "Fast, typed API services for the Moss ecosystem.",
    visibility: "Internal",
    status: "Building",
    accent: "mint",
    initials: "ma",
    branch: "develop",
    time: "24 min ago",
    commit: "c21e904",
    language: "Node.js",
    languageClass: "node",
    deploy: "Preview #184",
  },
  {
    name: "lumen-site",
    description: "Marketing site and content platform for Lumen.",
    visibility: "Public",
    status: "Live",
    accent: "orange",
    initials: "ls",
    branch: "main",
    time: "1 hr ago",
    commit: "0ad94ff",
    language: "React",
    languageClass: "react",
    deploy: "Production",
  },
];

const navItems: { label: string; icon: IconName; count?: string }[] = [
  { label: "Overview", icon: "overview" },
  { label: "Repositories", icon: "repo", count: "24" },
  { label: "Issues", icon: "issues", count: "12" },
  { label: "Pipelines", icon: "pipeline" },
  { label: "Deployments", icon: "deploy" },
  { label: "Activity", icon: "activity" },
];

const activityItems = [
  { user: "You", action: "merged pull request", target: "#142 — Refine button states", time: "12 min ago", color: "purple", icon: "merge" as IconName },
  { user: "Maya Chen", action: "opened an issue in", target: "orbit-ui", time: "31 min ago", color: "coral", icon: "issues" as IconName },
  { user: "CI Bot", action: "deployed", target: "moss-api to Preview", time: "48 min ago", color: "mint", icon: "deploy" as IconName },
  { user: "Noah Williams", action: "pushed 3 commits to", target: "lumen-site / main", time: "1 hr ago", color: "blue", icon: "commit" as IconName },
];

const codeLines = [
  <><span className="code-purple">import</span> <span className="code-blue">{`{ Button }`}</span> <span className="code-purple">from</span> <span className="code-green">&quot;@orbit/ui&quot;</span></>,
  <><span className="code-purple">import</span> <span className="code-blue">{`{ cn }`}</span> <span className="code-purple">from</span> <span className="code-green">&quot;@/lib/utils&quot;</span></>,
  <></>,
  <><span className="code-purple">export default function</span> <span className="code-yellow">DeployCard</span>() {'{'}</>,
  <><span className="code-muted indent">return</span> <span className="code-blue indent2">(</span></>,
  <><span className="code-tag indent2">&lt;div</span> <span className="code-attr">className</span>=<span className="code-green">&quot;deploy-card&quot;</span><span className="code-tag">&gt;</span></>,
  <><span className="code-tag indent2">&lt;Button</span> <span className="code-attr">variant</span>=<span className="code-green">&quot;slime&quot;</span><span className="code-tag">&gt;</span></>,
  <><span className="code-text indent3">Ship to production</span></>,
  <><span className="code-tag indent2">&lt;/Button&gt;</span></>,
  <><span className="code-tag indent2">&lt;/div&gt;</span></>,
  <><span className="code-blue indent2">)</span></>,
  <>{'}'}</>,
];

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("Overview");
  const [query, setQuery] = useState("");
  const [projectList, setProjectList] = useState(initialProjects);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [notice, setNotice] = useState("");

  const filteredProjects = useMemo(
    () => projectList.filter((project) => `${project.name} ${project.description} ${project.language}`.toLowerCase().includes(query.toLowerCase())),
    [projectList, query],
  );

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  };

  const createProject = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = newProjectName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!cleanName) return;
    setProjectList((current) => [
      {
        name: cleanName,
        description: "A fresh workspace ready for your next big idea.",
        visibility: "Private",
        status: "Building",
        accent: "violet",
        initials: cleanName.slice(0, 2),
        branch: "main",
        time: "just now",
        commit: "working",
        language: "TypeScript",
        languageClass: "typescript",
        deploy: "Setting up",
      },
      ...current,
    ]);
    setNewProjectName("");
    setCreateOpen(false);
    notify(`${cleanName} is being set up`);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark"><span /><span /><span /></div>
          <span className="brand-name">slime<span className="brand-dot">.</span></span>
          <span className="brand-beta">BETA</span>
        </div>

        <button className="workspace-switcher" onClick={() => notify("Workspace switcher is ready")}>
          <span className="workspace-avatar">A</span>
          <span className="workspace-copy"><strong>Acme studio</strong><small>Personal workspace</small></span>
          <Icon name="chevron" size={15} />
        </button>

        <div className="sidebar-label">Workspace</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button key={item.label} className={`nav-item ${activeSection === item.label ? "active" : ""}`} onClick={() => setActiveSection(item.label)}>
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
              {item.count && <span className="nav-count">{item.count}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-label projects-label">Projects <button onClick={() => setCreateOpen(true)} aria-label="Create project"><Icon name="plus" size={14} /></button></div>
        <div className="mini-projects">
          {projectList.slice(0, 3).map((project) => (
            <button key={project.name} className="mini-project" onClick={() => notify(`${project.name} selected`)}>
              <span className={`project-favicon ${project.accent}`}>{project.initials.slice(0, 1)}</span>
              <span>{project.name}</span>
              <span className={`mini-status ${project.status === "Building" ? "building" : ""}`} />
            </button>
          ))}
        </div>

        <div className="sidebar-spacer" />
        <div className="upgrade-card">
          <div className="upgrade-icon"><Icon name="sparkle" size={16} /></div>
          <strong>Unlock the whole slime</strong>
          <p>Unlimited builds, private repos, and more.</p>
          <button onClick={() => notify("Upgrade options are coming right up")}>Explore Pro <Icon name="arrow" size={14} /></button>
        </div>
        <button className="nav-item sidebar-settings" onClick={() => notify("Settings opened")}><Icon name="settings" size={17} /><span>Settings</span></button>
        <div className="sidebar-profile">
          <div className="profile-avatar">AW<span className="online-dot" /></div>
          <div className="profile-copy"><strong>Alex Walker</strong><small>alex@acme.studio</small></div>
          <button className="profile-more" onClick={() => setProfileOpen((open) => !open)} aria-label="Open account menu"><Icon name="dots" size={17} /></button>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb"><span>Acme studio</span><Icon name="chevron" size={14} /><strong>{activeSection}</strong></div>
          <div className="topbar-actions">
            <label className="search-box">
              <Icon name="search" size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search repositories..." aria-label="Search repositories" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button notification-button" onClick={() => notify("You are all caught up")} aria-label="Notifications"><Icon name="bell" size={18} /><span /></button>
            <button className="top-avatar" onClick={() => setProfileOpen((open) => !open)} aria-label="Open profile">AW</button>
            {profileOpen && <div className="profile-menu"><div className="profile-menu-heading"><div className="top-avatar small">AW</div><div><strong>Alex Walker</strong><small>Acme studio</small></div></div><button onClick={() => notify("Profile settings opened")}>Account settings</button><button onClick={() => notify("Signed out")}>Sign out</button></div>}
          </div>
        </header>

        <main className="page-content">
          <div className="page-heading-row">
            <div>
              <div className="eyebrow"><span className="pulse-dot" /> ALL SYSTEMS OPERATIONAL</div>
              <h1>Good morning, Alex <span className="wave">✦</span></h1>
              <p className="page-subtitle">Here&apos;s what&apos;s moving across your workspace today.</p>
            </div>
            <div className="heading-actions"><button className="button secondary" onClick={() => notify("Import flow opened")}><Icon name="git" size={16} /> Import repo</button><button className="button primary" onClick={() => setCreateOpen(true)}><Icon name="plus" size={17} /> New project</button></div>
          </div>

          <section className="hero-card">
            <div className="hero-copy">
              <div className="hero-label"><Icon name="sparkle" size={14} /> SLIME STATUS</div>
              <h2>Everything is <em>flowing.</em></h2>
              <p>Your builds are green, deployments are healthy, and the team is in sync.</p>
              <button className="hero-link" onClick={() => setActiveSection("Activity")}>View workspace activity <Icon name="arrow" size={15} /></button>
            </div>
            <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
            <div className="hero-blob"><span /><span /><span /><span /></div>
            <div className="hero-metrics"><div><strong>98.7%</strong><span>build success</span></div><div><strong>4.2 min</strong><span>avg. deploy</span></div><div><strong>12 days</strong><span>streak</span></div></div>
          </section>

          <section className="stats-grid" aria-label="Workspace statistics">
            <div className="stat-card"><div className="stat-icon purple"><Icon name="repo" size={18} /></div><div className="stat-label">Repositories</div><strong>24</strong><span className="stat-trend up">+3 this month</span></div>
            <div className="stat-card"><div className="stat-icon orange"><Icon name="issues" size={18} /></div><div className="stat-label">Open issues</div><strong>12</strong><span className="stat-trend neutral">4 assigned to you</span></div>
            <div className="stat-card"><div className="stat-icon mint"><Icon name="pipeline" size={18} /></div><div className="stat-label">Pipelines passing</div><strong>8 <small>/ 9</small></strong><span className="stat-trend up">+11.4% this week</span></div>
            <div className="stat-card"><div className="stat-icon blue"><Icon name="cloud" size={18} /></div><div className="stat-label">Uptime</div><strong>99.98%</strong><span className="stat-trend up">Last 30 days</span></div>
          </section>

          <div className="content-grid">
            <section className="primary-column">
              <div className="section-heading"><div><h2>Recent projects</h2><p>Jump back into your workspaces.</p></div><button className="text-button" onClick={() => { setQuery(""); notify("Showing all projects"); }}>View all <Icon name="arrow" size={15} /></button></div>
              <div className="project-grid">
                {filteredProjects.map((project) => (
                  <article className="project-card" key={project.name}>
                    <div className="project-card-top"><div className={`large-favicon ${project.accent}`}>{project.initials}</div><button className="dots-button" onClick={() => notify(`${project.name} actions opened`)} aria-label={`More actions for ${project.name}`}><Icon name="dots" size={18} /></button></div>
                    <div className="project-title-row"><h3>{project.name}</h3><span className={`visibility ${project.visibility.toLowerCase()}`}>{project.visibility}</span></div>
                    <p>{project.description}</p>
                    <div className="project-meta"><span><i className={`language-dot ${project.languageClass}`} />{project.language}</span><span><Icon name="branch" size={14} />{project.branch}</span></div>
                    <div className="project-divider" />
                    <div className="project-footer"><span className={`deploy-state ${project.status.toLowerCase()}`}><i />{project.status}</span><span className="project-time">{project.time}</span><button className="open-project" onClick={() => notify(`${project.name} opened in editor`)} aria-label={`Open ${project.name}`}><Icon name="arrow" size={16} /></button></div>
                  </article>
                ))}
              </div>
              {filteredProjects.length === 0 && <div className="empty-state"><div className="empty-icon"><Icon name="search" size={20} /></div><strong>No repos found</strong><p>Try another search term.</p></div>}

              <section className="code-card">
                <div className="code-card-header"><div><div className="section-eyebrow">CODE WORKSPACE</div><h2>Keep your hands in the code.</h2></div><div className="code-card-actions"><button className="button ghost" onClick={() => notify("Preview opened in a new tab")}><Icon name="external" size={15} /> Preview</button><button className="button dark" onClick={() => notify("Editor opened for orbit-ui")}><Icon name="code" size={15} /> Open editor</button></div></div>
                <div className="editor-shell"><div className="editor-toolbar"><div className="editor-file"><span className="file-dot" /> orbit-ui <span>/</span> components <span>/</span> DeployCard.tsx</div><div className="editor-branch"><Icon name="branch" size={14} /> main <Icon name="chevron" size={13} /></div></div><div className="editor-body"><div className="file-tree"><div className="tree-heading">EXPLORER <Icon name="dots" size={14} /></div><div className="tree-item folder"><span>⌄</span> components</div><div className="tree-item selected"><span className="file-type">TS</span> DeployCard.tsx</div><div className="tree-item"><span className="file-type">TS</span> Button.tsx</div><div className="tree-item folder"><span>›</span> lib</div><div className="tree-item folder"><span>›</span> app</div><div className="tree-item"><span className="file-type json">{`{ }`}</span> package.json</div><div className="tree-bottom"><Icon name="git" size={14} /> Working tree clean</div></div><div className="code-view"><div className="code-tab"><span className="file-type">TS</span> DeployCard.tsx <Icon name="close" size={13} /></div><div className="code-content">{codeLines.map((line, index) => <div className="code-line" key={index}><span className="line-number">{String(index + 1).padStart(2, "0")}</span><span>{line}</span></div>)}</div></div></div></div>
              </section>
            </section>

            <aside className="secondary-column">
              <section className="side-card activity-card"><div className="side-card-heading"><div><h2>Activity</h2><p>Across your workspace</p></div><button className="card-icon-button" onClick={() => setShowAllActivity((current) => !current)} aria-label="Expand activity"><Icon name={showAllActivity ? "close" : "external"} size={16} /></button></div><div className="activity-list">{activityItems.slice(0, showAllActivity ? activityItems.length : 3).map((item, index) => <div className="activity-item" key={`${item.user}-${index}`}><div className={`activity-avatar ${item.color}`}>{item.user === "CI Bot" ? <Icon name="terminal" size={15} /> : item.user.split(" ").map((word) => word[0]).join("")}</div><div className="activity-copy"><p><strong>{item.user}</strong> {item.action} <b>{item.target}</b></p><span>{item.time}</span></div><div className="activity-type"><Icon name={item.icon} size={14} /></div></div>)}</div><button className="full-width-link" onClick={() => setShowAllActivity((current) => !current)}>{showAllActivity ? "Show less" : "View full activity"} <Icon name="arrow" size={14} /></button></section>

              <section className="side-card pipeline-card"><div className="side-card-heading"><div><h2>Active pipelines</h2><p>Last run status</p></div><button className="card-icon-button" onClick={() => setActiveSection("Pipelines")}><Icon name="arrow" size={16} /></button></div><div className="pipeline-list"><div className="pipeline-item"><div className="pipeline-icon success"><Icon name="check" size={15} /></div><div className="pipeline-copy"><strong>orbit-ui / main</strong><span>#842 · 8 min ago</span></div><span className="pipeline-time">2m 14s</span></div><div className="pipeline-item"><div className="pipeline-icon running"><span /></div><div className="pipeline-copy"><strong>moss-api / develop</strong><span>#184 · running now</span></div><span className="pipeline-time live">Running</span></div><div className="pipeline-item"><div className="pipeline-icon success"><Icon name="check" size={15} /></div><div className="pipeline-copy"><strong>lumen-site / main</strong><span>#391 · 1 hr ago</span></div><span className="pipeline-time">1m 48s</span></div></div><button className="full-width-link" onClick={() => setActiveSection("Pipelines")}>Open pipeline center <Icon name="arrow" size={14} /></button></section>

              <section className="deploy-banner"><div className="deploy-glow" /><div className="deploy-banner-icon"><Icon name="cloud" size={19} /></div><div><span>DEPLOY WITH CONFIDENCE</span><strong>Ship your next idea.</strong><p>Connect a repo and go live in minutes.</p></div><button onClick={() => notify("Deployment flow opened")} aria-label="Start deployment"><Icon name="arrow" size={17} /></button></section>
            </aside>
          </div>
        </main>
      </div>

      {notice && <div className="toast"><span className="toast-check"><Icon name="check" size={15} /></span>{notice}</div>}
      {createOpen && <div className="modal-backdrop" onMouseDown={() => setCreateOpen(false)}><div className="create-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setCreateOpen(false)} aria-label="Close"><Icon name="close" size={18} /></button><div className="modal-icon"><Icon name="sparkle" size={20} /></div><div className="section-eyebrow">NEW WORKSPACE</div><h2>Create a new project</h2><p>Start with a clean repository and let the slime do the rest.</p><form onSubmit={createProject}><label>Project name<input autoFocus value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder="e.g. moonlight-app" /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setCreateOpen(false)}>Cancel</button><button type="submit" className="button primary" disabled={!newProjectName.trim()}>Create project <Icon name="arrow" size={15} /></button></div></form></div></div>}
    </div>
  );
}
