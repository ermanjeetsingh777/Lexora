import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "occupancy_snapshot",
  title: "Seat occupancy snapshot",
  description:
    "Current seat occupancy summary: totals by status (available/occupied/reserved/maintenance) plus recent occupancy trend.",
  inputSchema: {
    days: z.number().int().min(1).max(90).optional().describe("Trend window in days. Defaults to 14."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }) => {
    const { seats, occupancyTrend } = await import("@/lib/mock/data");
    const counts = seats.reduce<Record<string, number>>((acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    }, {});
    const trend = occupancyTrend(days ?? 14);
    const occupancyPct = Math.round(((counts.occupied ?? 0) / seats.length) * 100);
    return {
      content: [
        {
          type: "text",
          text: `${occupancyPct}% occupancy across ${seats.length} seats (occupied ${counts.occupied ?? 0}, available ${counts.available ?? 0}).`,
        },
      ],
      structuredContent: { totalSeats: seats.length, counts, occupancyPct, trend },
    };
  },
});
