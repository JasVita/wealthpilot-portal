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

export interface Client {
  id: string;
  name: string;
  pieChartData: PieChartData | null; // NEW
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

        if (!user_id) {
          throw new Error("User not logged in – cannot add client");
        }

        const tempId = `tmp-${crypto.randomUUID()}`;
        const tempData: Client = {
          id: tempId,
          name,
          pieChartData: null,
          news: null,
          alerts: null,
          overviews: [],
        };
        const prevState = get(); // snapshot for rollback

        get().setClient(tempData);

        try {
          // const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL2}/add-client`, { name, user_id });
          const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/add-client`, { name, user_id });

          if (res.status !== 201 && res.status !== 200) throw new Error(res.statusText);

          const saved: { id: string } = res.data;

          set((s) => {
            const { [tempId]: _, ...rest } = s.clients;
            return {
              clients: { ...rest, [saved.id]: { ...tempData, id: saved.id } },
              order: s.order.map((id) => (id === tempId ? saved.id : id)),
            };
          });
        } catch (err) {
          set(prevState); // rollback entire state
          get().deleteClient(tempId);
          throw err;
        }
      },

      deleteClient: async (id: string) => {
        const prev = get(); /* snapshot for rollback */
        set((s) => {
          /* optimistic remove    */
          const { [id]: _omit, ...rest } = s.clients;
          return { clients: rest, order: s.order.filter((x) => x !== id) };
        });

        try {
          const { id: user_id } = useUserStore.getState();
          await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/client/${id}`, {
            params: { user_id },
          });
        } catch (err) {
          /* rollback on failure  */
          set(prev);
          throw err;
        }
      },

      updateClient: async (id: string, partial: Partial<Omit<Client, "id">>) => {
        const prev = get();
        set((s) => ({
          clients: { ...s.clients, [id]: { ...s.clients[id], ...partial } },
        })); /* optimistic update    */

        try {
          const { id: user_id } = useUserStore.getState();
          await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/client/${id}`, {
            user_id,
            ...partial,
          });
        } catch (err) {
          set(prev); /* rollback */
          throw err;
        }
      },

      loadClients: async () => {
        const { id: user_id } = useUserStore.getState();
        if (!user_id) throw new Error("User not logged in – cannot fetch clients");

        type Row = { id: string; name: string; pie_chart_data: PieChartData | null };

        const res = await axios.get<{ clients: Row[] }>(`${process.env.NEXT_PUBLIC_API_URL}/clients`, {
          params: { user_id },
        });
        if (res.status !== 200) throw new Error(res.statusText);

        const list = res.data.clients;

        set(() => {
          const clients: Record<string, Client> = {};
          const order: string[] = [];

          for (const { id, name, pie_chart_data } of list) {
            clients[id] = {
              id,
              name,
              pieChartData: pie_chart_data, // ← stash it
              news: null,
              alerts: null,
              overviews: [],
            };
            order.push(id);
          }
          return { clients, order };
        });
      },

      resetStore: () => {
        // 1) clear Zustand state in memory
        set({ clients: {}, order: [], currClient: "" });

        // 2) remove the persisted snapshot (safe for SSR)
        if (typeof window !== "undefined") {
          localStorage.removeItem("clients-storage");
        }
      },
    }),
    {
      name: "clients-storage",
      version: 1,
    }
  )
);
