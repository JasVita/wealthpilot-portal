import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  bank: string;
  isin: string;
  productName: string;
  productType: string;
  notional: string;
  marketValue: string;
  portfolioPercent: string;
  issueDate: string;
  maturity: string;
  strike: string;
  unrealizedPL: string;
  unrealizedPLColor: "positive" | "negative";
}

interface ProductDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const ProductDrawer = ({ isOpen, onClose, product }: ProductDrawerProps) => {
  if (!isOpen || !product) return null;

  const cashFlowData = [
    { date: "2024-03-15", type: "Coupon", amount: "$12,500", status: "Paid" },
    { date: "2024-06-15", type: "Coupon", amount: "$12,500", status: "Paid" },
    { date: "2024-09-15", type: "Coupon", amount: "$12,500", status: "Scheduled" },
    { date: "2024-12-15", type: "Coupon", amount: "$12,500", status: "Scheduled" },
    { date: "2025-03-15", type: "Maturity", amount: "$500,000", status: "Scheduled" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-[#11223D]">Note details – {product.productName}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="wealth-focus">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-8">
          {/* Product Overview */}
          <div className="glass-card rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[#11223D] mb-4">Product Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[#11223D]/60 mb-1">Issuing Bank</p>
                <p className="font-medium text-[#11223D]">{product.bank}</p>
              </div>
              <div>
                <p className="text-sm text-[#11223D]/60 mb-1">ISIN</p>
                <p className="font-mono text-sm text-[#11223D]">{product.isin}</p>
              </div>
              <div>
                <p className="text-sm text-[#11223D]/60 mb-1">Product Type</p>
                <span className="px-2 py-1 bg-[#0CA3A3]/10 text-[#0CA3A3] rounded-full text-sm font-medium">
                  {product.productType}
                </span>
              </div>
              <div>
                <p className="text-sm text-[#11223D]/60 mb-1">Strike Level</p>
                <p className="font-medium text-[#11223D]">{product.strike || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-[#11223D]/60 mb-1">Issue Date</p>
                <p className="font-medium text-[#11223D]">{product.issueDate}</p>
              </div>
              <div>
                <p className="text-sm text-[#11223D]/60 mb-1">Maturity Date</p>
                <p className="font-medium text-[#11223D]">{product.maturity}</p>
              </div>
            </div>
          </div>

          {/* Performance */}
          <div className="glass-card rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[#11223D] mb-4">Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-[#11223D]/60 mb-1">Notional Amount</p>
                <p className="text-xl font-semibold text-[#11223D]">{product.notional}</p>
              </div>
              <div>
                <p className="text-sm text-[#11223D]/60 mb-1">Current Market Value</p>
                <p className="text-xl font-semibold text-[#11223D]">{product.marketValue}</p>
              </div>
              <div>
                <p className="text-sm text-[#11223D]/60 mb-1">Unrealized P/L</p>
                <p
                  className={`text-xl font-semibold ${
                    product.unrealizedPLColor === "positive" ? "text-[#12B76A]" : "text-[#F97066]"
                  }`}
                >
                  {product.unrealizedPL}
                </p>
              </div>
            </div>
          </div>

          {/* Cash Flow Schedule */}
          <div className="glass-card rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[#11223D] mb-4">Cash Flow Schedule</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-[#11223D]">Date</th>
                    <th className="text-left py-2 font-medium text-[#11223D]">Type</th>
                    <th className="text-right py-2 font-medium text-[#11223D]">Amount</th>
                    <th className="text-center py-2 font-medium text-[#11223D]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlowData.map((flow, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 text-[#11223D]">{flow.date}</td>
                      <td className="py-3 text-[#11223D]/80">{flow.type}</td>
                      <td className="py-3 text-right font-medium text-[#11223D]">{flow.amount}</td>
                      <td className="py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            flow.status === "Paid" ? "bg-[#12B76A]/10 text-[#12B76A]" : "bg-[#0CA3A3]/10 text-[#0CA3A3]"
                          }`}
                        >
                          {flow.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Term Sheet Preview */}
          <div className="glass-card rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[#11223D] mb-4">Term Sheet</h3>
            <div className="border border-gray-200 rounded-lg p-8 text-center bg-gray-50">
              <div className="text-6xl text-gray-300 mb-4">📄</div>
              <p className="text-[#11223D]/60">Term sheet preview would appear here</p>
              <Button className="mt-4 bg-[#0CA3A3] hover:bg-[#0CA3A3]/90 wealth-focus">Download PDF</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDrawer;
