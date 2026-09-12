import puffbaseIcon from "@/assets/puffbase-icon.png";
import puffbaseEmblem from "@/assets/puffbase-emblem.png";

/** The real submitted mark - a dripping purple ooze cloud in a neon-green-
 *  lined teardrop. Source art has a black background baked in; keyed to
 *  transparent PNG so it drops onto the sidebar/login backdrops cleanly. */
export function PuffbaseMark({ className = "h-8 w-8" }: { className?: string }) {
  return <img src={puffbaseIcon} alt="" className={`${className} object-contain`} />;
}

/** The full lockup (icon + hand-lettered "Puffbase" wordmark, baked into the
 *  same art) - for places with room to show it at real size, like the login
 *  screen. Compact spaces (sidebar header) use PuffbaseLogo instead, which
 *  pairs the icon with live HTML text. */
export function PuffbaseEmblem({ className = "h-40 w-auto" }: { className?: string }) {
  return <img src={puffbaseEmblem} alt="Puffbase" className={`${className} object-contain`} />;
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
