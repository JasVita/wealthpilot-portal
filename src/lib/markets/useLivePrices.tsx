import { useEffect, useRef, useState } from "react";
import axios from "axios";

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changesPercentage: number;
  prevClose: number;
}

export default function useLivePrices(symbols: string[], interval = 60000) {
  const [prices, setPrices] = useState<Record<string, Quote>>({});
  const lastFetch = useRef<number>(0);
  const lastSymbols = useRef<string[]>([]);

  useEffect(() => {
    if (!symbols.length) return;

    const fetchPrices = async () => {
      const now = Date.now();
      const symbolsChanged =
        symbols.length !== lastSymbols.current.length ||
        symbols.some((s, i) => s !== lastSymbols.current[i]);

      // Avoid calling if symbols unchanged and interval hasn't passed
      if (!symbolsChanged && now - lastFetch.current < interval) return;

      try {
        const { data } = await axios.post<{
          status: string;
          prices: Record<string, any>;
          message?: string;
        }>(`${process.env.NEXT_PUBLIC_API_URL}/live-prices`, {
          identifiers: symbols,
        });

        if (data.status !== "ok") throw new Error(data.message);

        const result: Record<string, Quote> = {};
        for (const key in data.prices) {
          const item = data.prices[key];
          if (item?.price && item?.symbol) {
            result[item.symbol] = {
              ...item,
              prevClose: item.price - item.change,
            };
          }
        }

        setPrices(result);
        lastFetch.current = now;
        lastSymbols.current = symbols;
      } catch (err: any) {
        console.error("Failed to fetch live prices", err?.response?.data?.message || err.message);
      }
    };

    fetchPrices();
    const timer = setInterval(fetchPrices, interval);
    return () => clearInterval(timer);
  }, [symbols, interval]);

  return prices;
}
