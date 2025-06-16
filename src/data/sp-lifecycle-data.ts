export interface LifecycleEvent {
  id: string;
  type: "monitor" | "unofficial_result" | "settlement";
  autocallObservation?: number;
  finalFixing?: number;
  autocalled?: number;
  expiredCash?: number;
  expiredPhysical?: number;
  couponPayment?: number;
  finalSettlement?: number;
  settlementNumbers?: number;
}

export interface ClientDistribution {
  id: string;
  clientNo: string;
  position: number;
  totalAmount: number;
}

export interface ProductDistribution {
  id: string;
  name: string;
  value: number;
  color: string;
}

export const mockLifecycleEvents: LifecycleEvent[] = [
  {
    id: "1",
    type: "monitor",
    autocallObservation: 15,
    finalFixing: 8,
  },
  {
    id: "2",
    type: "unofficial_result",
    autocalled: 12,
    expiredCash: 5,
    expiredPhysical: 3,
  },
  {
    id: "3",
    type: "settlement",
    couponPayment: 25,
    finalSettlement: 18,
    settlementNumbers: 43,
  },
];

export const mockClientDistribution: ClientDistribution[] = [
  { id: "1", clientNo: "CLI001", position: 1500000, totalAmount: 15750000 },
  { id: "2", clientNo: "CLI002", position: 2300000, totalAmount: 24150000 },
  { id: "3", clientNo: "CLI003", position: 890000, totalAmount: 9344500 },
  { id: "4", clientNo: "CLI004", position: 1750000, totalAmount: 18375000 },
  { id: "5", clientNo: "CLI005", position: 3200000, totalAmount: 33600000 },
  { id: "6", clientNo: "CLI006", position: 950000, totalAmount: 9975000 },
  { id: "7", clientNo: "CLI007", position: 1100000, totalAmount: 11550000 },
  { id: "8", clientNo: "CLI008", position: 2800000, totalAmount: 29400000 },
];

export const mockProductDistribution: ProductDistribution[] = [
  { id: "1", name: "Autocall Notes", value: 35, color: "#3b82f6" },
  { id: "2", name: "Barrier Options", value: 25, color: "#ef4444" },
  { id: "3", name: "Capital Protected", value: 20, color: "#10b981" },
  { id: "4", name: "Yield Enhancement", value: 15, color: "#f59e0b" },
  { id: "5", name: "Others", value: 5, color: "#8b5cf6" },
];

export const totalSPPosition = 14490000;
export const totalAmount = 152144500;
