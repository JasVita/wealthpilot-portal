import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UploadProgress {
  /** Celery task-id → progress */
  progressMap: Record<
    string,
    { done: number; total: number; state: "PENDING" | "PROGRESS" | "SUCCESS" | "FAILURE"; failed: any }
  >;
  /** overwrite / add one entry */
  setProgress: (
    taskId: string,
    p: { done: number; total: number; state: UploadProgress["progressMap"][string]["state"]; failed: any }
  ) => void;
  /** remove one entry (e.g. after SUCCESS / FAILURE) */
  clearProgress: (taskId: string) => void;
}

export const useUploadStore = create<UploadProgress>()(
  persist(
    (set, get) => ({
      progressMap: {},
      setProgress: (taskId, p) =>
        set((s) => ({
          progressMap: { ...s.progressMap, [taskId]: { ...p } },
        })),
      clearProgress: (taskId) =>
        set((s) => {
          const { [taskId]: _removed, ...rest } = s.progressMap;
          return { progressMap: rest };
        }),
    }),
    {
      name: "upload-progress-storage", // 🔑 localStorage key
      version: 1,
    }
  )
);
