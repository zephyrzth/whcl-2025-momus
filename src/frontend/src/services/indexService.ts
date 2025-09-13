import { backend } from "../../../declarations/backend";

export interface DailyUsage {
  date: string; // YYYY-MM-DD (UTC)
  calls: number; // number of outgoing debit transfers
}

export const PRICE_PER_CALL_E8S = 1_000_000n; // 0.01 ICP

export const indexService = {
  // Fetch outgoing (debit) transfers for current month and aggregate daily call counts.
  async getDailyUsageCurrentMonth(principalId: string): Promise<DailyUsage[]> {
    if (!principalId) throw new Error("Missing principalId");
    const raw = (await (backend as any).get_usage_current_month(
      1000,
    )) as Array<{
      date: string;
      calls: bigint;
      price_per_call_e8s: bigint;
      total_e8s: bigint;
    }>;
    // Map and sort
    return raw
      .map((r) => ({ date: r.date, calls: Number(r.calls) }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  },

  formatIcpFromE8s(e8s: bigint): string {
    const whole = e8s / 100_000_000n;
    const frac = (e8s % 100_000_000n).toString().padStart(8, "0");
    return `${whole}.${frac.slice(0, 4)} ICP`;
  },
};

export function formatPricePerCall(): string {
  return indexService.formatIcpFromE8s(PRICE_PER_CALL_E8S);
}

export function formatTotal(calls: number): string {
  return indexService.formatIcpFromE8s(PRICE_PER_CALL_E8S * BigInt(calls));
}
