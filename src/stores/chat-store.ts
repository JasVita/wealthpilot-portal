import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import { type Message } from "@/types";
import { useClientStore } from "./clients-store";
import { useUserStore } from "./user-store";

interface ChatState {
  messages: Message[];
  chatInput: string;
  msgLoad: boolean;

  setChatInput: (input: string) => void;
  addMessage: (msg: Message) => void;
  clearChat: () => void;
  handleSendMessage: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      chatInput: "",
      msgLoad: false,

      setChatInput: (input) => set({ chatInput: input }),
      addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
      clearChat: () => set({ messages: [], chatInput: "", msgLoad: false }),

      handleSendMessage: async () => {
        set({ msgLoad: true });
        const input = get().chatInput.trim();
        if (!input) {
          set({ msgLoad: false });
          return;
        }

        const { currClient } = useClientStore.getState();
        const { id: userId } = useUserStore.getState();

        // Render the user's message immediately
        const userMessage: Message = {
          content: input,
          isUser: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toUpperCase(),
        };
        set((state) => ({ messages: [...state.messages, userMessage], chatInput: "" }));

        try {
          // build payload; omit client_id if unset
          const payload: any = { user_input: input, user_id: userId };
          if (currClient) payload.client_id = currClient;

          // 1) submit to Next API → which forwards to Flask /ai-chat
          const submitRes = await axios.post(`/api/ai-chat`, payload, { validateStatus: () => true });

          if (submitRes.status === 202 && submitRes.data?.task_id) {
            const taskId = submitRes.data.task_id;

            // 2) poll status until 200
            const final = await (async function poll(taskId: string) {
              let delay = 800;
              const maxMs = 120000; // 2 min timeout
              const started = Date.now();
              while (true) {
                const res = await axios.get(`/api/ai-chat/${taskId}`, { validateStatus: () => true });
                if (res.status === 200 && res.data?.status === "ok") return res.data;
                if (res.status >= 400 && res.status < 500) {
                  throw new Error(res.data?.message || "request failed");
                }
                if (Date.now() - started > maxMs) {
                  throw new Error("Timed out waiting for AI answer");
                }
                await new Promise((r) => setTimeout(r, delay));
                delay = Math.min(2000, Math.round(delay * 1.25));
              }
            })(taskId);

            const aiMessage: Message = {
              content: final.answer || "No answer",
              isUser: false,
              timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toUpperCase(),
            };
            set((state) => ({ messages: [...state.messages, aiMessage], msgLoad: false }));
            return;
          }

          // Synchronous OK (rare but retained)
          if (submitRes.status === 200 && submitRes.data?.status === "ok") {
            const aiMessage: Message = {
              content: submitRes.data.answer || "No answer",
              isUser: false,
              timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toUpperCase(),
            };
            set((state) => ({ messages: [...state.messages, aiMessage], msgLoad: false }));
            return;
          }

          throw new Error(submitRes.data?.message || `HTTP ${submitRes.status}`);
        } catch (err: any) {
          console.error("AI chat error:", err?.message || err);
          set((state) => ({
            messages: [
              ...state.messages,
              {
                content: "Error: unable to fetch answer. Please try again.",
                isUser: false,
                timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toUpperCase(),
              },
            ],
            msgLoad: false,
          }));
        }
      },
    }),
    { name: "chat-store", version: 1 }
  )
);
