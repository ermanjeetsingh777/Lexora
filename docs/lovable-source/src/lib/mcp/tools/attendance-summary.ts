import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "attendance_summary",
  title: "Attendance summary",
  description: "Attendance trend across a rolling window with present/absent/late totals and attendance rate.",
  inputSchema: {
    days: z.number().int().min(1).max(60).optional().describe("Window size in days. Defaults to 14."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }) => {
    const { attendanceTrend } = await import("@/lib/mock/data");
    const range = days ?? 14;
    const trend = attendanceTrend(range);
    const totals = trend.reduce(
      (acc, d) => {
        acc.present += d.present;
        acc.absent += d.absent;
        acc.late += d.late ?? 0;
        return acc;
      },
      { present: 0, absent: 0, late: 0 },
    );
    const all = totals.present + totals.absent + totals.late;
    const rate = all > 0 ? Math.round((totals.present / all) * 100) : 0;
    return {
      content: [
        {
          type: "text",
          text: `${rate}% attendance over ${range}d · ${totals.present} present · ${totals.absent} absent · ${totals.late} late.`,
        },
      ],
      structuredContent: { range, totals, rate, trend },
    };
  },
});
