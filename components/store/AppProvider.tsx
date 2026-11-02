"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Command } from "@/lib/domain/commands";
import { localDateKey } from "@/lib/domain/dates";
import type { UserDoc } from "@/lib/domain/types";
import { useToast } from "@/components/ui/Toaster";
import { DocStore, type Snapshot } from "./doc-store";
import { RandomPicker } from "@/components/home/RandomPicker";

type User = { name: string; username: string };

type DocValue = Snapshot & {
  /** The viewer's local calendar day, e.g. 2026-11-02. */
  today: string;
  user: User;
  /** Tasks the user picked for today, in the order they were picked. */
  todayIds: readonly string[];
};

type Actions = {
  dispatch: (cmd: Command) => boolean;
  openPicker: () => void;
  addToday: (id: string) => void;
  removeToday: (id: string) => void;
};

const DocContext = createContext<DocValue | null>(null);
const ActionsContext = createContext<Actions | null>(null);

export function useDoc(): DocValue {
  const v = use(DocContext);
  if (!v) throw new Error("useDoc must be used inside <AppProvider>");
  return v;
}

export function useActions(): Actions {
  const v = use(ActionsContext);
  if (!v) throw new Error("useActions must be used inside <AppProvider>");
  return v;
}

const TZ_COOKIE = "tz";

function syncTimeZoneCookie() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!zone) return;
  if (!document.cookie.split("; ").some((c) => c === `${TZ_COOKIE}=${zone}`)) {
    document.cookie = `${TZ_COOKIE}=${zone}; path=/; max-age=31536000; samesite=lax`;
  }
}

export function AppProvider({
  initialDoc,
  initialToday,
  user,
  children,
}: {
  initialDoc: UserDoc;
  initialToday: string;
  user: User;
  children: ReactNode;
}) {
  const toast = useToast();
  const router = useRouter();

  const [store] = useState(
    () =>
      new DocStore(initialDoc, {
        onError: () => {},
        onSignedOut: () => {},
      }),
  );

  useEffect(() => {
    store.setHooks({
      onError: (message) => toast.show(message, { tone: "error" }),
      onSignedOut: () => router.push("/login"),
    });
  }, [store, toast, router]);

  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  // Calendar day follows the viewer's clock, so a tab left open past midnight rolls over.
  const [today, setToday] = useState(initialToday);
  useEffect(() => {
    syncTimeZoneCookie();
    const update = () => setToday(localDateKey());
    update();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        update();
        void store.resync(20_000);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const timer = window.setInterval(update, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.clearInterval(timer);
    };
  }, [store]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedIds, setPickedIds] = useState<readonly string[]>([]);

  // Finished picks stay (crossed out) until the page reloads; deleted tasks drop out.
  const todayIds = useMemo(
    () => pickedIds.filter((id) => snapshot.index.byId.has(id)),
    [pickedIds, snapshot.index],
  );

  const dispatch = useCallback((cmd: Command) => store.dispatch(cmd), [store]);
  const openPicker = useCallback(() => setPickerOpen(true), []);
  const addToday = useCallback(
    (id: string) => setPickedIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
    [],
  );
  const removeToday = useCallback(
    (id: string) => setPickedIds((prev) => prev.filter((x) => x !== id)),
    [],
  );

  const actions = useMemo<Actions>(
    () => ({ dispatch, openPicker, addToday, removeToday }),
    [dispatch, openPicker, addToday, removeToday],
  );

  const value = useMemo<DocValue>(
    () => ({ ...snapshot, today, user, todayIds }),
    [snapshot, today, user, todayIds],
  );

  return (
    <ActionsContext value={actions}>
      <DocContext value={value}>
        {children}
        <RandomPicker open={pickerOpen} onOpenChange={setPickerOpen} />
      </DocContext>
    </ActionsContext>
  );
}
