import {
  GearSix,
  Heart,
  List,
  SignIn,
  SignOut,
  User as UserIcon,
  UserPlus,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { Logo } from "@/components/common/Logo";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV_LINKS: { label: string; to: string }[] = [
  { label: "Obras", to: "/obras" },
  { label: "Artistas", to: "/artistas" },
  { label: "Salas", to: "/salas" },
];

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    "relative font-display text-[11px] font-bold uppercase tracking-[0.18em] transition-colors duration-300",
    isActive ? "text-gold-400" : "text-bone-50/80 hover:text-gold-400",
  );
}

function AccountMenu() {
  const { user, status, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const { success } = useToast();

  if (status === "loading") {
    return <Skeleton className="h-9 w-24 rounded-pill" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="text-bone-50 hover:bg-white/10 hover:text-gold-400">
          <Link to="/login">
            <SignIn size={16} weight="bold" /> Ingresar
          </Link>
        </Button>
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link to="/registro">
            <UserPlus size={16} weight="bold" /> Registrarse
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-pill border border-white/10 bg-white/5 py-1 pl-1 pr-3 backdrop-blur-sm transition-colors hover:border-gold-500/50 hover:bg-white/10"
        >
          <Avatar name={user.username} className="size-7" />
          <span className="hidden font-display text-[11px] font-bold uppercase tracking-[0.12em] text-bone-100 sm:block">
            {user.username}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="flex items-center justify-between gap-3">
          <span className="truncate normal-case tracking-normal text-bone-100">
            {user.username}
          </span>
          <Badge variant={isAdmin ? "gold" : "neutral"}>{ROLE_LABELS[user.role]}</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/mi-coleccion")}>
          <Heart size={16} weight="bold" /> Mi colección
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/cuenta")}>
          <UserIcon size={16} weight="bold" /> Mi cuenta
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem onSelect={() => navigate("/admin")}>
            <GearSix size={16} weight="bold" /> Panel de administración
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          onSelect={() => {
            void logout().then(() => {
              success("Sesión cerrada");
              navigate("/");
            });
          }}
        >
          <SignOut size={16} weight="bold" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin } = useAuth();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir menú"
          className="text-bone-50 hover:bg-white/10 lg:hidden"
        >
          <List size={22} weight="bold" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm border-ink-700 bg-ink-900">
        <DialogTitle>Menú</DialogTitle>
        <nav className="flex flex-col gap-1 py-2">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "rounded-control px-3 py-3 font-display text-sm font-bold uppercase tracking-[0.14em] transition-colors",
                  isActive
                    ? "bg-gold-500 text-ink-950"
                    : "text-bone-100 hover:bg-ink-800",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          {user ? (
            <>
              <NavLink
                to="/mi-coleccion"
                onClick={() => setOpen(false)}
                className="rounded-control px-3 py-3 font-display text-sm font-bold uppercase tracking-[0.14em] text-bone-100 transition-colors hover:bg-ink-800"
              >
                Mi colección
              </NavLink>
              <NavLink
                to="/cuenta"
                onClick={() => setOpen(false)}
                className="rounded-control px-3 py-3 font-display text-sm font-bold uppercase tracking-[0.14em] text-bone-100 transition-colors hover:bg-ink-800"
              >
                Mi cuenta
              </NavLink>
              {isAdmin ? (
                <NavLink
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="rounded-control px-3 py-3 font-display text-sm font-bold uppercase tracking-[0.14em] text-bone-100 transition-colors hover:bg-ink-800"
                >
                  Panel de administración
                </NavLink>
              ) : null}
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-control px-3 py-3 font-display text-sm font-bold uppercase tracking-[0.14em] text-gold-400 transition-colors hover:bg-ink-800"
              >
                Ingresar
              </NavLink>
              <NavLink
                to="/registro"
                onClick={() => setOpen(false)}
                className="rounded-control px-3 py-3 font-display text-sm font-bold uppercase tracking-[0.14em] text-bone-100 transition-colors hover:bg-ink-800"
              >
                Registrarse
              </NavLink>
            </>
          )}
        </nav>
      </DialogContent>
    </Dialog>
  );
}

export function SiteHeader() {
  return (
    <header className="fixed top-0 z-40 w-full border-b border-white/10 bg-ink-950/60 backdrop-blur-lg">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav className="hidden items-center gap-10 lg:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <AccountMenu />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
