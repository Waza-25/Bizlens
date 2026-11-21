// Pure calculation helpers. The database does the real posting; these
// mirror the same rules so the screens can preview totals, and so the
// rules are covered by automated tests (tests/calc.test.ts).

/** Round to 2 decimal places the way money is stored. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** New weighted-average cost after receiving stock. */
export function weightedAverageCost(
  qtyOnHand: number,
  avgCost: number,
  qtyIn: number,
  unitCostIn: number,
): number {
  const totalQty = qtyOnHand + qtyIn;
  if (totalQty <= 0) return 0;
  const value = qtyOnHand * avgCost + qtyIn * unitCostIn;
  return Math.round((value / totalQty) * 10000) / 10000;
}

export type Line = { quantity: number; price: number };

/** Sum of quantity x price for every line, rounded per line like the DB. */
export function linesTotal(lines: Line[]): number {
  return round2(lines.reduce((sum, l) => sum + round2(l.quantity * l.price), 0));
}

/** Gross profit and margin %. Margin is null when there are no sales. */
export function grossProfit(sales: number, costOfSales: number) {
  const profit = round2(sales - costOfSales);
  const margin = sales > 0 ? round2((profit / sales) * 100) : null;
  return { profit, margin };
}

const kwacha = new Intl.NumberFormat("en-ZM", {
  style: "currency",
  currency: "ZMW",
});

/** Formats a number as Zambian kwacha, e.g. K 1,234.50 */
export function formatMoney(n: number | string | null | undefined): string {
  return kwacha.format(Number(n ?? 0));
}

/** Today's date in Zambia as YYYY-MM-DD (servers run on UTC time). */
export function todayInZambia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lusaka" }).format(new Date());
}
