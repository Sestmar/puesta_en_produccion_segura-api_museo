import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle, Info, WarningCircle, X } from "@phosphor-icons/react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type ToastVariant = "info" | "success" | "error";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (toast: Omit<ToastItem, "id" | "variant"> & { variant?: ToastVariant }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

const VARIANT_ICON: Record<ToastVariant, typeof Info> = {
  info: Info,
  success: CheckCircle,
  error: WarningCircle,
};

const VARIANT_CLASS: Record<ToastVariant, string> = {
  info: "text-info-400",
  success: "text-success-400",
  error: "text-danger-400",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>((next) => {
    counter += 1;
    setItems((prev) => [
      ...prev,
      { id: counter, variant: "info", ...next },
    ]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, variant: "success" }),
      error: (title, description) => toast({ title, description, variant: "error" }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {items.map((item) => {
          const Icon = VARIANT_ICON[item.variant];
          return (
            <ToastPrimitive.Root
              key={item.id}
              open
              onOpenChange={(open) => {
                if (!open) dismiss(item.id);
              }}
              className="flex items-start gap-3 rounded-card border border-ink-700 bg-ink-850 p-4 shadow-xl shadow-black/40 data-[state=open]:animate-slide-in"
            >
              <Icon size={20} weight="bold" className={cn("mt-0.5", VARIANT_CLASS[item.variant])} />
              <div className="flex-1">
                <ToastPrimitive.Title className="font-display text-sm font-bold text-bone-50">
                  {item.title}
                </ToastPrimitive.Title>
                {item.description ? (
                  <ToastPrimitive.Description className="mt-0.5 text-sm text-mute-400">
                    {item.description}
                  </ToastPrimitive.Description>
                ) : null}
              </div>
              <ToastPrimitive.Close
                aria-label="Cerrar notificación"
                className="text-mute-500 transition-colors hover:text-bone-100"
              >
                <X size={16} weight="bold" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-3 p-4 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return context;
}
