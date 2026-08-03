import { useState } from "react";
import LiveOperationsWall from "@/components/war-room/LiveOperationsWall";

export default function WarRoom() {
  const [tab, setTab] = useState<"live" | "legacy">("live");

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            WAR ROOM COMMAND CENTRE
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-widest">
            LIVE CAMPAIGN OPERATIONS
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Operational awareness, incidents, events and strategist execution.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("live")}
            className={`border px-3 py-2 font-mono text-[8px] ${
              tab === "live"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border"
            }`}
          >
            LIVE WALL
          </button>
          <button
            type="button"
            onClick={() => setTab("legacy")}
            className={`border px-3 py-2 font-mono text-[8px] ${
              tab === "legacy"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border"
            }`}
          >
            LEGACY REPORTS
          </button>
        </div>
      </header>

      {tab === "live" ? (
        <LiveOperationsWall />
      ) : (
        <div className="border border-dashed border-border py-16 text-center">
          <p className="font-mono text-[10px] text-muted-foreground">
            LEGACY ELECTION-DAY REPORTS REMAIN AVAILABLE IN THE ELECTION WAR ROOM.
          </p>
          <a
            href="/election-war-room"
            className="mt-4 inline-block border border-border px-4 py-2 font-mono text-[8px] text-primary"
          >
            OPEN ELECTION WAR ROOM →
          </a>
        </div>
      )}
    </div>
  );
}
