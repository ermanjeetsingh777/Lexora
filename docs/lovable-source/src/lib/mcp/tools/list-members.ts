import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_members",
  title: "List members",
  description:
    "List SmartLibrary members with optional status, plan, and shift filters. Returns id, name, email, plan, status, shift, seatNumber, feesOwed.",
  inputSchema: {
    status: z.enum(["Active", "Inactive", "Suspended"]).optional().describe("Filter by member status."),
    plan: z.string().optional().describe("Filter by plan name (Basic, Plus, Pro, Annual)."),
    shift: z.enum(["Morning", "Afternoon", "Evening", "Night"]).optional().describe("Filter by shift."),
    limit: z.number().int().min(1).max(200).optional().describe("Maximum rows returned. Defaults to 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, plan, shift, limit }) => {
    const { members } = await import("@/lib/mock/data");
    let rows = members;
    if (status) rows = rows.filter((m) => m.status === status);
    if (plan) rows = rows.filter((m) => m.plan.toLowerCase() === plan.toLowerCase());
    if (shift) rows = rows.filter((m) => m.shift === shift);
    const cap = limit ?? 50;
    const items = rows.slice(0, cap).map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      status: m.status,
      shift: m.shift,
      seatNumber: m.seatNumber,
      plan: m.plan,
      feesOwed: m.feesOwed,
      branch: m.branch,
    }));
    return {
      content: [
        {
          type: "text",
          text: `Returned ${items.length} of ${rows.length} matching members (total ${members.length}).`,
        },
      ],
      structuredContent: { total: rows.length, items },
    };
  },
});
