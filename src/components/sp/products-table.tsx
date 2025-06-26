import { useMemo } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useWealthStore } from "@/stores/wealth-store";
import { buildStructuredProductTable, Product } from "@/types"; // adjust path as needed

type ProductsTableProps = {
  onRowClick: (product: Product) => void;
};

const ProductsTable = ({ onRowClick }: ProductsTableProps) => {
  /* 1️⃣  Pull the raw bank snapshots from Zustand */
  const tableDataArray = useWealthStore((state) => state.tableDataArray);

  /* 2️⃣  Transform → Product[] (re-computed only when source changes) */
  const products = useMemo<Product[]>(() => buildStructuredProductTable(tableDataArray ?? []), [tableDataArray]);

  return (
    <div className="glass-card rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#11223D] text-white sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left font-medium sticky left-0 bg-[#11223D] z-20">Product Name</th>
              <th className="px-4 py-3 text-left font-medium">Bank</th>
              <th className="px-4 py-3 text-left font-medium">ISIN</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Notional</th>
              <th className="px-4 py-3 text-right font-medium">MV USD</th>
              <th className="px-4 py-3 text-right font-medium">% Portfolio</th>
              <th className="px-4 py-3 text-left font-medium">Issue Date</th>
              <th className="px-4 py-3 text-left font-medium">Maturity</th>
              <th className="px-4 py-3 text-right font-medium">Strike</th>
              <th className="px-4 py-3 text-right font-medium">Unrealised P/L</th>
              <th className="px-4 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-gray-100 hover:bg-[#EDF1F9] cursor-pointer transition-colors"
                onClick={() => onRowClick(product)}
              >
                <td className="px-4 py-4 font-medium text-[#11223D] sticky left-0 bg-white z-10">
                  {product.productName}
                </td>

                <td className="px-4 py-4 text-[#11223D]/80">{product.bank}</td>
                <td className="px-4 py-4 text-[#11223D]/60 font-mono text-xs">{product.isin}</td>

                <td className="px-4 py-4">
                  <span className="px-2 py-1 bg-[#0CA3A3]/10 text-[#0CA3A3] rounded-full text-xs font-medium">
                    {product.productType}
                  </span>
                </td>

                <td className="px-4 py-4 text-right font-medium">{product.notional}</td>
                <td className="px-4 py-4 text-right font-medium">{product.marketValue}</td>
                <td className="px-4 py-4 text-right">{product.portfolioPercent}</td>
                <td className="px-4 py-4 text-[#11223D]/60">{product.issueDate}</td>
                <td className="px-4 py-4 text-[#11223D]/60">{product.maturity}</td>
                <td className="px-4 py-4 text-right font-mono text-xs">{product.strike || "-"}</td>

                <td
                  className={`px-4 py-4 text-right font-medium ${
                    product.unrealizedPLColor === "positive"
                      ? "text-[#12B76A]"
                      : product.unrealizedPLColor === "negative"
                      ? "text-[#F97066]"
                      : "text-[#11223D]/60"
                  }`}
                >
                  {product.unrealizedPL}
                </td>

                <td className="px-4 py-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="wealth-focus"
                    onClick={(e) => {
                      e.stopPropagation();
                      /* handle dropdown / menu here */
                    }}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}

            {/* Optionally show a placeholder row when there are no products */}
            {products.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-6 text-center text-[#11223D]/60">
                  No structured products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductsTable;
