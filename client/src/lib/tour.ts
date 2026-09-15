// Guided shell tour (Shepherd.js). The sidebar + header render on every
// route (see Shell in App.tsx), so a handful of stops anchored to
// data-testid attributes already on those components is enough to cover
// the whole app without page-specific wiring. Shepherd loads lazily from
// CDN the first time the tour is opened.
//
// The tour physically walks every customer-facing page: each step carries
// a `route`, and beforeShowPromise navigates the hash router there and
// waits for the step's anchor to exist before the card shows. Anchors use
// attribute-prefix selectors ([data-testid^="row-..."]) where ids are
// per-row, so the first real record is the anchor.

import guideDefault from "@/assets/puffbase-icon.png";

const SHEPHERD_CSS = "https://cdn.jsdelivr.net/npm/shepherd.js@11/dist/css/shepherd.css";
const SHEPHERD_JS = "https://cdn.jsdelivr.net/npm/shepherd.js@11/dist/js/shepherd.min.js";

declare global {
  interface Window {
    Shepherd: any;
  }
}

type StepDef = {
  id: string;
  /** Hash route to navigate to before showing (wouter hash router). */
  route?: string;
  selector?: string;
  on?: "top" | "bottom" | "left" | "right";
  title: string;
  text: string;
  /** Tour-guide image shown inside the card. Defaults to the mascot icon;
   *  drop per-step art in src/assets and map it here. */
  img?: string;
};

const STEPS: StepDef[] = [
  {
    id: "welcome",
    route: "/",
    title: "🟣 Welcome to Puffbase",
    text: "I'm your guide through the slime vat — deployments, service health, the site builder, analytics, all of it. Let's walk the whole place.",
  },
  {
    id: "overview",
    route: "/",
    selector: '[data-testid="link-view-deployments"]',
    on: "bottom",
    title: "🏠 Overview",
    text: "Home base. Fleet health, recent activity, and quick jumps into whatever needs you — this page answers 'is everything alive?' at a glance.",
  },
  {
    id: "deployments",
    route: "/deployments",
    selector: '[data-testid="input-filter-deployments"]',
    on: "bottom",
    title: "🚀 Deployments",
    text: "Every deploy that lands, by environment — filter them here, and use the row actions to redeploy, roll back, or promote without leaving the table.",
  },
  {
    id: "services",
    route: "/services",
    selector: '[data-testid="input-filter-services"]',
    on: "bottom",
    title: "🧩 Services",
    text: "One card per running service with its status, region, and health — inspect one or open it straight from its card.",
  },
  {
    id: "builder",
    route: "/builder",
    on: "bottom",
    title: "✨ Site Builder",
    text: "Answer the survey, let the vat generate a site on our own hardware, revise it until it's right, then publish it to your own subdomain.",
  },
  {
    id: "analytics",
    route: "/analytics",
    selector: '[data-testid="tabs-range"]',
    on: "bottom",
    title: "📈 Analytics",
    text: "Traffic, latency, and error rates over whatever window you pick — 24h through 90d — so you can prove the vat is healthy, not just hope.",
  },
  {
    id: "settings",
    route: "/settings",
    selector: '[data-testid="input-workspace-name"]',
    on: "bottom",
    title: "⚙️ Settings",
    text: "Workspace identity, plan and region, notification switches, and API keys — the knobs you touch rarely but need fast when you do.",
  },
  {
    id: "nav",
    selector: '[data-testid="link-nav-overview"]',
    on: "right",
    title: "🧭 Navigation",
    text: "Everything you just saw lives one click away in this sidebar — Overview, Deployments, Services, Site Builder, Analytics, Settings.",
  },
  {
    id: "usage",
    selector: '[data-testid="usage-ooze-compute"]',
    on: "right",
    title: "📊 Vat capacity",
    text: "Live compute, bandwidth, and build-minute usage for the current plan — collapse the sidebar anytime to tuck this away.",
  },
  {
    id: "deploy",
    selector: '[data-testid="button-deploy"]',
    on: "bottom",
    title: "🚀 Deploy",
    text: "One click queues a deploy for the active service — no drilling into menus.",
  },
  {
    id: "notifications",
    selector: '[data-testid="button-notifications"]',
    on: "bottom",
    title: "🔔 Alerts",
    text: "Latency, deploy, and health-check notifications land here the moment they happen.",
  },
  {
    id: "theme",
    selector: '[data-testid="button-theme-toggle"]',
    on: "bottom",
    title: "🌗 Light / Dark",
    text: "Prefer daylight over the vat's usual gloom? Toggle the theme right here.",
  },
  {
    id: "done",
    route: "/",
    title: "🟣 That's the vat",
    text: "You know the whole floor now. This tour lives behind the compass button in the header if you ever want a rerun — go make something ooze.",
  },
];

function loadShepherd(callback: () => void) {
  if (window.Shepherd) return callback();

  if (!document.querySelector("link[data-shepherd-css]")) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = SHEPHERD_CSS;
    css.setAttribute("data-shepherd-css", "true");
    document.head.appendChild(css);
  }

  const existing = document.querySelector("script[data-shepherd-js]");
  if (existing) {
    existing.addEventListener("load", callback, { once: true });
    return;
  }

  const script = document.createElement("script");
  script.src = SHEPHERD_JS;
  script.setAttribute("data-shepherd-js", "true");
  script.onload = callback;
  document.head.appendChild(script);
}

/** Navigate the hash router to a page, then poll until `selector` exists
 *  (the route render is async) or ~2.5s passes. Returns whether the anchor
 *  was found - steps fall back to a centered card when it wasn't. */
function navigateAndWait(
  route: string | undefined,
  selector: string | undefined,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (route) {
      const target = `#${route === "/" ? "/" : route}`;
      if (window.location.hash !== target) window.location.hash = target;
    }
    if (!selector) {
      // No anchor to wait on - still give the route a beat to render.
      window.setTimeout(() => resolve(true), 350);
      return;
    }
    const deadline = Date.now() + 2500;
    const poll = () => {
      if (document.querySelector(selector)) return resolve(true);
      if (Date.now() >= deadline) return resolve(false);
      window.setTimeout(poll, 40);
    };
    poll();
  });
}

function renderProgress(el: HTMLElement | undefined, index: number, total: number) {
  const footer = el?.querySelector(".shepherd-footer");
  if (!footer) return;

  const wrap = document.createElement("div");
  wrap.className = "puffbase-tour-progress";

  const label = document.createElement("span");
  label.className = "puffbase-tour-progress-label";
  label.textContent = `${index + 1} / ${total}`;
  wrap.appendChild(label);

  const dots = document.createElement("span");
  dots.className = "puffbase-tour-progress-dots";
  for (let i = 0; i < total; i++) {
    const dot = document.createElement("span");
    dot.className =
      "puffbase-tour-progress-dot" + (i === index ? " is-active" : i < index ? " is-done" : "");
    dots.appendChild(dot);
  }
  wrap.appendChild(dots);

  footer.insertBefore(wrap, footer.firstChild);
}

/** The guide's portrait, stamped into the card's text block. One image per
 *  step is overkill for most stops; `img` on a StepDef overrides the shared
 *  default when a page wants its own art. */
function renderGuide(el: HTMLElement | undefined, img: string) {
  const text = el?.querySelector(".shepherd-text");
  if (!text || text.querySelector(".puffbase-tour-guide")) return;
  const portrait = document.createElement("img");
  portrait.src = img;
  portrait.alt = "";
  portrait.className = "puffbase-tour-guide";
  text.insertBefore(portrait, text.firstChild);
}

export function startPuffbaseTour() {
  loadShepherd(() => {
    const Shepherd = window.Shepherd;
    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      keyboardNavigation: true,
      confirmCancel: true,
      confirmCancelMessage: "Skip the rest of the tour?",
      defaultStepOptions: {
        classes: "puffbase-tour-step",
        scrollTo: { behavior: "smooth", block: "center" },
        cancelIcon: { enabled: true },
      },
    });

    STEPS.forEach((step, index) => {
      const isFirst = index === 0;
      const isLast = index === STEPS.length - 1;
      const buttons: any[] = [];

      if (!isFirst) {
        buttons.push({ text: "Back", secondary: true, classes: "shepherd-button-secondary", action: tour.back });
      }
      buttons.push({ text: isLast ? "Done" : "Next", action: isLast ? tour.complete : tour.next });

      tour.addStep({
        id: step.id,
        title: step.title,
        text: step.text,
        buttons,
        // Anchor resolution is deferred: beforeShowPromise navigates first,
        // then updateStepOptions points the card at the element that just
        // rendered. If the anchor never appears (e.g. empty page), the card
        // shows centered rather than dying.
        beforeShowPromise(this: any) {
          return navigateAndWait(step.route, step.selector).then((found) => {
            this.updateStepOptions({
              attachTo:
                found && step.selector
                  ? { element: step.selector, on: step.on || "bottom" }
                  : undefined,
            });
          });
        },
        when: {
          show(this: any) {
            renderProgress(this.el, index, STEPS.length);
            renderGuide(this.el, step.img ?? guideDefault);
          },
        },
      });
    });

    tour.start();
  });
}
