import { useEffect, useMemo, useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import oozeHeader from "@/assets/ooze-drip-top.webp";
import oozeAlt from "@/assets/ooze-drip-alt.webp";
import oozeRail from "@/assets/ooze-drip-rail.webp";

/**
 * OozeOverlay — the signature Puffbase visual.
 *
 * A fixed, non-interactive stack of slime layers:
 *  1. two parallax drip bands hanging from the top of the viewport
 *  2. CSS strands of goo stretching between them
 *  3. droplets that periodically fall the full height of the screen
 *  4. slime rails running down both viewport edges
 *  5. a glowing pool of ooze collecting at the bottom
 *
 * Everything is `pointer-events: none` so the dashboard stays fully usable.
 */

type Drop = {
  left: string;
  delay: string;
  duration: string;
  scale: number;
  opacity: number;
};

type Strand = {
  left: string;
  width: number;
  height: number;
  delay: string;
  duration: string;
};

// Deterministic pseudo-random so layout is stable between renders.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

export function OozeOverlay() {
  const { state, isMobile } = useSidebar();
  // The main band hangs over the content column only, so sidebar nav stays legible.
  const bandLeft = isMobile ? "0px" : state === "expanded" ? "var(--sidebar-width)" : "var(--sidebar-width-icon)";
  // The slime retracts a little once you scroll, so content stays readable.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { drops, strands } = useMemo(() => {
    const rand = rng(77);
    const drops: Drop[] = Array.from({ length: 16 }, () => ({
      left: `${(rand() * 98).toFixed(2)}%`,
      delay: `${(rand() * 14).toFixed(2)}s`,
      duration: `${(6.5 + rand() * 9).toFixed(2)}s`,
      scale: 0.55 + rand() * 1.15,
      opacity: 0.5 + rand() * 0.5,
    }));
    const strands: Strand[] = Array.from({ length: 7 }, () => ({
      left: `${(4 + rand() * 90).toFixed(2)}%`,
      width: 5 + Math.round(rand() * 7),
      height: 30 + Math.round(rand() * 90),
      delay: `${(rand() * 8).toFixed(2)}s`,
      duration: `${(7 + rand() * 8).toFixed(2)}s`,
    }));
    return { drops, strands };
  }, []);

  return (
    <div
      aria-hidden="true"
      data-testid="ooze-overlay"
      className="ooze-layer fixed inset-0 z-40 overflow-hidden"
      style={{ pointerEvents: "none" }}
    >
      {/* ---------- gooey SVG filter + gradients ---------- */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id="puff-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
          <linearGradient id="puff-slime" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(288 95% 74%)" />
            <stop offset="45%" stopColor="hsl(277 88% 58%)" />
            <stop offset="100%" stopColor="hsl(268 82% 36%)" />
          </linearGradient>
        </defs>
      </svg>

      {/* ---------- slime creeping down the sidebar under the logo ---------- */}
      {!isMobile && (
        <div
          className="ooze-band absolute top-[96px] h-[clamp(60px,7vw,96px)] transition-[width] duration-200"
          style={{
            left: 0,
            width: state === "expanded" ? "var(--sidebar-width)" : "var(--sidebar-width-icon)",
            backgroundImage: `url(${oozeAlt})`,
            backgroundSize: "auto 100%",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "top center",
            opacity: 0.3,
            maskImage: "linear-gradient(to bottom, black 25%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
          }}
        />
      )}

      {/* ---------- thin slime lip along the very top edge ---------- */}
      <div
        className="absolute inset-x-0 top-0 h-3"
        style={{
          background:
            "linear-gradient(to bottom, hsl(283 90% 62% / 0.95), hsl(275 85% 50% / 0.55) 60%, transparent)",
          filter: "drop-shadow(0 2px 10px hsl(280 90% 55% / 0.6))",
        }}
      />

      {/* ---------- main slime band, oozing out from under the header ---------- */}
      <div
        className={cn(
          "absolute right-0 top-16 transition-all duration-500 ease-out",
          scrolled
            ? "h-[clamp(70px,8vw,110px)] opacity-55"
            : "h-[clamp(120px,15vw,200px)] opacity-100",
        )}
        style={{
          left: bandLeft,
          maskImage: "linear-gradient(to bottom, black 55%, hsl(0 0% 0% / 0.55) 78%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 55%, hsl(0 0% 0% / 0.55) 78%, transparent 100%)",
        }}
      >
        {/* back layer — blurred, blended, swaying */}
        <div
          className="ooze-band-alt absolute inset-x-[-4%] top-0 h-full w-[108%] opacity-40 blur-[3px]"
          style={{
            backgroundImage: `url(${oozeAlt})`,
            backgroundSize: "auto 100%",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "top left",
          }}
        />
        {/* front layer — the hero drip */}
        <div
          data-testid="img-ooze-band"
          className="ooze-band absolute inset-x-0 top-0 h-full opacity-90"
          style={{
            backgroundImage: `url(${oozeHeader})`,
            backgroundSize: "auto 100%",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "top center",
          }}
        />
        {/* gooey CSS strands hanging under the band */}
        <div className="absolute inset-x-0 top-0 h-full" style={{ filter: "url(#puff-goo)" }}>
          {strands.map((s, i) => (
            <span
              key={i}
              className="ooze-strand"
              style={{
                left: s.left,
                width: `${s.width}px`,
                height: `${s.height}px`,
                animationDelay: s.delay,
                animationDuration: s.duration,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      </div>

      {/* ---------- falling droplets ---------- */}
      {drops.map((d, i) => (
        <span
          key={i}
          className="ooze-drop"
          data-testid={`ooze-drop-${i}`}
          style={{
            left: d.left,
            animationDelay: d.delay,
            animationDuration: d.duration,
            width: `${(10 * d.scale).toFixed(1)}px`,
            height: `${(15 * d.scale).toFixed(1)}px`,
            opacity: d.opacity,
          }}
        />
      ))}

      {/* ---------- viewport edge rails ---------- */}
      <div className="ooze-rail absolute left-0 top-0 h-full w-[3px] opacity-70" />
      <div className="ooze-rail absolute right-0 top-0 h-full w-[3px] opacity-70" />
      <img
        src={oozeRail}
        alt=""
        className="absolute right-0 top-[18vh] hidden h-[40vh] w-12 object-cover opacity-25 mix-blend-screen md:block"
        style={{ animation: "ooze-pulse 11s ease-in-out infinite" }}
      />

      {/* ---------- collected pool at the bottom ---------- */}
      <div className="absolute inset-x-0 bottom-0 h-24">
        <div
          className="absolute inset-x-0 bottom-0 h-24"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 130%, hsl(280 92% 58% / 0.3), hsl(275 85% 42% / 0.1) 45%, transparent 70%)",
          }}
        />
        <svg
          className="absolute inset-x-0 bottom-0 h-9 w-full"
          viewBox="0 0 1200 80"
          preserveAspectRatio="none"
        >
          <path
            d="M0 80 L0 44 C 90 26 150 62 240 48 C 330 34 400 66 490 52 C 580 38 650 70 740 54 C 830 38 900 66 990 50 C 1080 34 1140 60 1200 42 L1200 80 Z"
            fill="url(#puff-slime)"
            opacity="0.4"
          />
          <path
            d="M0 80 L0 62 C 120 50 200 74 320 64 C 440 54 520 78 640 66 C 760 54 840 76 960 64 C 1080 52 1140 72 1200 60 L1200 80 Z"
            fill="url(#puff-slime)"
            opacity="0.6"
          />
        </svg>
      </div>
    </div>
  );
}

export default OozeOverlay;
