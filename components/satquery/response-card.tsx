import { ArrowUpRight, ArrowDownRight, ScanEye } from "lucide-react"
import type { ResponseCard as ResponseCardType } from "@/lib/satquery-data"

export function ResponseCard({ card }: { card: ResponseCardType }) {
  return (
    <div className="mt-3 rounded-lg border border-border bg-background/60 p-3">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {card.title}
      </p>

      {card.kind === "landcover" && card.landcover && (
        <div className="flex flex-col gap-2">
          {card.landcover.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span>{item.label}</span>
                <span className="font-mono text-muted-foreground">{item.pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${item.pct}%`, backgroundColor: item.colorVar }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {card.kind === "detections" && (
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-md bg-accent/15">
            <ScanEye className="size-6 text-accent" aria-hidden="true" />
          </div>
          <div>
            <p className="font-mono text-3xl font-semibold text-accent">{card.detectionCount}</p>
            <p className="text-xs text-muted-foreground">{card.detectionLabel}</p>
          </div>
        </div>
      )}

      {card.kind === "ndvi" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-secondary/50 p-2.5">
            <p className="font-mono text-2xl font-semibold text-chart-3">{card.ndviMean}</p>
            <p className="text-[10px] text-muted-foreground">mean NDVI</p>
          </div>
          <div className="rounded-md bg-secondary/50 p-2.5">
            <p className="font-mono text-2xl font-semibold text-chart-3">{card.ndviHealthy}%</p>
            <p className="text-[10px] text-muted-foreground">healthy canopy</p>
          </div>
        </div>
      )}

      {card.kind === "change" && card.changes && (
        <div className="flex flex-col gap-2">
          {card.changes.map((c) => {
            const up = c.direction === "up"
            return (
              <div
                key={c.label}
                className="flex items-center justify-between rounded-md bg-secondary/50 px-2.5 py-2"
              >
                <span className="text-xs">{c.label}</span>
                <span
                  className={`flex items-center gap-1 font-mono text-xs ${up ? "text-chart-1" : "text-chart-4"}`}
                >
                  {up ? (
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  ) : (
                    <ArrowDownRight className="size-3.5" aria-hidden="true" />
                  )}
                  {c.value}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {card.kind === "flood" && (
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-md bg-primary/15">
            <span className="font-mono text-lg font-semibold text-primary">SAR</span>
          </div>
          <div>
            <p className="font-mono text-3xl font-semibold text-primary">{card.floodArea}</p>
            <p className="text-xs text-muted-foreground">estimated inundation extent</p>
          </div>
        </div>
      )}
    </div>
  )
}
