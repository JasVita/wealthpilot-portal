// Mock data for financial dashboard
export interface AccountBalance {
  bankName: string;
  accountType: string;
  balance: number;
  currency: string;
}

export interface Asset {
  type: string;
  value: number;
  percentage: number;
}

export interface Currency {
  name: string;
  code: string;
  value: number;
  percentage: number;
}

export interface Holding {
  name: string;
  type: string;
  value: number;
  change: number;
}

export interface CashFlow {
  month: string;
  income: number;
  expense: number;
}

export interface Alert {
  type: "warning" | "info" | "success" | "error";
  title: string;
  description: string;
}

export interface Performance {
  period: string;
  return: number;
  sp500: number;
  hsi: number;
}

export interface News {
  title: string;
  source: string;
  date: string;
  relevance: string;
  impact: "positive" | "negative" | "neutral";
  url: string;
}

export interface ClientData {
  clientName: string;
  totalNetWorth: number;
  accounts: AccountBalance[];
  assets: Asset[];
  currencies: Currency[];
  topHoldings: Holding[];
  cashFlow: CashFlow[];
  alerts: Alert[];
  performance: Performance[];
  news: News[];
}

export const getMockClientData = (): ClientData => {
  return {
    clientName: "John Smith",
    totalNetWorth: 1356789.45,
    accounts: [
      { bankName: "HSBC", accountType: "Savings", balance: 125600.25, currency: "USD" },
      { bankName: "Citi", accountType: "Checking", balance: 45750.8, currency: "USD" },
      { bankName: "Standard Chartered", accountType: "Investment", balance: 985438.4, currency: "USD" },
      { bankName: "HSBC", accountType: "Savings", balance: 200000.0, currency: "HKD" },
    ],
    assets: [
      { type: "Cash", value: 171351.05, percentage: 12.6 },
      { type: "Equities", value: 643275.0, percentage: 47.4 },
      { type: "Bonds", value: 264574.94, percentage: 19.5 },
      { type: "Others", value: 277588.46, percentage: 20.5 },
    ],
    currencies: [
      { name: "US Dollar", code: "USD", value: 1030789.45, percentage: 76 },
      { name: "Hong Kong Dollar", code: "HKD", value: 200000.0, percentage: 14.7 },
      { name: "Euro", code: "EUR", value: 96000.0, percentage: 7.1 },
      { name: "Japanese Yen", code: "JPY", value: 30000.0, percentage: 2.2 },
    ],
    topHoldings: [
      { name: "Apple Inc.", type: "Equity", value: 125000.0, change: 3.5 },
      { name: "US Treasury 2.75% 2032", type: "Bond", value: 100000.0, change: 0.8 },
      { name: "Vanguard Total Stock Market ETF", type: "Fund", value: 85000.0, change: 2.1 },
      { name: "Microsoft Corp", type: "Equity", value: 78500.0, change: -1.2 },
      { name: "Amazon.com Inc", type: "Equity", value: 65000.0, change: 1.5 },
    ],
    cashFlow: [
      { month: "Jan", income: 12500, expense: 8200 },
      { month: "Feb", income: 12500, expense: 7600 },
      { month: "Mar", income: 12700, expense: 9100 },
      { month: "Apr", income: 12500, expense: 7900 },
      { month: "May", income: 12500, expense: 8400 },
      { month: "Jun", income: 18500, expense: 9200 },
      { month: "Jul", income: 12500, expense: 10100 },
      { month: "Aug", income: 12500, expense: 8700 },
      { month: "Sep", income: 12500, expense: 8200 },
      { month: "Oct", income: 12500, expense: 8500 },
      { month: "Nov", income: 22500, expense: 12200 },
      { month: "Dec", income: 12500, expense: 14500 },
    ],
    alerts: [
      {
        type: "warning",
        title: "Idle Cash Alert",
        description: "Cash holdings exceed 10% of portfolio. Consider investment opportunities.",
      },
      {
        type: "info",
        title: "Large Transaction Detected",
        description: "Unusual transfer of $18,500 on June 15th.",
      },
      {
        type: "error",
        title: "Investment Opportunity Missed",
        description: "High cash balance maintained for over 3 months.",
      },
      {
        type: "success",
        title: "Positive Cash Flow",
        description: "Income exceeded expenses by 32% this year.",
      },
    ],
    performance: [
      { period: "1M", return: 2.3, sp500: 1.8, hsi: -0.5 },
      { period: "3M", return: 5.8, sp500: 6.2, hsi: 3.1 },
      { period: "6M", return: 8.4, sp500: 9.5, hsi: 5.2 },
      { period: "1Y", return: 12.6, sp500: 15.3, hsi: 8.7 },
      { period: "YTD", return: 7.2, sp500: 8.1, hsi: 4.3 },
    ],
    news: [
      {
        title: "Fed Signals Potential Rate Cuts",
        source: "Financial Times",
        date: "2025-04-27",
        relevance: "Impact on your bond holdings (35% of portfolio)",
        impact: "positive",
        url: "#",
      },
      {
        title: "Apple Announces New Product Line",
        source: "Bloomberg",
        date: "2025-04-26",
        relevance: "Affects AAPL position (8% of portfolio)",
        impact: "positive",
        url: "#",
      },
      {
        title: "USD/HKD Exchange Rate Volatility",
        source: "Reuters",
        date: "2025-04-25",
        relevance: "Affects 14.7% of portfolio in HKD",
        impact: "negative",
        url: "#",
      },
    ],
  };
};
