import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TickerBar } from "@/components/layout/TickerBar";

/** Vuelve al inicio de la página al cambiar de ruta. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <TickerBar />
      <SiteHeader />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
