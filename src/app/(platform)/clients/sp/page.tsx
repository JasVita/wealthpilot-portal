"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import UserHeader from "@/components/sp/user-header";
import InfoCards from "@/components/sp/info-cards";
import ProductsTable from "@/components/sp/products-table";
import MaturityChart from "@/components/sp/maturity-card";
import CounterpartyRiskChart from "@/components/sp/risk-chart";
import ProductDrawer from "@/components/sp/product-drawer";

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

const Index = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleRowClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto px-6 py-8">
        <UserHeader />

        {/* Greeting Block */}
        <div className="mb-8">
          <p className="text-lg italic text-[#11223D]/60 max-w-4xl leading-relaxed">
            Good to see you, James! Your structured notes are working quietly in the background &ndash; here&apos;s the
            full picture, fresh to the minute. Tap any row to peek inside the payoff, coupon dates and next
            cash&ndash;flow.
          </p>
        </div>

        <InfoCards />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <MaturityChart />
          <CounterpartyRiskChart />
        </div>

        {/* Data Table */}
        <div className="mb-8">
          <ProductsTable onRowClick={handleRowClick} />
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between pt-6 border-t border-white/20">
          <p className="text-sm text-[#11223D]/50">
            Data updated{" "}
            {new Date().toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <Button variant="outline" className="border-[#11223D]/20 text-[#11223D] hover:bg-[#11223D]/5 wealth-focus">
            Download CSV
          </Button>
        </footer>
      </div>

      {/* Product Details Drawer */}
      <ProductDrawer isOpen={isDrawerOpen} onClose={closeDrawer} product={selectedProduct} />
    </div>
  );
};

export default Index;

const test = [
  {
    bank: "J.P. Morgan",
    as_of_date: "31-05-2025",
    cash_and_equivalents: [
      {
        asset_name: "U.S. Dollar Current Account",
        balance_USD: 17177.44,
      },
      {
        asset_name: "JPMORGAN LIQUIDITY FUNDS JPM USD LIQUIDITY LVNAV W (ACC.)",
        balance_USD: 200299.98,
      },
    ],
    direct_fixed_income: [],
    fixed_income_funds: [],
    direct_equities: [
      {
        stock_name: "SPDR S&P 500 ETF TRUST",
        number_of_shares: 200,
        market_value_USD: 117878,
      },
    ],
    equities_fund: [],
    alternative_fund: [],
    structured_products: [
      {
        product_name: "BARC FCN TSM US 11.7600% 061025 XS3025776686",
        notional_USD: 100000,
        market_value_USD: 100000,
      },
      {
        product_name: "BNP FCN AAPL US 6.5800% 061025 XS3035098873",
        notional_USD: 180000,
        market_value_USD: 180000,
      },
      {
        product_name: "BNP FCN CRM US 9.5900% 061025 XS3035098527",
        notional_USD: 180000,
        market_value_USD: 180000,
      },
      {
        product_name: "GS FCN AMZN US 10.3300% 061025 XS3041681290",
        notional_USD: 100000,
        market_value_USD: 100000,
      },
      {
        product_name: "GS FCN META US 9.0400% 061025 XS3041681373",
        notional_USD: 100000,
        market_value_USD: 100000,
      },
    ],
    loans: [],
  },
  {
    bank: "Bank of Singapore",
    as_of_date: "31-05-2025",
    cash_and_equivalents: [
      {
        asset_name: "Current Account USD 10-1001-001715148",
        balance_USD: 238049.44,
      },
      {
        asset_name: "FIXED DEPOSITS USD 3.95% 12/06/2025 AA250658QQ1M",
        balance_USD: 667637.64,
      },
      {
        asset_name: "FIXED DEPOSITS USD 3.95% 12/06/2025 AA250658QQ1M (interest)",
        balance_USD: 2270.9,
      },
    ],
    direct_fixed_income: [],
    fixed_income_funds: [
      {
        fund_name: "AB-American Income A2 USD-ACC LU0095030564 PRR:2",
        units: 6879.945,
        market_value_USD: 222084.62,
      },
      {
        fund_name: "LA Shrt Dur Inc USD Z Acc-ACC IE00BFNWYB63 PRR:2",
        units: 16313.214,
        market_value_USD: 205383.36,
      },
      {
        fund_name: "MNG (Lux) Optinc A-H Acc USD-ACC LU1670725347 PRR:3",
        units: 16591.177,
        market_value_USD: 200016.59,
      },
      {
        fund_name: "PIMCO GIS INCOME FUND EA USD ACC IE00B7XLF1990 PRR:4",
        units: 12604.156,
        market_value_USD: 210614.55,
      },
      {
        fund_name: "VF TF Strat Inc Fd H h USD-ACC LU1695535135 PRR:5",
        units: 1621.987,
        market_value_USD: 206073.45,
      },
    ],
    direct_equities: [
      {
        stock_name: "AMAZON.COM INC US0231351067 AMZN.US PRR:3",
        number_of_shares: 150,
        market_value_USD: 30751.5,
      },
      {
        stock_name: "MICROSOFT CORPORATION US5949181045 MSFT.US PRR:3",
        number_of_shares: 100,
        market_value_USD: 46036,
      },
    ],
    equities_fund: [
      {
        fund_name: "GMO Qly Invest J USD-ACC IE00B7JWCQ50 PRR:3",
        units: 1614.466,
        market_value_USD: 49870.85,
      },
    ],
    alternative_fund: [
      {
        fund_name: "AAAP-MLE SP TLI F USD-ACC XD1433777764",
        units: 2250,
        market_value_USD: 227317.5,
      },
      {
        fund_name: "AAAP-MILE FD 10125F USD-ACC QTX005136838",
        units: 250,
        market_value_USD: 24407.5,
      },
    ],
    structured_products: [
      {
        product_name: "6M USD OCBC FCN - AMZN.OQ, TSM.N 22 0725 XS2597807030 PRR:5",
        notional_USD: 100000,
        market_value_USD: 98660,
      },
    ],
    loans: [],
  },
  {
    bank: "UBS Singapore",
    as_of_date: "31-05-2025",
    cash_and_equivalents: [
      {
        asset_name: "Current Account for Private Clients EUR",
        balance_USD: 9050,
      },
      {
        asset_name: "Current Account for Private Clients USD",
        balance_USD: 3592,
      },
      {
        asset_name: "Current Account for Private Clients HKD",
        balance_USD: 250,
      },
      {
        asset_name: "Call Deposit USD",
        balance_USD: 388145,
      },
    ],
    direct_fixed_income: [],
    fixed_income_funds: [
      {
        fund_name: "JPMorgan Funds SICAV Income JPM A(mth)-USD-dist",
        units: 4597.7,
        market_value_USD: 35770,
      },
      {
        fund_name: "PIMCO Funds Global Investors Series Plc - Income Fund E-USD",
        units: 3906.25,
        market_value_USD: 36836,
      },
    ],
    direct_equities: [
      {
        stock_name: "Novo Nordisk A/S (Sponsored American Deposit Receipt)",
        number_of_shares: 1250,
        market_value_USD: 89375,
      },
      {
        stock_name: "PayPal Holdings Inc.",
        number_of_shares: 604,
        market_value_USD: 42449,
      },
      {
        stock_name: "The Walt Disney Company",
        number_of_shares: 250,
        market_value_USD: 28260,
      },
    ],
    equities_fund: [
      {
        fund_name: "BlackRock Global Funds SICAV - World Healthscience Fund A2-capitalisation",
        units: 1726.52,
        market_value_USD: 112120,
      },
    ],
    alternative_fund: [
      {
        fund_name: "Apollo Debt Solutions BDC iCapital Offshore Access Fund SPC SP 1 A-B-series C-dist",
        units: 101.16,
        market_value_USD: 99750,
      },
      {
        fund_name: "Partners Group Global Value SICAV R-N-USD-capitalisation",
        units: 670.96,
        market_value_USD: 119035,
      },
    ],
    structured_products: [
      {
        product_name: "8% Autocallable RCN Barrick Gold/Newmont (2025-24.11.2025)",
        notional_USD: 100000,
        market_value_USD: 99227,
      },
      {
        product_name: "8% J.P. Morgan SP (NL) Blackrock Rg/Blackstone (2024-12.06.2025)",
        notional_USD: 100000,
        market_value_USD: 86478,
      },
      {
        product_name: "8% Vontobel FP (AE) Wells Fargo/Bank ofAmer. (2024-24.06.2025)",
        notional_USD: 100000,
        market_value_USD: 98900,
      },
      {
        product_name: "8% Autocall Barrier RCN META/Alphabet -A (2025-21.07.2025)",
        notional_USD: 100000,
        market_value_USD: 100110,
      },
      {
        product_name: "8% Autocall Barrier RCN Thermofishe/Eli Lilly (2025-06.08.2025)",
        notional_USD: 100000,
        market_value_USD: 92894,
      },
      {
        product_name: "8% Autocall Barrier RCN LockheedMart/Boeing (2025-06.08.2025)",
        notional_USD: 100000,
        market_value_USD: 100674,
      },
      {
        product_name: "8% Autocall Barrier RCN Dell Tech -C/Apple (2025-06.08.2025)",
        notional_USD: 100000,
        market_value_USD: 100551,
      },
      {
        product_name: "8% Autocallable RCN JPMorgan Ch/Goldm Sachs (2025-07.08.2025)",
        notional_USD: 100000,
        market_value_USD: 99281,
      },
      {
        product_name: "10% Autocall Barrier RCN Broadcom/Amazon (2025-11.08.2025)",
        notional_USD: 100000,
        market_value_USD: 99177,
      },
      {
        product_name: "8% Autocall Barrier RCN META/Nvidia (2025-20.08.2025)",
        notional_USD: 100000,
        market_value_USD: 100480,
      },
      {
        product_name: "8% Autocall Barrier RCN Alphabet -A/Broadcom (2025-17.09.2025)",
        notional_USD: 100000,
        market_value_USD: 99964,
      },
      {
        product_name: "8% Autocallable RCN BARC Microsoft/Apple/Adobe (2025-16.12.2025)",
        notional_USD: 100000,
        market_value_USD: 100000,
      },
      {
        product_name: "8% Autocall Barrier RCN JPM SPDR Gold/FreeportMcMo (2024-25.07.2025)",
        notional_USD: 100000,
        market_value_USD: 96378,
      },
      {
        product_name: "8% Autocall Barrier RCN ASML Holding/Taiwan Semi (2025-18.08.2025)",
        notional_USD: 100000,
        market_value_USD: 99756,
      },
      {
        product_name: "Perles CIO Chi Reopen USD (2023-08.02.2030)",
        notional_USD: 100500,
        market_value_USD: 73169,
      },
      {
        product_name: "Tracker Cert. London on CIO Tech. Disrupt. EQ (2023-18.10.2030)",
        notional_USD: 103193,
        market_value_USD: 113496,
      },
      {
        product_name: "Participation Notes CIO Longevity USD (2025-01.04.2032)",
        notional_USD: 99136,
        market_value_USD: 95465,
      },
      {
        product_name: "8% Autocall Barrier RCN JD.com -ADR/Alibaba -ADR (2025-17.09.2025)",
        notional_USD: 100000,
        market_value_USD: 99429,
      },
    ],
    loans: [],
  },
];
