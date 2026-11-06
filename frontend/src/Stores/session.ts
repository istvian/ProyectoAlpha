import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionState {
  expiresAt: number | null;
  setExpiresAt: (ts: number) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      expiresAt: null,
      setExpiresAt: (ts) => set({ expiresAt: ts }),
      clear: () => set({ expiresAt: null }),
    }),
    { name: "session" },
  ),
);
