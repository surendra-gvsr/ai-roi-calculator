const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const pct = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "auto",
});

export const formatUSD = (n: number) => usd.format(Math.round(n));
export const formatUSDCompact = (n: number) => usdCompact.format(n);
export const formatPercent = (n: number) => pct.format(n);

export function formatDayAsDate(day: number, start: Date = new Date()): string {
  const d = new Date(start);
  d.setDate(d.getDate() + day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDayLabel(day: number): string {
  if (day < 30) return `Day ${day}`;
  const months = day / 30;
  if (months < 12) return `Month ${months.toFixed(1)}`;
  const years = months / 12;
  return `Year ${years.toFixed(1)}`;
}
