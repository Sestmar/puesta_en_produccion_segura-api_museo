import {
  Gauge,
  GearSix,
  Image as ImageIcon,
  PaintBrush,
  SignOut,
  Users as UsersIcon,
  ArrowSquareOut,
  List,
  X,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { Logo } from "@/components/common/Logo";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { label: string; to: string; icon: typeof Gauge; end?: boolean }[] = [
  { label: "Resumen", to: "/admin", icon: Gauge, end: true },
  { label: "Obras", to: "/admin/obras", icon: ImageIcon },
  { label: "Artistas", to: "/admin/artistas", icon: PaintBrush },
  { label: "Salas", to: "/admin/salas", icon: GearSix },
  { label: "Usuarios", to: "/admin/usuarios", icon: UsersIcon },
  { label: "Auditoría", to: "/admin/auditoria", icon: List },
];

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-control px-3 py-2.5 font-display text-xs font-bold uppercase tracking-[0.12em] transition-colors",
              isActive
                ? "bg-gold-500 text-ink-950"
                : "text-bone-200 hover:bg-ink-800 hover:text-gold-400",
            )
          }
        >
          <item.icon size={18} weight="bold" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { success } = useToast();

  return (
    <div className="flex h-full flex-col gap-6 p-5">
      <Logo />

      <AdminNav onNavigate={onNavigate} />

      <div className="mt-auto flex flex-col gap-3 border-t border-ink-800 pt-5">
        <Link
          to="/"
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-mute-400 transition-colors hover:text-gold-400"
        >
          <ArrowSquareOut size={15} weight="bold" /> Ver sitio público
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <Avatar name={user.username} className="size-8" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-bone-50">{user.username}</p>
              <Badge variant="gold" className="mt-0.5">
                Administrador
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cerrar sesión"
              onClick={() => {
                void logout().then(() => {
                  success("Sesión cerrada");
                  navigate("/");
                });
              }}
            >
              <SignOut size={18} weight="bold" />
            </Button>
          </div>
        ) : (
          <Skeleton className="h-9 w-full" />
        )}
      </div>
    </div>
  );
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-ink-950">
      <aside className="hidden w-64 shrink-0 border-r border-ink-800 bg-ink-900 lg:flex">
        <SidebarBody />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-ink-800 bg-ink-900">
            <button
              type="button"
              aria-label="Cerrar menú"
              className="absolute right-3 top-4 flex size-9 items-center justify-center rounded-pill text-mute-400 hover:bg-ink-800 hover:text-bone-50"
              onClick={() => setMobileOpen(false)}
            >
              <X size={18} weight="bold" />
            </button>
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-ink-800 bg-ink-950/85 px-4 backdrop-blur-md lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir menú"
            onClick={() => setMobileOpen(true)}
          >
            <List size={22} weight="bold" />
          </Button>
          <span className="font-display text-sm font-bold uppercase tracking-[0.18em] text-bone-50">
            Administración
          </span>
        </header>

        <main className="min-w-0 flex-1">
          <div className="container-page py-8 lg:py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
