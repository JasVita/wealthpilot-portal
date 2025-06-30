// stores/docStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import type { docid } from "@/types";

interface DocState {
  docids: docid[];

  saveIds: (newIds: docid[]) => void;
  //   uploadDocs: (file: File) => Promise<void>;
}

export const useDocStore = create<DocState>()(
  persist(
    (set, get) => ({
      docids: [],
      saveIds: (newIds: docid[]) => {
        const newDocs = [...get().docids, ...newIds];
        set({ docids: newDocs });
      },
    }),
    { name: "doc-storage", version: 1 }
  )
);
