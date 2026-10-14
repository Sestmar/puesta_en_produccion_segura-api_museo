import {
  ArrowRight,
  Door,
  Image as ImageIcon,
  PaintBrush,
  ShieldCheck,
  ShieldWarning,
  Users as UsersIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";
import { errorMessage } from "@/components/common/QueryState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useArtists, useArtworks, useAuditLogs, useAuditVerification, useRooms, useUsers } from "@/hooks/queries";
import { formatDateTime, formatNumber, humanizeAction } from "@/lib/format";

interface StatCardProps {
  label: string;
  icon: Icon;
  to: string;
  value: number | undefined;
  pending: boolean;
}

function StatCard({ label, icon: IconComponent, to, value, pending }: StatCardProps) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-4 rounded-card border border-ink-700 bg-ink-900 p-5 transition-colors hover:border-gold-500/50"
    >
      <div className="flex items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-control bg-ink-800 text-gold-500">
          <IconComponent size={20} weight="bold" />
        </span>
        <ArrowRight
          size={16}
          weight="bold"
          className="text-mute-600 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-400"
        />
      </div>
      <div className="flex flex-col gap-1">
        {pending ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <span className="font-display text-3xl font-black text-bone-50">
            {value === undefined ? "—" : formatNumber(value)}
          </span>
        )}
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-mute-500">
          {label}
        </span>
      </div>
    </Link>
  );
}

function AuditStatusCard() {
  const verification = useAuditVerification();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck size={18} weight="bold" className="text-gold-500" /> Integridad de la
          auditoría
        </CardTitle>
        <CardDescription>
          El registro de auditoría es una cadena verificable. Comprobamos que no haya sido
          alterado.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {verification.isPending ? (
          <Skeleton className="h-12 w-full" />
        ) : verification.isError ? (
          <p className="text-sm text-danger-400">
            No se pudo verificar la cadena: {errorMessage(verification.error)}
          </p>
        ) : verification.data?.valid ? (
          <div className="flex items-center gap-3 rounded-control border border-success-500/30 bg-success-500/10 p-4">
            <ShieldCheck size={22} weight="bold" className="text-success-400" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-bone-50">Cadena íntegra</span>
              <span className="text-xs text-mute-400">
                {formatNumber(verification.data.checked)}{" "}
                {verification.data.checked === 1 ? "evento verificado" : "eventos verificados"}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-control border border-danger-500/30 bg-danger-500/10 p-4">
            <ShieldWarning size={22} weight="bold" className="text-danger-400" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-bone-50">Se detectó una inconsistencia</span>
              <span className="text-xs text-mute-400">
                {verification.data?.reason ?? "Cadena alterada."}
                {verification.data?.first_invalid_id != null
                  ? ` (evento ${verification.data.first_invalid_id})`
                  : ""}
              </span>
            </div>
          </div>
        )}
        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => verification.refetch()}
            loading={verification.isFetching}
          >
            Verificar de nuevo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const artworksQuery = useArtworks({ limit: 1 });
  const artistsQuery = useArtists({ limit: 1 });
  const roomsQuery = useRooms({ limit: 1 });
  const usersQuery = useUsers({ limit: 1 });
  const auditQuery = useAuditLogs({ limit: 6 });

  const recent = auditQuery.data?.items ?? [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Resumen"
        description="Estado general del acervo y de la seguridad del sistema."
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Obras"
          icon={ImageIcon}
          to="/admin/obras"
          value={artworksQuery.data?.total}
          pending={artworksQuery.isPending}
        />
        <StatCard
          label="Artistas"
          icon={PaintBrush}
          to="/admin/artistas"
          value={artistsQuery.data?.total}
          pending={artistsQuery.isPending}
        />
        <StatCard
          label="Salas"
          icon={Door}
          to="/admin/salas"
          value={roomsQuery.data?.total}
          pending={roomsQuery.isPending}
        />
        <StatCard
          label="Usuarios"
          icon={UsersIcon}
          to="/admin/usuarios"
          value={usersQuery.data?.total}
          pending={usersQuery.isPending}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <AuditStatusCard />

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle>Actividad reciente</CardTitle>
              <CardDescription>Últimos eventos registrados en el sistema.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/auditoria">
                Ver todo <ArrowRight size={14} weight="bold" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {auditQuery.isPending ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-mute-400">Sin eventos todavía.</p>
            ) : (
              recent.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 border-b border-ink-800 py-2.5 last:border-0"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm text-bone-100">
                      {humanizeAction(entry.action)}
                    </span>
                    <span className="truncate text-xs text-mute-500">
                      {entry.actor ?? "sistema"} · {formatDateTime(entry.created_at)}
                    </span>
                  </div>
                  {entry.resource_type ? (
                    <Badge variant="outline" className="shrink-0">
                      {entry.resource_type}
                    </Badge>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
