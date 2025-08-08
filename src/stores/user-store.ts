import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  username: string;
  id: string;

  setUsername: (username: string) => void;
  setID: (id: string) => void;
  resetStore: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      username: "",
      id: "",
      setUsername: (username) => set({ username }),
      setID: (id) => set({ id }),
      resetStore: () => {
        // 1) reset Zustand state
        set({ username: "", id: "" });

        // 2) remove persisted snapshot
        if (typeof window !== "undefined") {
          localStorage.removeItem("user-storage");
        }
      },
    }),
    {
      name: "user-storage", // key for localStorage
      version: 1,
    }
  )
);
