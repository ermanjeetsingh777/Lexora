import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/store/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAuthenticated, initialized } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (initialized && !isAuthenticated && typeof window !== "undefined") {
      const dest = window.location.pathname + window.location.search + window.location.hash;
      window.location.replace(`/login?redirect=${encodeURIComponent(dest)}`);
    }
  }, [initialized, isAuthenticated]);


  if (!initialized) return null;
  if (!isAuthenticated) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mx-auto max-w-7xl space-y-6"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
