import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "revenue_summary",
  title: "Revenue summary",
  description:
    "Revenue and renewals across a rolling window plus payment status counts (Paid, Pending, Failed) and method mix.",
  inputSchema: {
    days: z.number().int().min(1).max(90).optional().describe("Window size in days. Defaults to 30."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }) => {
    const { revenueTrend, payments } = await import("@/lib/mock/data");
    const range = days ?? 30;
    const trend = revenueTrend(range);
    const totalRevenue = trend.reduce((s, r) => s + r.revenue, 0);
    const totalRenewals = trend.reduce((s, r) => s + r.renewals, 0);
    const statusCounts = payments.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, {});
    const methodMix = payments.reduce<Record<string, number>>((acc, p) => {
      acc[p.method] = (acc[p.method] ?? 0) + p.amount;
      return acc;
    }, {});
    return {
      content: [
        {
          type: "text",
          text: `₹${totalRevenue.toLocaleString()} revenue over ${range}d · ₹${totalRenewals.toLocaleString()} renewals · ${statusCounts.Failed ?? 0} failed payments.`,
        },
      ],
      structuredContent: { range, totalRevenue, totalRenewals, statusCounts, methodMix, trend },
    };
  },
});
