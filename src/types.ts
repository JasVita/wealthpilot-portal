import { z } from "zod";

export const PieChartSchema = z.object({
  title: z.string(),
  labels: z.array(z.string()).default([]),
  data: z.array(z.number()).default([]),
  colors: z.array(z.string()).default([]),
});

export const PieChartResponseSchema = z.object({
  charts: z.array(PieChartSchema).default([]),
});

export const CashEquivSchema = z.object({
  asset_name: z.string().optional(),
  balance_USD: z.number().optional(),
});

export const FixedIncBondSchema = z.object({
  bond_name: z.string().optional(),
  face_value: z.number().optional(),
  market_value_USD: z.number().optional(),
});

export const FixedIncFundSchema = z.object({
  fund_name: z.string().optional(),
  units: z.number().optional(),
  market_value_USD: z.number().optional(),
});

export const EquityHoldingSchema = z.object({
  stock_name: z.string().optional(),
  number_of_shares: z.number().optional(),
  market_value_USD: z.number().optional(),
});

export const StructProductSchema = z.object({
  product_name: z.string().optional(),
  notional_USD: z.number().optional(),
  market_value_USD: z.number().optional(),
});

export const LoanRowSchema = z.object({
  loan_description: z.string().optional(),
  outstanding_balance_USD: z.number().optional(),
});

export const StockTableSchema = z.object({
  bank: z.string(),
  as_of_date: z.string(),
  cash_and_equivalents: z.array(CashEquivSchema).optional(),
  direct_fixed_income: z.array(FixedIncBondSchema).optional(),
  fixed_income_funds: z.array(FixedIncFundSchema).optional(),
  direct_equities: z.array(EquityHoldingSchema).optional(),
  equities_fund: z.array(FixedIncFundSchema).optional(),
  alternative_fund: z.array(FixedIncFundSchema).optional(),
  structured_products: z.array(StructProductSchema).optional(),
  loans: z.array(LoanRowSchema).optional(),
});

export const FullServerResponseSchema = z.object({
  Pie_chart: PieChartResponseSchema.optional(),
  Table: z.array(StockTableSchema).default([]),
  File_IDs: z.array(z.string()).optional(),
  Excel_Report_URL: z.string().optional(),
});

// TypeScript types from schema
export type PieChart = z.infer<typeof PieChartSchema>;
export type PieChartResponse = z.infer<typeof PieChartResponseSchema>;
export type StockTable = z.infer<typeof StockTableSchema>;
export type FullServerResponse = z.infer<typeof FullServerResponseSchema>;
export type PieData = {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
  }[];
};
export type Message = {
  content: string;
  isUser: boolean;
  timestamp?: string;
  isLoading?: boolean;
};
