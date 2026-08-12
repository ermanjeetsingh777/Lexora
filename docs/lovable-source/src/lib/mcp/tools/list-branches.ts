import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_branches",
  title: "List branches",
  description: "List institution branches with capacity, occupancy, and member counts.",
  inputSchema: {
    institutionId: z.string().optional().describe("Filter to a single institution id."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ institutionId }) => {
    const { branches, institutions } = await import("@/lib/mock/data");
    let rows = branches;
    if (institutionId) rows = rows.filter((b) => b.institutionId === institutionId);
    const items = rows.map((b) => ({
      ...b,
      occupancyPct: b.capacity > 0 ? Math.round((b.occupancy / b.capacity) * 100) : 0,
    }));
    return {
      content: [
        {
          type: "text",
          text: `${items.length} branches across ${institutions.length} institutions.`,
        },
      ],
      structuredContent: { items },
    };
  },
});
