"use client";

import { ArrowUp } from "lucide-react";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { useWealthStore } from "@/stores/wealth-store";

interface AIInputWithLoadingProps {
  id?: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  loadingDuration?: number;
  thinkingDuration?: number;
  onSubmit?: (value: string) => void | Promise<void>;
  className?: string;
  autoAnimate?: boolean;
}

export function AIInputWithLoading({
  id = "ai-input-with-loading",
  placeholder = "Ask anything",
  minHeight = 80,
  maxHeight = 200,
  loadingDuration = 3000,
  thinkingDuration = 1000,
  onSubmit,
  className,
  autoAnimate = false,
}: AIInputWithLoadingProps) {
  // const [chatInput, setChatInput] = useState("");
  const { chatInput, setChatInput, msgLoad } = useWealthStore();
  // const [submitted, setSubmitted] = useState(autoAnimate);
  const submitted = msgLoad;
  const [isAnimating, setIsAnimating] = useState(autoAnimate);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight,
  });

  // useEffect(() => {
  //   let timeoutId: NodeJS.Timeout;

  //   const runAnimation = () => {
  //     if (!isAnimating) return;
  //     setSubmitted(true);
  //     timeoutId = setTimeout(() => {
  //       setSubmitted(false);
  //       timeoutId = setTimeout(runAnimation, thinkingDuration);
  //     }, loadingDuration);
  //   };

  //   if (isAnimating) {
  //     runAnimation();
  //   }

  //   return () => clearTimeout(timeoutId);
  // }, [isAnimating, loadingDuration, thinkingDuration]);

  const handleSubmit = async () => {
    if (!chatInput.trim() || submitted) return;

    // setSubmitted(true);
    await onSubmit?.(chatInput);
    setChatInput("");
    adjustHeight(true);

    // setTimeout(() => {
    //   setSubmitted(false);
    // }, loadingDuration);
  };

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative w-full mx-auto flex items-center flex-col gap-2 text-base">
        <div className="relative w-full mx-auto">
          <Textarea
            id={id}
            placeholder={placeholder}
            className={cn(
              "bg-black/5 dark:bg-white/5 w-full rounded-3xl pl-6 pr-10 py-4",
              "placeholder:text-black/70 dark:placeholder:text-white/70",
              "border-none ring-black/30 dark:ring-white/30",
              "text-black dark:text-white resize-none text-wrap leading-[1.2]",
              `min-h-[${minHeight}px]`
            )}
            ref={textareaRef}
            value={chatInput}
            onChange={(e) => {
              setChatInput(e.target.value);
              adjustHeight();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={submitted}
          />
          <button
            onClick={handleSubmit}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 rounded-xl py-1 px-1",
              submitted ? "bg-none" : "bg-black/5 dark:bg-white/5"
            )}
            type="button"
            disabled={submitted}
          >
            {submitted ? (
              <div
                className="w-4 h-4 bg-black dark:bg-white rounded-sm animate-spin transition duration-700"
                style={{ animationDuration: "3s" }}
              />
            ) : (
              <ArrowUp
                className={cn("w-4 h-4 transition-opacity dark:text-white", chatInput ? "opacity-100" : "opacity-30")}
              />
            )}
          </button>
        </div>
        {/* <p className="pl-4 h-4 text-xs mx-auto text-black/70 dark:text-white/70">{submitted ? "AI is thinking..." : "Ready to submit!"}</p> */}
      </div>
    </div>
  );
}
