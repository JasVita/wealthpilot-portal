"use client";
import { useState, useRef, KeyboardEvent, MouseEventHandler, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp, Plus, Search, Settings2, X } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnimatedMarkdown } from "./message-animation";

export default function ChatInterface() {
  /* --------------------------- states --------------------------- */
  const { chatInput, setChatInput, msgLoad, handleSendMessage, messages } = useChatStore();

  const [phase, setPhase] = useState<"initial" | "submitted">(messages.length ? "submitted" : "initial");
  const [focused, setFocused] = useState<boolean>(false);
  const [chatHeight, setChatHeight] = useState<number>(120);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length && phase === "initial") setPhase("submitted");
  }, [messages.length, phase]);
  /* --------------------- suggestion configs ------------------- */
  const primarySuggestions = [
    "Can you summarize my client's latest portfolio performance?",
    "What is the current cash position across all accounts?",
    "Are there any upcoming maturities or expiring structured products?",
    "Show me the allocation breakdown by asset class and currency.",
    "Have there been any significant changes in holdings this quarter?",
    "Download a report for [Client Name] with key financial insights.",
  ];

  const quickPills = [
    "Portfolio", // 4 pills below input
    "Dividends",
    "Fees",
    "Risk",
    "Clients",
  ];

  /* ------------------------ handlers -------------------------- */
  const handleFocus = () => {
    if (phase === "initial") {
      setFocused(true);
      setChatHeight(360);
    }
  };

  const handleBlur = () => {
    if (phase === "initial") {
      setFocused(false);
      setChatHeight(120);
    }
  };

  const handleSuggestionClick = (text: string) => {
    setChatInput(text);
    if (phase === "initial") setFocused(true);
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    if (!chatInput.trim() || msgLoad) return;

    /* ⬇️ move now, not after await */
    if (phase === "initial") setPhase("submitted");

    handleSendMessage(); // fire‑and‑forget; no await
    setChatInput("");
  };

  /* -------------------------- UI ------------------------------ */
  return (
    <div className="flex flex-col h-full justify-center items-center relative">
      {phase === "initial" && (
        <div className="flex w-full max-w-[640px] flex-col items-center gap-4 h-fit fixed z-10 top-1/3">
          <p className="text-center text-4xl font-semibold text-gray-700">Wealth Pilot</p>
          <motion.div
            layout
            initial={false}
            animate={{ height: chatHeight }}
            transition={{ type: "spring", bounce: 0, duration: 0.1 }}
            className="w-full"
          >
            <Card className="h-full w-full rounded-xl shadow-none border-sidebar-ring p-0">
              <CardContent className="flex rounded-xl h-full flex-col gap-2 p-3 pb-0">
                <div>
                  <textarea
                    placeholder="Ask anything…"
                    className="w-full h-fit min-h-[60px] max-h-[250px] ring-0 outline-0 text-base resize-none text-wrap shadow-none"
                    ref={inputRef}
                    value={chatInput}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onChange={(e) => {
                      setChatInput(e.target.value);
                      // adjustHeight();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    disabled={msgLoad}
                  />
                  <div className="flex justify-between relative">
                    <div className="inline-flex items-center gap-2 rounded-md">
                      <Button size="icon" variant="ghost" className="p-0 m-0 flex items-center justify-center">
                        <Plus
                          size={24} // You can tweak this (e.g., 20, 24, 28) to match button size
                          strokeWidth={1.7}
                          className="w-full h-full p-0 m-0"
                          aria-label="Add attachment"
                        />
                      </Button>
                      <Button size="icon" variant="ghost" className="p-0 m-0 flex items-center justify-center">
                        <Settings2
                          size={24} // You can tweak this (e.g., 20, 24, 28) to match button size
                          strokeWidth={1.7}
                          className="w-full h-full p-0 m-0"
                          aria-label="Add attachment"
                        />
                      </Button>
                    </div>

                    <button
                      onClick={handleSubmit}
                      className={cn(
                        "rounded-md size-9 flex items-center justify-center",
                        msgLoad ? "bg-none" : "bg-black/5 dark:bg-white/5"
                      )}
                      type="button"
                      disabled={msgLoad}
                    >
                      {msgLoad ? (
                        <div
                          className="w-4 h-4 bg-black dark:bg-white rounded-sm animate-spin transition duration-700"
                          style={{ animationDuration: "3s" }}
                        />
                      ) : (
                        <ArrowUp
                          className={cn(
                            "w-4 h-4 transition-opacity dark:text-white",
                            chatInput ? "opacity-100" : "opacity-30"
                          )}
                        />
                      )}
                    </button>
                  </div>
                </div>

                {focused && (
                  <div className="flex flex-col">
                    <div className="w-full h-px bg-sidebar-ring" />

                    {primarySuggestions.map((s) => (
                      <Button
                        key={s}
                        variant="ghost"
                        className="truncate text-left flex justify-start font-light"
                        onMouseDown={() => handleSuggestionClick(s)}
                      >
                        <Search />
                        {s}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {!focused && (
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {quickPills.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant="outline"
                  className="px-3 py-1 text-base bg-[#ebedee]"
                  onMouseDown={() => handleSuggestionClick(p + " ")}
                >
                  {p}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === "submitted" && (
        <div className="flex flex-col w-full items-center h-full">
          <div className="flex flex-col w-full max-w-[800px] px-4 gap-6 overflow-y-auto h-full pb-[140px] scrollbar-thin scrollbar-track-white scrollbar-thumb-[#dadce0]">
            {messages.map((msg, i) => {
              if (msg.isUser) {
                return (
                  <article key={i} className="space-y-4 mb-10">
                    <h2 className="text-2xl font-extrabold leading-snug text-gray-900 dark:text-white">
                      {msg.content}
                    </h2>

                    <h4 className="text-base font-sans underline underline-offset-4 decoration-2">Answer</h4>

                    {/* {messages[i + 1] && !messages[i + 1].isUser && (
                      <div className="prose dark:prose-invert mt-2">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{messages[i + 1].content}</ReactMarkdown>
                      </div>
                    )} */}
                    {messages[i + 1] && !messages[i + 1].isUser && (
                      <AnimatedMarkdown content={messages[i + 1].content} animate={i + 1 === messages.length - 1} />
                    )}
                  </article>
                );
              }

              if (i > 0 && messages[i - 1].isUser) return null;

              return <AnimatedMarkdown key={i} content={msg.content} animate={i === messages.length - 1} />;
            })}
          </div>

          <div className="h-[100px] w-[800px] rounded-xl shadow-none border border-sidebar-ring fixed bottom-5 backdrop-blur-md px-3 py-1 flex flex-col z-20 bg-background">
            <textarea
              placeholder="Ask anything…"
              className="w-full flex-1 min-h-[50px] max-h-[250px] ring-0 outline-0 text-base resize-none text-wrap shadow-none p-0 m-0 bg-transparent"
              ref={inputRef}
              value={chatInput}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChange={(e) => {
                setChatInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={msgLoad}
            />
            <div className="flex justify-between items-center pt-1">
              {/* <div className="inline-flex items-center gap-2">
                <Button size="icon" variant="ghost" className="p-0 m-0 flex items-center justify-center">
                  <Plus size={24} strokeWidth={1.7} className="w-full h-full p-0 m-0" aria-label="Add attachment" />
                </Button>
                <Button size="icon" variant="ghost" className="p-0 m-0 flex items-center justify-center">
                  <Settings2 size={24} strokeWidth={1.7} className="w-full h-full p-0 m-0" aria-label="Settings" />
                </Button>
              </div> */}
              <div className="inline-flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    useChatStore.getState().clearChat();
                    setPhase("initial");
                  }}
                  className="p-0 m-0 flex items-center justify-center"
                  aria-label="Clear chat"
                >
                  <X size={24} strokeWidth={1.7} />
                </Button>

                <Button size="icon" variant="ghost" className="p-0 m-0 flex items-center justify-center">
                  <Plus size={24} strokeWidth={1.7} />
                </Button>
                <Button size="icon" variant="ghost" className="p-0 m-0 flex items-center justify-center">
                  <Settings2 size={24} strokeWidth={1.7} />
                </Button>
              </div>

              <button
                onClick={handleSubmit}
                className={cn(
                  "rounded-md size-9 flex items-center justify-center",
                  msgLoad ? "bg-none" : "bg-black/5 dark:bg-white/5"
                )}
                type="button"
                disabled={msgLoad}
              >
                {msgLoad ? (
                  <div
                    className="w-4 h-4 bg-black dark:bg-white rounded-sm animate-spin"
                    style={{ animationDuration: "3s" }}
                  />
                ) : (
                  <ArrowUp
                    className={cn(
                      "w-4 h-4 transition-opacity dark:text-white",
                      chatInput ? "opacity-100" : "opacity-30"
                    )}
                  />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
