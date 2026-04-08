import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-[#18001f]/80 p-4 shadow-[0_16px_45px_-30px_rgba(0,0,0,0.9)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold text-white">{children}</h2>;
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">{title}</p>
        {description ? <p className="mt-1 text-base font-semibold">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatBadge({
  label,
  value,
  accent = "green",
}: {
  label: string;
  value: string;
  accent?: "green" | "pink" | "purple";
}) {
  const accentStyles =
    accent === "pink"
      ? "border-[#e90052]/30 bg-[#e90052]/10 text-[#f5a3c1]"
      : accent === "purple"
        ? "border-[#7c3aed]/30 bg-[#7c3aed]/10 text-[#d7b5ff]"
        : "border-[#00ff85]/30 bg-[#00ff85]/10 text-[#b6ffe2]";

  return (
    <div className={`rounded-2xl border px-3 py-2 text-center ${accentStyles}`}>
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex rounded-full border border-white/10 bg-[#130018] p-1">
      {options.map((option) => {
        const isActive = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              isActive ? "bg-[#00ff85] text-[#0b0b0b]" : "text-white/60"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function InsightBadge({
  label,
  good,
}: {
  label: string;
  good: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        good
          ? "border-[#00ff85]/40 bg-[#00ff85]/15 text-[#00ff85]"
          : "border-[#e90052]/40 bg-[#e90052]/15 text-[#e90052]"
      }`}
    >
      {label}
    </span>
  );
}
