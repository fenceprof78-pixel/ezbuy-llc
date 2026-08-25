export const num = (v: unknown): number => Number(v ?? 0);

export const money = (v: unknown): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num(v));

export const fmtDate = (d: string | Date | null | undefined): string => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

export const fmtDateTime = (d: string | Date | null | undefined): string => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const fmtNumber = (v: unknown): string => new Intl.NumberFormat("en-US").format(num(v));
