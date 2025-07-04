import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  username: string;
  id: string;

  setUsername: (username: string) => void;
  setID: (id: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      username: "",
      id: "",
      setUsername: (username) => set({ username }),
      setID: (id) => set({ id }),
    }),
    {
      name: "user-storage", // key for localStorage
      version: 1,
    }
  )
);
