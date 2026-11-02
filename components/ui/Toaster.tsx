"use client";

import * as Toast from "@radix-ui/react-toast";
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import styles from "./ui.module.css";

type ToastItem = {
  key: number;
  message: string;
  tone: "info" | "error";
  action?: { label: string; onClick: () => void };
};

type ToastApi = {
  show: (message: string, opts?: { action?: ToastItem["action"]; tone?: ToastItem["tone"] }) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = use(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <Toaster>");
  return ctx;
}

let counter = 0;

export function Toaster({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback<ToastApi["show"]>((message, opts) => {
    const item: ToastItem = {
      key: ++counter,
      message,
      tone: opts?.tone ?? "info",
      action: opts?.action,
    };
    // Keep at most two on screen; the newest replaces the oldest.
    setItems((prev) => [...prev.slice(-1), item]);
  }, []);

  const api = useMemo(() => ({ show }), [show]);
  const remove = (key: number) => setItems((prev) => prev.filter((t) => t.key !== key));

  return (
    <ToastContext value={api}>
      <Toast.Provider swipeDirection="down" duration={6000} label="Notification">
        {children}
        {items.map((t) => (
          <Toast.Root
            key={t.key}
            className={styles.toast}
            data-type={t.tone}
            duration={t.action ? 7000 : 5000}
            onOpenChange={(open) => {
              if (!open) remove(t.key);
            }}
          >
            <Toast.Description className={styles.toastText}>{t.message}</Toast.Description>
            {t.action ? (
              <Toast.Action altText={t.action.label} asChild>
                <button type="button" className={styles.toastAction} onClick={t.action.onClick}>
                  {t.action.label}
                </button>
              </Toast.Action>
            ) : null}
          </Toast.Root>
        ))}
        <Toast.Viewport className={styles.viewport} />
      </Toast.Provider>
    </ToastContext>
  );
}
