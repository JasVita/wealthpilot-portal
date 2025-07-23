"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { AIInputWithLoading } from "@/components/ai-input-with-loading";
import { useChatStore } from "@/stores/chat-store";
import { cn } from "@/lib/utils";

const TypedMessage = ({ content, animate }: { content: string; animate: boolean }) => {
  const [displayedContent, setDisplayedContent] = useState(animate ? "" : content);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (!animate) return;
    if (charIndex < content.length) {
      const timer = setTimeout(() => {
        setDisplayedContent((prev) => prev + content[charIndex]);
        setCharIndex((prev) => prev + 1);
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [charIndex, content, animate]);

  useEffect(() => {
    if (animate) {
      setDisplayedContent("");
      setCharIndex(0);
    } else {
      setDisplayedContent(content);
    }
  }, [content, animate]);

  return (
    <div className="whitespace-pre-wrap">
      {displayedContent}
      {animate && charIndex < content.length && <span className="animate-pulse">|</span>}
    </div>
  );
};

export default function Page() {
  const { handleSendMessage, messages } = useChatStore();
  const hasMessages = messages.length > 0;
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showInput, setShowInput] = useState(true);
  const [inputPosition, setInputPosition] = useState("center");

  useEffect(() => {
    if (hasMessages && inputPosition === "center") {
      setShowInput(false);
      setTimeout(() => {
        setInputPosition("bottom");
        setTimeout(() => {
          setShowInput(true);
        }, 100);
      }, 300);
    }
  }, [messages, hasMessages]);

  return (
    <section className="w-full h-full flex flex-col overflow-hidden">
      <div
        ref={chatContainerRef}
        className={cn(
          "flex-1 relative transition-all duration-700 ease-in-out overflow-y-auto",
          hasMessages ? "flex flex-col justify-between" : "flex flex-col justify-center"
        )}
      >
        <div className="flex-1 overflow-y-auto pt-4 space-y-4 max-w-5xl w-full mx-auto">
          {messages.map((msg, idx) =>
            msg.isUser ? (
              <div key={idx} className="max-w-[25%] w-fit ml-auto bg-black/5 text-black px-4 py-2 rounded-lg text-base">
                {msg.content}
              </div>
            ) : (
              <div key={idx} className="whitespace-pre-wrap text-lg text-black">
                {msg.isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="animate-spin h-4 w-4" />
                    <span className="text-gray-500">Thinking...</span>
                  </div>
                ) : (
                  <TypedMessage content={msg.content} animate={idx === messages.length - 1} />
                )}
              </div>
            )
          )}
          <div ref={messagesEndRef} />
        </div>

        <div
          className={cn("transition-all duration-700 w-full transform", showInput ? "opacity-100" : "opacity-0")}
          style={{
            transform: inputPosition === "center" ? "translateY(0)" : "translateY(0)",
            padding: "1rem",
          }}
        >
          {!hasMessages ? (
            <div>
              <p className="font-sans text-4xl text-center">Ask me anything about your portfolio</p>
              <AIInputWithLoading className="w-full max-w-5xl mx-auto" onSubmit={handleSendMessage} />
            </div>
          ) : (
            <AIInputWithLoading className="w-full max-w-5xl mx-auto" onSubmit={handleSendMessage} />
          )}
        </div>
      </div>
    </section>
  );
}
