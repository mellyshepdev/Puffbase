// Guided shell tour (Shepherd.js). The sidebar + header render on every
// route (see Shell in App.tsx), so a handful of stops anchored to
// data-testid attributes already on those components is enough to cover
// the whole app without page-specific wiring. Shepherd loads lazily from
// CDN the first time the tour is opened.

const SHEPHERD_CSS = "https://cdn.jsdelivr.net/npm/shepherd.js@11/dist/css/shepherd.css";
const SHEPHERD_JS = "https://cdn.jsdelivr.net/npm/shepherd.js@11/dist/js/shepherd.min.js";

declare global {
  interface Window {
    Shepherd: any;
  }
}

type StepDef = {
  id: string;
  selector?: string;
  on?: "top" | "bottom" | "left" | "right";
  title: string;
  text: string;
};

const STEPS: StepDef[] = [
  {
    id: "welcome",
    title: "🟣 Welcome to Puffbase",
    text: "This is the ops dashboard for the whole slime vat — deployments, service health, analytics, all in one place.",
  },
  {
    id: "nav",
    selector: '[data-testid="link-nav-overview"]',
    on: "right",
    title: "🧭 Navigation",
    text: "Overview, Deployments, Services, Analytics, and Settings — everything lives one click away in this sidebar.",
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
        scrollTo: false,
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

      const el = step.selector ? document.querySelector(step.selector) : null;

      tour.addStep({
        id: step.id,
        title: step.title,
        text: step.text,
        attachTo: el ? { element: step.selector, on: step.on || "bottom" } : undefined,
        buttons,
        when: {
          show(this: any) {
            renderProgress(this.el, index, STEPS.length);
          },
        },
      });
    });

    tour.start();
  });
}
