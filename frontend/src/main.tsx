import "@fontsource/red-hat-display/400.css";
import "@fontsource/red-hat-display/500.css";
import "@fontsource/red-hat-display/600.css";
import "@fontsource/red-hat-display/700.css";
import "@fontsource/red-hat-display/800.css";
import "@fontsource/red-hat-display/900.css";
import "@fontsource/red-hat-text/400.css";
import "@fontsource/red-hat-text/500.css";
import "@fontsource/red-hat-text/600.css";
import "@fontsource/red-hat-text/700.css";
import "@/index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "@/App";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthProvider";
import { isApiError } from "@/lib/api/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // No reintentar errores del cliente (4xx); sí un único reintento en 5xx/red.
        if (isApiError(error) && error.status < 500) return false;
        return failureCount < 1;
      },
    },
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("No se encontró el elemento #root");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <TooltipProvider delayDuration={200}>
            <AuthProvider>
              <App />
            </AuthProvider>
          </TooltipProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
