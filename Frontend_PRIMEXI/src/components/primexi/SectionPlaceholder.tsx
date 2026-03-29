import type { LucideIcon } from "lucide-react";

type SectionPlaceholderProps = {
  title: string;
  description: string;
  highlights: string[];
  statusLabel: string;
  icon: LucideIcon;
};

export function SectionPlaceholder({
  title,
  description,
  highlights,
  statusLabel,
  icon: Icon,
}: SectionPlaceholderProps) {
  return (
    <section className="flex flex-1 flex-col justify-center py-4">
      <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur-sm">
        <span className="inline-flex w-fit rounded-full border border-[#00ff85]/30 bg-[#00ff85]/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-[#00ff85] uppercase">
          {statusLabel}
        </span>

        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00ff85] to-[#04f5ff] text-[#38003c] shadow-lg shadow-[#04f5ff]/20">
            <Icon className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">{title}</h1>
            <p className="text-sm leading-6 text-white/70">{description}</p>
          </div>
        </div>

        <div className="grid gap-3">
          {highlights.map((highlight) => (
            <div
              key={highlight}
              className="rounded-2xl border border-white/10 bg-[#38003c]/60 px-4 py-3 text-sm text-white/85"
            >
              {highlight}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#e90052]/30 bg-[#e90052]/10 p-4">
          <p className="text-sm leading-6 text-white/80">
            Esta vista funciona como base de producto: ya tiene ruta, layout
            comun y espacio reservado para datos reales.
          </p>
        </div>
      </div>
    </section>
  );
}
