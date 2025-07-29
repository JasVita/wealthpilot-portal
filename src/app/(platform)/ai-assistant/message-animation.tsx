import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const AnimatedMarkdown = ({ content, animate }: { content: string; animate: boolean }) => {
  const [chars, setChars] = useState(animate ? 0 : content.length);

  /* increment counter until full length */
  useEffect(() => {
    if (!animate) return;
    if (chars < content.length) {
      const t = setTimeout(() => setChars((c) => c + 2), 12); // ≈80‑90 wpm
      return () => clearTimeout(t);
    }
  }, [chars, content, animate]);

  /* reset when a brand‑new string comes in */
  useEffect(() => {
    if (animate) setChars(0);
  }, [content, animate]);

  return (
    <div className="prose dark:prose-invert mt-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.slice(0, chars)}</ReactMarkdown>
      {animate && chars < content.length && <span className="animate-pulse">|</span>}
    </div>
  );
};
