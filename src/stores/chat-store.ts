// stores/chat-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
// import axios from "axios";  // ⬅️ not used for streaming
import { type Message } from "@/types";
import { useClientStore } from "./clients-store";
import { useUserStore } from "./user-store";

function buildAssistantMarkdown(
  plan: string[],
  past: Array<{ task: string; result_preview: string }>,
  finalText: string
) {
  let md = "";
  if (plan?.length) {
    md += "### Plan\n";
    md += plan.map((s, i) => `- ${i + 1}. ${s}`).join("\n") + "\n\n";
  }
  if (past?.length) {
    md += "### Past steps\n";
    md +=
      past.map((it, i) => `- ${i + 1}. **${it.task}**\n  ${it.result_preview?.slice(0, 900) || ""}`).join("\n") +
      "\n\n";
  }
  if (finalText) {
    md += "### Answer\n" + finalText + "\n";
  }
  return md.trim();
}

type ChatState = {
  messages: Message[];
  chatInput: string;
  msgLoad: boolean;

  setChatInput: (input: string) => void;
  addMessage: (msg: Message) => void;
  clearChat: () => void;
  handleSendMessage: () => void;
};

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
        const input = get().chatInput.trim();
        if (!input || get().msgLoad) return;

        set({ msgLoad: true });

        const { currClient } = useClientStore.getState();
        const { id: userId } = useUserStore.getState();

        // 1) push user message immediately
        const userMessage: Message = {
          content: input,
          isUser: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toUpperCase(),
        };
        set((state) => ({
          messages: [...state.messages, userMessage],
          chatInput: "",
        }));

        // 2) create a placeholder assistant message we will UPDATE as events stream in
        let assistantIndex = -1;
        set((state) => {
          assistantIndex = state.messages.length;
          return {
            messages: [
              ...state.messages,
              {
                content: "…thinking…",
                isUser: false,
                timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toUpperCase(),
              },
            ],
          };
        });

        // 3) open streaming POST and parse SSE frames
        const controller = new AbortController();
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai-chat/stream`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "text/event-stream",
            },
            body: JSON.stringify({
              input, // your backend reads "input"
              client_id: currClient,
              user_id: userId,
            }),
            signal: controller.signal,
          });

          if (!res.ok || !res.body) {
            throw new Error(`HTTP ${res.status}`);
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let buffer = "";

          // these aggregate the “flow of thoughts”
          let plan: string[] = [];
          let past: Array<{ task: string; result_preview: string }> = [];
          let finalText = "";

          const updateAssistant = () => {
            const md = buildAssistantMarkdown(plan, past, finalText);
            set((state) => {
              const msgs = state.messages.slice();
              if (msgs[assistantIndex]) {
                msgs[assistantIndex] = { ...msgs[assistantIndex], content: md || "…" };
              }
              return { messages: msgs };
            });
          };

          // naive SSE parser (enough for your payload)
          const processFrame = (frame: string) => {
            // split lines, collect event + data (can be multi-line data)
            const lines = frame.split("\n");
            let eventType = "message";
            const dataParts: string[] = [];
            for (const line of lines) {
              if (line.startsWith("event:")) eventType = line.slice(6).trim();
              else if (line.startsWith("data:")) dataParts.push(line.slice(5).trim());
            }
            if (!dataParts.length) return;
            const raw = dataParts.join("\n");
            let obj: any;
            try {
              obj = JSON.parse(raw);
            } catch {
              return;
            }

            // your server sometimes sends: {type:"planner", data:{plan:[...]}}
            // and sometimes normalized: event "plan" with {steps:[...]}
            const t = obj.type || eventType;

            if (t === "planner" || t === "plan") {
              plan = obj.steps || obj.data?.plan || plan;
              updateAssistant();
              return;
            }
            if (t === "past_steps") {
              const items = obj.items || obj.data?.items || [];
              if (Array.isArray(items)) past = past.concat(items);
              updateAssistant();
              return;
            }
            if (t === "response") {
              // your sample shows { data: { text: "..." } }
              finalText = obj.text || obj.data?.text || obj.data || "";
              updateAssistant();
              return;
            }
            if (t === "done") {
              set({ msgLoad: false });
            }
          };

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // split by SSE frame terminator (\n\n)
            let idx;
            while ((idx = buffer.indexOf("\n\n")) !== -1) {
              const frame = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 2);
              processFrame(frame);
            }
          }

          set({ msgLoad: false });
        } catch (err) {
          console.error("Stream error:", err);
          set((state) => ({
            messages: [...state.messages, { content: "Stream error. Please try again.", isUser: false }],
            msgLoad: false,
          }));
          controller.abort();
        }
      },
    }),
    { name: "chat-store", version: 1 }
  )
);
