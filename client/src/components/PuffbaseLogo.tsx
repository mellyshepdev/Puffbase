/**
 * Puffbase mark — a puff (rounded cloud lobes) fused to a base (stacked plinth),
 * with a single bead of ooze falling from the underside.
 * Reads cleanly from 20px to 200px.
 */
export function PuffbaseMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      role="img"
      aria-label="Puffbase logo"
    >
      <defs>
        <linearGradient id="pb-grad" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(292 95% 78%)" />
          <stop offset="48%" stopColor="hsl(277 88% 62%)" />
          <stop offset="100%" stopColor="hsl(265 82% 42%)" />
        </linearGradient>
        <linearGradient id="pb-grad-2" x1="8" y1="28" x2="40" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(283 90% 66%)" />
          <stop offset="100%" stopColor="hsl(268 80% 34%)" />
        </linearGradient>
      </defs>

      {/* puff — three fused lobes */}
      <path
        d="M15.5 21.5a7.5 7.5 0 0 1 1.2-14.4A8.4 8.4 0 0 1 32 8.6a7 7 0 0 1 4.4 12.9Z"
        fill="url(#pb-grad)"
      />
      {/* base — stacked plinth with an oozing lower lip */}
      <path
        d="M9 25h30a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z"
        fill="url(#pb-grad-2)"
      />
      <path
        d="M12 36h24c0 4.2-2.4 4.8-5.6 4.2-1.4 3.6-4 3.6-5.4 0-1.9 2.6-4.1 2.1-5-.6-3.4 1-8-.2-8-3.6Z"
        fill="url(#pb-grad-2)"
      />
      {/* highlight + falling bead */}
      <circle cx="20" cy="13" r="2.4" fill="hsl(300 100% 96%)" opacity="0.75" />
      <circle cx="24" cy="45.4" r="2.1" fill="hsl(285 92% 70%)" />
    </svg>
  );
}

export function PuffbaseLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5" data-testid="logo-puffbase">
      <PuffbaseMark className="h-8 w-8 shrink-0 drop-shadow-[0_0_12px_hsl(280_90%_60%/0.55)]" />
      {!compact && (
        <div className="min-w-0">
          <div className="goo-text truncate text-base font-bold tracking-tight">Puffbase</div>
          <div className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            slime infra cloud
          </div>
        </div>
      )}
    </div>
  );
}

export default PuffbaseLogo;
