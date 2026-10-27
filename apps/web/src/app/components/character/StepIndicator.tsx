import { cn } from "@/lib/utils";

export function StepIndicator({
  steps,
  current,
  onGoTo,
}: {
  steps: readonly string[];
  current: number;
  onGoTo?: (index: number) => void;
}) {
  return (
    <ol className="flex items-center gap-2 text-xs">
      {steps.map((label, i) => {
        const state =
          i === current ? "current" : i < current ? "done" : "pending";
        const clickable = onGoTo && i < current;
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onGoTo?.(i)}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1 transition-colors",
                state === "current" &&
                  "bg-primary text-primary-foreground",
                state === "done" &&
                  "border border-border bg-input/20 text-foreground hover:bg-input/40",
                state === "pending" && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-5 items-center justify-center rounded-full text-[10px] font-medium",
                  state === "current" && "bg-primary-foreground/20",
                  state === "done" && "bg-emerald-500/20 text-emerald-500",
                  state === "pending" && "bg-muted",
                )}
              >
                {i + 1}
              </span>
              <span>{label}</span>
            </button>
            {i < steps.length - 1 && (
              <span className="h-px w-4 bg-border" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
