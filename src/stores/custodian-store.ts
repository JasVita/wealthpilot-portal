import { create } from "zustand";

type CustodianState = {
  selected: string; 
  setSelected: (v: string) => void;
};

export const useCustodianStore = create<CustodianState>((set) => ({
  selected: "ALL",
  setSelected: (v) => set({ selected: v }),
}));
