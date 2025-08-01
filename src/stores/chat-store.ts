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
        console.log("Sending message:", get().chatInput);
        const input = get().chatInput.trim();
        if (!input) return;
        const { currClient } = useClientStore.getState();
        const { id } = useUserStore.getState();

        const userMessage: Message = {
          content: input,
          isUser: true,
          timestamp: new Date()
            .toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })
            .toUpperCase(),
        };
        set((state) => ({
          messages: [...state.messages, userMessage],
          chatInput: "",
        }));

        try {
          const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/ai-chat`, {
            user_input: input,
            client_id: currClient,
            user_id: id,
          });

          const aiMessage: Message = {
            content: data.answer || "server error",
            isUser: false,
            timestamp: new Date()
              .toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })
              .toUpperCase(),
          };

          set((state) => ({
            messages: [...state.messages, aiMessage],
            msgLoad: false,
          }));
        } catch (err) {
          console.error("Error sending message:", err);
          set((state) => ({
            messages: [...state.messages, { content: "Error sending message, please try again.", isUser: false }],
            msgLoad: false,
          }));
        }
      },
    }),
    { name: "chat-store", version: 1 }
  )
);
