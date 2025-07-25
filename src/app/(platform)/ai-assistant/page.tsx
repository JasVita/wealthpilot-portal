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

// "use client";
// import { useState, useRef, KeyboardEvent, MouseEventHandler } from "react";
// import { motion } from "framer-motion";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { ArrowRight, Plus, Settings, Settings2 } from "lucide-react";
// import { useChatStore } from "@/stores/chat-store";

// /**
//  * ChatInterface – Wealth Pilot chat UI inspired by Perplexity
//  *
//  * Features
//  * 1. Initial compact input (120 × 640)
//  * 2. Expands to 360 px height on focus and shows 6 primary suggestions
//  * 3. Below, four pill‑style quick prompts sized to content
//  * 4. Clicking a pill pre‑fills input, collapses to 240 px height, and shows 3 follow‑up suggestions
//  * 5. ⏎ submits – question becomes bold heading; answer placeholder rendered below
//  */
// export default function ChatInterface() {
//   /* --------------------------- state --------------------------- */
//   const [value, setValue] = useState("");
//   const { chatInput, setChatInput, msgLoad, handleSendMessage } = useChatStore();

//   const [phase, setPhase] = useState<"initial" | "focused" | "suggested" | "submitted">("initial");

//   const inputRef = useRef<HTMLTextAreaElement>(null);

//   /* --------------------- suggestion configs ------------------- */
//   const primarySuggestions = [
//     "Show my net worth", // 6 items
//     "Asset breakdown by class",
//     "Last month performance",
//     "Top gainers & losers",
//     "Cash flow summary",
//     "Project my retirement",
//   ];

//   const followUpSuggestions = ["Compare with last year", "Drill into equities", "Export to Excel"];

//   const quickPills = [
//     "Portfolio", // 4 pills below input
//     "Dividends",
//     "Fees",
//     "Risk",
//     "Clients",
//   ];

//   /* ------------------------ handlers -------------------------- */
//   const handleFocus = () => {
//     if (phase === "initial") setPhase("focused");
//   };

//   const handleBlur = () => {
//     if (phase !== "submitted" && phase !== "suggested") {
//       // slight timeout so click events register
//       // setTimeout(() => setPhase("initial"), 120);
//       setPhase("initial");
//     }
//   };

//   const handleSuggestionClick = (text: string) => {
//     setValue(text);
//     setPhase("suggested");
//     inputRef.current?.focus();
//   };

//   const handleSubmit = async () => {
//     if (!chatInput.trim() || msgLoad) return;
//     await handleSendMessage();
//     setChatInput("");
//     // adjustHeight(true);
//   };

//   /* --------------------- derived values ----------------------- */
//   const cardHeight = {
//     initial: 120,
//     focused: 360,
//     suggested: 240,
//     submitted: "auto",
//   }[phase];

//   /* -------------------------- UI ------------------------------ */
//   return (
//     <div className="flex h-full p-4 justify-center">
//       <div className="flex w-full max-w-[640px] flex-col items-center gap-4 h-fit mt-[100px]">
//         {/* ——— heading after submit ——— */}
//         {phase === "submitted" && <h1 className="mb-2 text-center text-2xl font-bold lg:text-3xl">{value}</h1>}
//         {phase !== "submitted" && <p className="text-center text-4xl font-semibold text-gray-700">Wealth Pilot</p>}

//         {/* ——— input card ——— */}
//         <motion.div
//           layout
//           initial={false}
//           animate={{ height: cardHeight }}
//           transition={{ type: "spring", bounce: 0 }}
//           className="w-full"
//         >
//           <Card className="h-full w-full rounded-xl shadow-none border-sidebar-ring p-0">
//             <CardContent className="flex rounded-xl h-full flex-col gap-4 p-3">
//               {/* text input */}
//               {phase !== "submitted" && (
//                 // <Input
//                 //   ref={inputRef}
//                 //   placeholder="Ask anything…"
//                 //   value={value}
//                 //   onChange={(e) => setValue(e.target.value)}
//                 //   onFocus={handleFocus}
//                 //   onBlur={handleBlur}
//                 //   onKeyDown={onKeyDown}
//                 //   className="w-full h-full border text-base ring-0 outline-0"
//                 // />
//                 // <input
//                 //   ref={inputRef}
//                 //   placeholder="Ask anything…"
//                 //   value={value}
//                 //   onChange={(e) => setValue(e.target.value)}
//                 //   onFocus={handleFocus}
//                 //   onBlur={handleBlur}
//                 //   // onKeyDown={onKeyDown}
//                 //   className="w-full h-full border text-base ring-0 outline-0"
//                 // />
//                 <div>
//                   <textarea
//                     // id="chat-input"
//                     placeholder="Ask anything…"
//                     className="w-full h-fit min-h-[50px] max-h-[250px] border ring-0 outline-0 text-base resize-none text-wrap shadow-none"
//                     ref={inputRef}
//                     value={value}
//                     onFocus={handleFocus}
//                     onBlur={handleBlur}
//                     onChange={(e) => {
//                       setValue(e.target.value);
//                       // adjustHeight();
//                     }}
//                     onKeyDown={(e) => {
//                       if (e.key === "Enter" && !e.shiftKey) {
//                         e.preventDefault();
//                         handleSubmit();
//                       }
//                     }}
//                     // disabled={submitted}
//                   />
//                   <div className="flex justify-between border">
//                     <div className="inline-flex items-center gap-2 rounded-md p-1">
//                       <Plus
//                         size={18}
//                         className="cursor-pointer hover:bg-[#ebedee] "
//                         aria-label="Add attachment"
//                         // onClick={onAdd}
//                       />
//                       <Settings2
//                         size={18}
//                         className="cursor-pointer hover:bg-[#ebedee]"
//                         aria-label="Tools"
//                         // onClick={onTools}
//                       />
//                     </div>

//                     {/* <button
//                       onClick={handleSubmit}
//                       className={cn(
//                         "absolute right-3 top-1/2 -translate-y-1/2 rounded-xl py-1 px-1",
//                         submitted ? "bg-none" : "bg-black/5 dark:bg-white/5"
//                       )}
//                       type="button"
//                       disabled={submitted}
//                     >
//                       {submitted ? (
//                         <div
//                           className="w-4 h-4 bg-black dark:bg-white rounded-sm animate-spin transition duration-700"
//                           style={{ animationDuration: "3s" }}
//                         />
//                       ) : (
//                         <ArrowUp
//                           className={cn(
//                             "w-4 h-4 transition-opacity dark:text-white",
//                             chatInput ? "opacity-100" : "opacity-30"
//                           )}
//                         />
//                       )}
//                     </button> */}
//                   </div>
//                 </div>
//               )}

//               {/* suggestions inside card */}
//               {phase === "focused" && (
//                 <div className="grid grid-cols-2 gap-2 pt-2">
//                   {primarySuggestions.map((s) => (
//                     <Button
//                       key={s}
//                       variant="secondary"
//                       className="truncate"
//                       onMouseDown={() => handleSuggestionClick(s)}
//                     >
//                       {s}
//                     </Button>
//                   ))}
//                 </div>
//               )}

//               {phase === "suggested" && (
//                 <div className="flex flex-wrap gap-2 pt-2 border">
//                   {followUpSuggestions.map((s) => (
//                     <Button
//                       key={s}
//                       size="lg"
//                       variant="ghost"
//                       className="border border-gray-300 px-3 py-1 text-sm"
//                       onMouseDown={() => handleSuggestionClick(s)}
//                     >
//                       {s}
//                     </Button>
//                   ))}
//                 </div>
//               )}

//               {/* answer placeholder */}
//               {phase === "submitted" && (
//                 <div className="prose max-w-none">
//                   <p>
//                     {/* TODO: replace with real answer rendering */}
//                     Here will be the intelligent answer fetched from your backend. You can stream tokens here for a
//                     chat‑like feel.
//                   </p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </motion.div>

//         {/* ——— quick pills outside card ——— */}
//         {phase !== "submitted" && (
//           <div className="flex flex-wrap justify-center gap-2 mt-5">
//             {quickPills.map((p) => (
//               <Button
//                 key={p}
//                 size="sm"
//                 variant="outline"
//                 className="px-3 py-1 text-base bg-[#ebedee]"
//                 onMouseDown={() => handleSuggestionClick(p + " ")}
//               >
//                 {p}
//               </Button>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
