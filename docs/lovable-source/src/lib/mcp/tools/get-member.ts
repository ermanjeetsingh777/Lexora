import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_member",
  title: "Get member",
  description: "Fetch a single SmartLibrary member's full profile by member id.",
  inputSchema: {
    id: z.string().min(1).describe("Member id (e.g. m_012 or demo_mem_...)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }) => {
    const { members } = await import("@/lib/mock/data");
    const m = members.find((row) => row.id === id);
    if (!m) {
      return {
        content: [{ type: "text", text: `No member found with id ${id}.` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: `${m.name} · ${m.status} · ${m.plan} · seat ${m.seatNumber ?? "—"}` }],
      structuredContent: { member: m },
    };
  },
});
