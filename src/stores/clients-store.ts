import axios from "axios";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useUserStore } from "@/stores/user-store";

export type News = Record<string, any>;
export type Alerts = Record<string, any>;
export type Overview = Record<string, any>;

export interface PieChartData {
  charts: {
    data: number[];
    title: string;
    colors: string[];
    labels: string[];
  }[];
}

export interface ClientSummary {
  code?: string;
  total_custodians?: number;
  net_assets_usd?: number;
  total_assets_usd?: number;
  total_debts_usd?: number;
  rm?: string;
  mandate_type?: string;
  risk_profile?: number;
  status?: string;
  app_status?: string;
  starred?: boolean;
}

export interface Client {
  id: string;
  name: string;
  pieChartData: PieChartData | null;
  summary?: ClientSummary;
  news: News | null;
  alerts: Alerts | null;
  overviews: Overview[];
}

interface ClientState {
  clients: Record<string, Client>;
  order: string[];
  currClient: string;

  setCurrClient: (id: string) => void;
  setClient: (c: Client) => void;
  addClient: (name: string) => void;
  deleteClient: (id: string) => void;
  updateClient: (id: string, partial: Partial<Omit<Client, "id">>) => void;

  // ⬇️ NEW: patch fields under client.summary (used by the Profile edit dialogs)
  updateClientSummary: (id: string, patch: Record<string, any>) => void;

  loadClients: () => Promise<void>;
  resetStore: () => void;
}

export const useClientStore = create<ClientState>()(
  persist(
    (set, get) => ({
      clients: {},
      order: [],
      currClient: "",

      setCurrClient: (id) => set(() => ({ currClient: id })),

      setClient: (client) =>
        set((s) => {
          const exists = !!s.clients[client.id];
          return {
            clients: { ...s.clients, [client.id]: client },
            order: exists ? s.order : [client.id, ...s.order],
          };
        }),

      addClient: async (name: string) => {
        const { id: user_id } = useUserStore.getState();
        if (!user_id) throw new Error("User not logged in – cannot add client");

        const tempId = `tmp-${crypto.randomUUID()}`;
        const tempData: Client = {
          id: tempId,
          name,
          pieChartData: null,
          summary: {},
          news: null,
          alerts: null,
          overviews: [],
        };
        const prevState = get();

        get().setClient(tempData);

        try {
          const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/add-client`, { name, user_id });
          if (res.status !== 201 && res.status !== 200) throw new Error(res.statusText);
          const saved: { id: string } = res.data;

          set((s) => {
            const { [tempId]: _omit, ...rest } = s.clients;
            return {
              clients: { ...rest, [saved.id]: { ...tempData, id: saved.id } },
              order: s.order.map((x) => (x === tempId ? saved.id : x)),
            };
          });
        } catch (err) {
          set(prevState);
          get().deleteClient(tempId);
          throw err;
        }
      },

      deleteClient: async (id: string) => {
        const prev = get();
        set((s) => {
          const { [id]: _omit, ...rest } = s.clients;
          return { clients: rest, order: s.order.filter((x) => x !== id) };
        });

        try {
          const { id: user_id } = useUserStore.getState();
          await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/client/${id}`, { params: { user_id } });
        } catch (err) {
          set(prev);
          throw err;
        }
      },

      updateClient: async (id: string, partial: Partial<Omit<Client, "id">>) => {
        const prev = get();
        set((s) => ({ clients: { ...s.clients, [id]: { ...s.clients[id], ...partial } } }));

        try {
          const { id: user_id } = useUserStore.getState();
          await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/client/${id}`, { user_id, ...partial });
        } catch (err) {
          set(prev);
          throw err;
        }
      },

      // ⬇️ NEW: local patch for summary fields (no API call needed)
      updateClientSummary: (id, patch) =>
        set((state) => {
          const prev = state.clients[id];
          if (!prev) return state;
          return {
            clients: {
              ...state.clients,
              [id]: {
                ...prev,
                summary: { ...(prev.summary ?? {}), ...(patch ?? {}) } as ClientSummary,
              },
            },
          };
        }),

      // ---------- UPDATED: pulls from API, then (optionally) merges /mocks/clients.json ----------
      loadClients: async () => {
        const { id: user_id } = useUserStore.getState();
        if (!user_id) {
          console.warn("No user logged in – cannot load clients.");
          set(() => ({ clients: {}, order: [] }));
          return;
        }

        let apiList: any[] = [];
        try {
          // ✅ use internal Next route; only the logged-in user’s clients are returned
          const res = await axios.get("/api/clients", { params: { user_id } });
          apiList = res.data?.clients ?? [];
        } catch (e) {
          console.error("Failed to load clients from /api/clients:", e);
          apiList = [];
        }

        set(() => {
          const clients: Record<string, Client> = {};
          const order: string[] = [];

          for (const row of apiList) {
            const { id, name, pieChartData, summary } = row;
            clients[String(id)] = {
              id: String(id),
              name,
              pieChartData: pieChartData ?? null,
              summary: summary ?? {},
              news: null,
              alerts: null,
              overviews: [],
            };
            order.push(String(id));
          }
          return { clients, order };
        });
      },

      resetStore: () => {
        set({ clients: {}, order: [], currClient: "" });
        if (typeof window !== "undefined") localStorage.removeItem("clients-storage");
      },
    }),
    { name: "clients-storage", version: 3 }
  )
);