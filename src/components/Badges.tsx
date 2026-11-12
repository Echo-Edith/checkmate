import type { CSSProperties } from "react";
import type { BadgeId } from "@/lib/badges";

const INFO: Record<BadgeId, { label: string; icon?: string; title: string; style: CSSProperties }> = {
  owner: {
    label: "Owner",
    icon: "",
    title: "Built Checkm8",
    style: { background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "#2a1500" },
  },
  beta: {
    label: "Tester",
    icon: "",
    title: "Helps test Checkm8",
    style: { background: "linear-gradient(135deg, #6366f1, #a855f7)", color: "#ffffff" },
  },
};

/** Small pills such as "Owner" and "Tester". Renders nothing when there are none. */
export function Badges({ badges, compact = false }: { badges: BadgeId[]; compact?: boolean }) {
  if (badges.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {badges.map((id) => {
        const info = INFO[id];
        return (
          <span
            key={id}
            title={info.title}
            className={`inline-flex items-center gap-1 rounded-full font-semibold ${compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}`}
            style={info.style}
          >
            {info.label}
          </span>
        );
      })}
    </span>
  );
}
