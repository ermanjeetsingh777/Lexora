import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Moon, Sun, Search, LogOut } from "lucide-react";
import { useTheme } from "@/lib/store/theme";
import { useAuth } from "@/lib/store/auth";
import { useRouterState, Link, useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { notifications } from "@/lib/mock/data";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

export function Topbar() {
  const { mode, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate() as (opts: any) => void;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segs = pathname.split("/").filter(Boolean);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur px-3 md:px-4">
      <SidebarTrigger />
      <nav className="hidden md:flex items-center gap-1.5 text-sm">
        {segs.map((seg, i) => {
          const href = "/" + segs.slice(0, i + 1).join("/");
          const isLast = i === segs.length - 1;
          return (
            <span key={href} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground/50">/</span>}
              {isLast ? (
                <span className="font-medium capitalize">{seg.replace(/-/g, " ")}</span>
              ) : (
                <Link to={href as any} className="text-muted-foreground hover:text-foreground capitalize">
                  {seg.replace(/-/g, " ")}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members, seats, branches…"
            className="pl-8 h-9 w-72 bg-muted/40"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex h-5 items-center rounded border bg-background px-1.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <div className="text-sm font-semibold">Notifications</div>
              <Link to="/notifications" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y">
              {notifications.slice(0, 5).map((n) => (
                <div key={n.id} className="p-3 hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{n.title}</div>
                    <span className="label-mono">{n.timestamp}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md border px-1 py-1 hover:bg-muted/50">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-xs">
                  {user?.name?.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block pr-2 text-left">
                <div className="text-xs font-semibold leading-tight">{user?.name}</div>
                <div className="label-mono leading-tight">{user?.role}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm">{user?.name}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/settings/profile" })}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await logout();
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
