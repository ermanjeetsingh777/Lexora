import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Armchair, CalendarCheck, Building2,
  CreditCard, Bell, BarChart3, BookOpen, UserCog, Settings, LifeBuoy, ScanLine,
  GraduationCap, BookUser,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const nav = [
  {
    label: "Workspace",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Members", url: "/members", icon: Users },
      { title: "Students", url: "/students", icon: GraduationCap },
      { title: "Teachers", url: "/teachers", icon: BookUser },
      { title: "Seats", url: "/seats", icon: Armchair },
      { title: "Attendance", url: "/attendance", icon: CalendarCheck },
      { title: "Scanner", url: "/attendance/scanner", icon: ScanLine },
    ],
  },
  {
    label: "Organization",
    items: [
      { title: "Institutions", url: "/institutions", icon: Building2 },
      { title: "Branches", url: "/branches", icon: Building2 },
      { title: "Libraries", url: "/libraries", icon: BookOpen },
      { title: "Subscriptions", url: "/subscriptions", icon: CreditCard },
      { title: "Payments", url: "/payments", icon: CreditCard },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Reports", url: "/reports", icon: BarChart3 },
      { title: "Notifications", url: "/notifications", icon: Bell },
    ],
  },
  {
    label: "Library",
    items: [
      { title: "Books", url: "/books", icon: BookOpen },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Users", url: "/users", icon: UserCog },
      { title: "Roles", url: "/roles", icon: UserCog },
      { title: "Settings", url: "/settings", icon: Settings },
      { title: "Support", url: "/support", icon: LifeBuoy },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
          <div className="relative h-8 w-8 shrink-0 rounded-md bg-gradient-primary grid place-items-center text-primary-foreground font-mono font-bold">
            SL
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success ring-2 ring-sidebar" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">SmartLibrary</div>
              <div className="label-mono">v2.4 · Institutional</div>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {nav.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="label-mono">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = pathname === item.url || pathname.startsWith(item.url + "/");
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link to={item.url} className={cn("flex items-center gap-2")}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="px-2 py-1.5 label-mono">
          {!collapsed ? "© Meridian Institute" : "©"}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
