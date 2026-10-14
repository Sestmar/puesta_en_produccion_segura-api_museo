import {
  ArrowCounterClockwise,
  CheckCircle,
  List,
  MagnifyingGlass,
  ShieldCheck,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { errorMessage } from "@/components/common/QueryState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAuditLogs } from "@/hooks/queries";
import { useVerifyAuditChain } from "@/hooks/mutations";
import { formatDateTime, formatNumber, humanizeAction } from "@/lib/format";
import type { AuditListParams } from "@/lib/api/types";

const PAGE_SIZE = 25;
const ACTION_SENTINEL = "all";

const COMMON_ACTIONS = [
  { value: ACTION_SENTINEL, label: "Todas" },
  { value: "auth.login.success", label: "Login exitoso" },
  { value: "auth.login.failed", label: "Login fallido" },
  { value: "auth.login.locked", label: "Cuenta bloqueada" },
  { value: "auth.login.blocked", label: "Cuenta deshabilitada" },
  { value: "auth.logout", label: "Logout" },
  { value: "auth.refresh", label: "Refresh" },
  { value: "auth.register", label: "Registro" },
  { value: "auth.password.changed", label: "Cambio de contraseña" },
  { value: "auth.session.revoked", label: "Sesión revocada" },
  { value: "auth.sessions.revoked_all", label: "Todas las sesiones revocadas" },
  { value: "admin.user.role_changed", label: "Rol de usuario cambiado" },
  { value: "admin.user.deactivated", label: "Usuario desactivado" },
  { value: "admin.user.activated", label: "Usuario activado" },
  { value: "write.create", label: "Creación" },
  { value: "write.update", label: "Actualización" },
  { value: "write.delete", label: "Eliminación" },
];

function formatResource(
  type: string | null | undefined,
  id: number | null | undefined,
): string {
  if (!type) return "—";
  return id != null ? `${type} #${id}` : type;
}

function formatDetails(details: Record<string, unknown> | null | undefined): string {
  if (!details || Object.keys(details).length === 0) return "—";
  const text = JSON.stringify(details);
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

function VerificationResult({
  result,
  onClear,
}: {
  result: { valid: boolean; checked: number; reason: string | null };
  onClear: () => void;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-card border p-4 ${
        result.valid
          ? "border-success-500/30 bg-success-500/10"
          : "border-danger-500/30 bg-danger-500/10"
      }`}
    >
      <div className="flex items-start gap-3">
        {result.valid ? (
          <CheckCircle size={22} weight="bold" className="mt-0.5 text-success-400" />
        ) : (
          <XCircle size={22} weight="bold" className="mt-0.5 text-danger-400" />
        )}
        <div className="flex flex-col gap-1">
          <p className="font-display text-sm font-bold uppercase tracking-[0.1em] text-bone-50">
            {result.valid ? "Cadena verificada" : "Cadena comprometida"}
          </p>
          <p className="text-sm text-mute-400">
            {result.valid
              ? `Se comprobaron ${formatNumber(result.checked)} entradas y la cadena es válida.`
              : result.reason ?? "La cadena de auditoría no es válida."}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="icon" aria-label="Cerrar resultado" onClick={onClear}>
        <WarningCircle size={16} weight="bold" />
      </Button>
    </div>
  );
}

export function AdminAuditPage() {
  const { success, error: errorToast } = useToast();
  const [page, setPage] = useState(0);
  const [action, setAction] = useState(ACTION_SENTINEL);
  const [actor, setActor] = useState("");
  const [requestId, setRequestId] = useState("");
  const debouncedActor = useDebouncedValue(actor, 350);
  const debouncedRequestId = useDebouncedValue(requestId, 350);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    checked: number;
    reason: string | null;
  } | null>(null);

  const params: AuditListParams = useMemo(
    () => ({
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
      action: action === ACTION_SENTINEL ? undefined : action,
      actor: debouncedActor.trim() || undefined,
      request_id: debouncedRequestId.trim() || undefined,
    }),
    [page, action, debouncedActor, debouncedRequestId],
  );

  const auditQuery = useAuditLogs(params);
  const verifyMutation = useVerifyAuditChain();

  const logs = auditQuery.data?.items ?? [];
  const total = auditQuery.data?.total ?? 0;

  function resetFilters() {
    setAction(ACTION_SENTINEL);
    setActor("");
    setRequestId("");
    setPage(0);
  }

  async function handleVerify() {
    try {
      const result = await verifyMutation.mutateAsync();
      setVerificationResult(result);
      if (result.valid) {
        success("Cadena de auditoría válida", `Se verificaron ${formatNumber(result.checked)} entradas.`);
      } else {
        errorToast("Cadena de auditoría inválida", result.reason ?? "Se detectó una alteración en el registro.");
      }
    } catch (error) {
      errorToast("No se pudo verificar la cadena", errorMessage(error));
    }
  }

  const hasActiveFilters =
    action !== ACTION_SENTINEL || actor !== "" || requestId !== "";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Auditoría"
        description="Registro inmutable de acciones sobre el sistema. Verificá la integridad de la cadena de hashes."
        action={
          <Button
            variant="secondary"
            onClick={handleVerify}
            loading={verifyMutation.isPending}
          >
            <ShieldCheck size={16} weight="bold" /> Verificar cadena
          </Button>
        }
      />

      {verificationResult ? (
        <VerificationResult
          result={verificationResult}
          onClear={() => setVerificationResult(null)}
        />
      ) : null}

      <div className="flex flex-col gap-4 rounded-card border border-ink-700 bg-ink-900 p-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="audit-action" className="text-xs font-bold uppercase tracking-[0.12em] text-mute-400">
            Acción
          </label>
          <Select value={action} onValueChange={(value) => { setAction(value); setPage(0); }}>
            <SelectTrigger id="audit-action">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_ACTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="audit-actor" className="text-xs font-bold uppercase tracking-[0.12em] text-mute-400">
            Actor
          </label>
          <div className="relative">
            <MagnifyingGlass
              size={16}
              weight="bold"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute-500"
            />
            <Input
              id="audit-actor"
              placeholder="Nombre de usuario"
              value={actor}
              onChange={(event) => { setActor(event.target.value); setPage(0); }}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="audit-request" className="text-xs font-bold uppercase tracking-[0.12em] text-mute-400">
            Request ID
          </label>
          <div className="relative">
            <MagnifyingGlass
              size={16}
              weight="bold"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute-500"
            />
            <Input
              id="audit-request"
              placeholder="ID de petición"
              value={requestId}
              onChange={(event) => { setRequestId(event.target.value); setPage(0); }}
              className="pl-10"
            />
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          className="shrink-0"
        >
          <ArrowCounterClockwise size={16} weight="bold" /> Limpiar
        </Button>
      </div>

      {auditQuery.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={List}
          title="Sin registros"
          description="No hay entradas de auditoría que coincidan con los filtros."
          action={
            hasActiveFilters ? (
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                Limpiar filtros
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Recurso</TableHead>
                <TableHead className="w-48">Request ID</TableHead>
                <TableHead>Detalles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs text-mute-400">
                    {formatDateTime(log.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="info">{humanizeAction(log.action)}</Badge>
                  </TableCell>
                  <TableCell className="font-medium text-bone-50">
                    {log.actor ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-mute-400">
                    {formatResource(log.resource_type, log.resource_id)}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-xs font-mono text-mute-500">
                    {log.request_id ?? "—"}
                  </TableCell>
                  <TableCell
                    className="max-w-xs truncate text-xs text-mute-500"
                    title={formatDetails(log.details)}
                  >
                    {formatDetails(log.details)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
