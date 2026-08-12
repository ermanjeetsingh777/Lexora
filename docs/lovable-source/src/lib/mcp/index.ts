import { defineMcp } from "@lovable.dev/mcp-js";
import listMembers from "./tools/list-members";
import getMember from "./tools/get-member";
import occupancySnapshot from "./tools/occupancy-snapshot";
import revenueSummary from "./tools/revenue-summary";
import attendanceSummary from "./tools/attendance-summary";
import listBranches from "./tools/list-branches";

export default defineMcp({
  name: "smartlibrary-mcp",
  title: "SmartLibrary MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for the SmartLibrary admin app. Use these to inspect members, branches, seat occupancy, revenue, and attendance across the demo dataset.",
  tools: [listMembers, getMember, listBranches, occupancySnapshot, revenueSummary, attendanceSummary],
});
