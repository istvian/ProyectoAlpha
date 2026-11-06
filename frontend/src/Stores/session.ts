import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SessionState {
  expiresAt: number;
  setExpiresAt: (ts: number) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      expiresAt: 15 * 1000 * 60,
      setExpiresAt: (ts) => set({ expiresAt: ts }),
      clear: () => set({ expiresAt: 15 * 1000 * 60 }),
    }),
    { name: "session" },
  ),
);
