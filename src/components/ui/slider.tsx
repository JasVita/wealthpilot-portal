// src/components/ui/slider.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SliderValue = [number, number];

type Props = {
  /** Current value (min, max) */
  value?: SliderValue;
  /** Uncontrolled default value (min, max) */
  defaultValue?: SliderValue;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  onValueChange?: (v: SliderValue) => void;
};

/**
 * Lightweight dual-range slider (no external dependency).
 * - Keeps the same API shape your pages use: value=[min,max], onValueChange([min,max]).
 * - Shows the filled track between the two thumbs.
 */
export const Slider = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      value,
      defaultValue = [0, 100],
      min = 0,
      max = 100,
      step = 1,
      className,
      onValueChange,
    },
    ref
  ) => {
    const isControlled = Array.isArray(value);
    const [internal, setInternal] = React.useState<SliderValue>(
      (isControlled ? (value as SliderValue) : defaultValue) as SliderValue
    );

    // keep internal in sync when controlled
    React.useEffect(() => {
      if (isControlled && value) setInternal(value as SliderValue);
    }, [isControlled, value?.[0], value?.[1]]);

    const update = (next: SliderValue) => {
      if (!isControlled) setInternal(next);
      onValueChange?.(next);
    };

    const minV = internal[0];
    const maxV = internal[1];

    const clamp = (n: number) => Math.min(max, Math.max(min, n));
    const pct = (n: number) => ((n - min) / (max - min)) * 100;

    const onMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = clamp(Number(e.target.value));
      // Prevent crossing
      const next: SliderValue = [Math.min(v, internal[1] - step), internal[1]];
      update(next);
    };

    const onMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = clamp(Number(e.target.value));
      const next: SliderValue = [internal[0], Math.max(v, internal[0] + step)];
      update(next);
    };

    const left = pct(minV);
    const right = 100 - pct(maxV);

    return (
      <div ref={ref} className={cn("relative h-5 w-full select-none", className)}>
        {/* Track */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-secondary" />
        {/* Filled range */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-primary"
          style={{ left: `${left}%`, right: `${right}%` }}
        />

        {/* Min thumb */}
        <input
          type="range"
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary
                     [&::-webkit-slider-thumb]:bg-background
                     [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
                     [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-primary
                     [&::-moz-range-thumb]:bg-background
          "
          min={min}
          max={max}
          step={step}
          value={minV}
          onChange={onMinChange}
        />

        {/* Max thumb (stacked) */}
        <input
          type="range"
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary
                     [&::-webkit-slider-thumb]:bg-background
                     [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
                     [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-primary
                     [&::-moz-range-thumb]:bg-background
          "
          min={min}
          max={max}
          step={step}
          value={maxV}
          onChange={onMaxChange}
        />
      </div>
    );
  }
);
Slider.displayName = "Slider";
