import { NextApiRequest, NextApiResponse } from "next";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "@/lib/db";

/** ──────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────*/
const BANKS = ["JPMorgan", "Bank of Singapore", "UBS"];
const randomBank = () => BANKS[Math.floor(Math.random() * BANKS.length)];

const randomDate = () => {
  // any date in 2024-2025
  const d = new Date(
    2024 + Math.floor(Math.random() * 2),
    Math.floor(Math.random() * 12),
    1 + Math.floor(Math.random() * 28)
  );
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
};

/** sample blocks the user provided (trimmed very slightly for brevity) */
/* ------------------------------------------------------------------
 *  SAMPLE_ASSETS  (full)
 * ------------------------------------------------------------------*/
export const SAMPLE_ASSETS = {
  cash_holdings: {
    "Cash Holdings": [
      {
        Description: "U.S. Dollar Current Account",
        ccy: "USD",
        balance: 17177.44,
        current_market_value_usd: 17177.44,
        portfolio_pct: 0.0173,
      },
    ],
  },

  deposits: {},

  short_term_investments: {
    "Short Term Investments (with maturity less than 1 year) by Currency": [
      {
        description:
          "JPMORGAN LIQUIDITY FUNDS JPM USD LIQUIDITY LVNAV W (ACC.) LU1873131988 Non-Collective safe custody account Luxembourg",
        quantity: 16.91,
        status: null,
        unit_cost: 11829.36,
        market_price: 11844.34,
        price_date: "2025-05-30",
        avg_cost_usd: 200046.38,
        market_value_of_holdings_usd: 200299.98,
        accrued_interest: 0.0,
        unrealised_gain_loss_usd_capital: 253.6,
        unrealised_gain_loss_usd_fx: 0.0,
        est_annual_income_usd: null,
        ytm: null,
        portfolio_pct: 0.2012,
      },
    ],
  },

  equity_holdings: {
    "Equity Holdings by Market": [
      {
        security_description:
          "SPDR S & P 500 ETF TRUST ETF US78462F1030 Non-Collective safe custody account United States of America",
        ccy: "USD",
        quantity: 200.0,
        status: null,
        unit_cost: 546.36,
        market_price: 589.39,
        price_date: "2025-05-30",
        avg_cost_usd: 109272.5,
        market_value_of_holdings_usd: 117878.0,
        accrued_interest: 0.0,
        unrealised_gain_loss_usd_capital: 8605.5,
        unrealised_gain_loss_usd_fx: 0.0,
        portfolio_pct: 0.1184,
      },
    ],
  },

  derivative_holdings: {
    "Options, Swaps & Structured Assets by Currency": [
      {
        description: "BARC FCN TSM US 11.7600% 061025 XS3025776686 XS3025776686 02.06.2025-06.10.2025",
        ccy: "USD",
        quantity: 100000.0,
        status: null,
        unit_cost: 100.0,
        market_price: 100.0,
        price_date: "2025-05-19",
        avg_cost_usd: 100000.0,
        market_value_of_holdings_usd: 100000.0,
        accrued_interest: 0.0,
        unrealised_gain_loss_usd_capital: 0.0,
        unrealised_gain_loss_usd_fx: 0.0,
        portfolio_pct: 0.1005,
      },
      {
        description: "BNP FCN AAPL US 6.5800% 061025 XS3035098873 XS3035098873 02.06.2025-06.10.2025",
        ccy: "USD",
        quantity: 180000.0,
        status: null,
        unit_cost: 100.0,
        market_price: 100.0,
        price_date: "2025-05-19",
        avg_cost_usd: 180000.0,
        market_value_of_holdings_usd: 180000.0,
        accrued_interest: 0.0,
        unrealised_gain_loss_usd_capital: 0.0,
        unrealised_gain_loss_usd_fx: 0.0,
        portfolio_pct: 0.1808,
      },
      {
        description: "BNP FCN CRM US 9.5900% 061025 XS3035098527 XS3035098527 02.06.2025-06.10.2025",
        ccy: "USD",
        quantity: 180000.0,
        status: null,
        unit_cost: 100.0,
        market_price: 100.0,
        price_date: "2025-05-19",
        avg_cost_usd: 180000.0,
        market_value_of_holdings_usd: 180000.0,
        accrued_interest: 0.0,
        unrealised_gain_loss_usd_capital: 0.0,
        unrealised_gain_loss_usd_fx: 0.0,
        portfolio_pct: 0.1808,
      },
      {
        description: "GS FCN AMZN US 10.3300% 061025 XS3041681290 XS3041681290 02.06.2025-06.10.2025",
        ccy: "USD",
        quantity: 100000.0,
        status: null,
        unit_cost: 100.0,
        market_price: 100.0,
        price_date: "2025-05-19",
        avg_cost_usd: 100000.0,
        market_value_of_holdings_usd: 100000.0,
        accrued_interest: 0.0,
        unrealised_gain_loss_usd_capital: 0.0,
        unrealised_gain_loss_usd_fx: 0.0,
        portfolio_pct: 0.1005,
      },
      {
        description: "GS FCN META US 9.0400% 061025 XS3041681373 XS3041681373 02.06.2025-06.10.2025",
        ccy: "USD",
        quantity: 100000.0,
        status: null,
        unit_cost: 100.0,
        market_price: 100.0,
        price_date: "2025-05-19",
        avg_cost_usd: 100000.0,
        market_value_of_holdings_usd: 100000.0,
        accrued_interest: 0.0,
        unrealised_gain_loss_usd_capital: 0.0,
        unrealised_gain_loss_usd_fx: 0.0,
        portfolio_pct: 0.1005,
      },
    ],
  },

  hedge_fund_holdings: {},
  private_equity_holdings: {},
};

/* ------------------------------------------------------------------
 *  SAMPLE_TRANSACTIONS  (full)
 * ------------------------------------------------------------------*/
export const SAMPLE_TRANSACTIONS = {
  settled_cash_account_transactions: {
    "CAPITAL U.S. DOLLAR": [
      {
        booking_date: "2025-05-01",
        settlement_date: "2025-05-01",
        type: "OPENING BALANCE",
        reference: null,
        description: "OPENING BALANCE",
        credits_or_debits: 106630.86,
        credits_or_debits_value_in_usd: 106630.86,
      },
      {
        booking_date: "2025-05-20",
        settlement_date: "2025-05-20",
        type: "COUPONS",
        reference: null,
        description: "GS FCN AMZN US 18.7500% 200825 XS3 021042125 18.75% 16.04.2025-20.08.2025",
        credits_or_debits: 1562.5,
        credits_or_debits_value_in_usd: 1562.5,
      },
      {
        booking_date: "2025-05-20",
        settlement_date: "2025-05-20",
        type: "COUPONS",
        reference: null,
        description: "BNP FCN TSM US 22.0700% 200825 XS2 997056762 22.07% 16.04.2025-20.08.2025",
        credits_or_debits: 3310.49,
        credits_or_debits_value_in_usd: 3310.49,
      },
      {
        booking_date: "2025-05-20",
        settlement_date: "2025-05-20",
        type: "COUPONS",
        reference: null,
        description: "BNP FCN AAPL US 13.1000% 200825 XS 2997057067 13.1% 16.04.2025-20.08.2025",
        credits_or_debits: 1964.99,
        credits_or_debits_value_in_usd: 1964.99,
      },
      {
        booking_date: "2025-05-20",
        settlement_date: "2025-05-20",
        type: "COUPONS",
        reference: null,
        description: "BARC FCN METAUS 16.2500% 200825 XS2925756459 16.25% 16.04.2025-20.08.2025",
        credits_or_debits: 1354.5,
        credits_or_debits_value_in_usd: 1354.5,
      },
      {
        booking_date: "2025-05-20",
        settlement_date: "2025-05-20",
        type: "COUPONS",
        reference: null,
        description: "BARC FCN ABT US 9.0900% 200825 XS2 925758158 9.09% 16.04.2025-20.08.2025",
        credits_or_debits: 757.8,
        credits_or_debits_value_in_usd: 757.8,
      },
      {
        booking_date: "2025-05-20",
        settlement_date: "2025-05-20",
        type: "COUPONS",
        reference: null,
        description: "BARC FCN CRM US 13.1500% 200825 XS 2925756889 13.15% 16.04.2025-20.08.2025",
        credits_or_debits: 1096.1,
        credits_or_debits_value_in_usd: 1096.1,
      },
      {
        booking_date: "2025-05-20",
        settlement_date: "2025-05-20",
        type: "MATURITIES OF SECURITIES",
        reference: null,
        description: "BNP FCN TSM US 22.0700% 200825 XS2 997056762 22.07% 16.04.2025-20.08.2025",
        credits_or_debits: 180000.0,
        credits_or_debits_value_in_usd: 180000.0,
      },
      {
        booking_date: "2025-05-20",
        settlement_date: "2025-05-20",
        type: "MATURITIES OF SECURITIES",
        reference: null,
        description: "BNP FCN AAPL US 13.1000% 200825 XS 2997057067 13.1% 16.04.2025-20.08.2025",
        credits_or_debits: 180000.0,
        credits_or_debits_value_in_usd: 180000.0,
      },
      {
        booking_date: "2025-05-20",
        settlement_date: "2025-05-20",
        type: "MATURITIES OF SECURITIES",
        reference: null,
        description: "GS FCN AMZN US 18.7500% 200825 XS3 021042125 18.75% 16.04.2025-20.08.2025",
        credits_or_debits: 100000.0,
        credits_or_debits_value_in_usd: 100000.0,
      },
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-05-20",
        type: "MATURITIES OF SECURITIES",
        reference: null,
        description: "BARC FCN META US 16.2500% 200825 XS2925756459 16.25% 16.04.2025-20.08.2025",
        credits_or_debits: 100000.0,
        credits_or_debits_value_in_usd: 100000.0,
      },
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-05-20",
        type: "MATURITIES OF SECURITIES",
        reference: null,
        description: "BARC FCN ABT US 9.0900% 200825 XS2 925758158 9.09% 16.04.2025-20.08.2025",
        credits_or_debits: 100000.0,
        credits_or_debits_value_in_usd: 100000.0,
      },
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-05-20",
        type: "MATURITIES OF SECURITIES",
        reference: null,
        description: "BARC FCN CRM US 13.1500% 200825 XS 2925756889 13.15% 16.04.2025-20.08.2025",
        credits_or_debits: 100000.0,
        credits_or_debits_value_in_usd: 100000.0,
      },
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-05-21",
        type: "DEPOSIT PLACEMENT",
        reference: null,
        description: "2.25% 21.05.2025-02.06.2025",
        credits_or_debits: -660000.0,
        credits_or_debits_value_in_usd: -660000.0,
      },
      {
        booking_date: "2025-05-22",
        settlement_date: "2025-05-22",
        type: "SUBSCRIPTION",
        reference: null,
        description: "JPMORGAN LIQUIDITY FUNDS JPM USD LIQUIDITY LVNAV W (ACC.)",
        credits_or_debits: -200046.38,
        credits_or_debits_value_in_usd: -200046.38,
      },
      {
        booking_date: "2025-05-30",
        settlement_date: "2025-05-31",
        type: "INTEREST RECEIVED",
        reference: null,
        description: "CREDIT AS OF 31.05.25",
        credits_or_debits: 51.58,
        credits_or_debits_value_in_usd: 51.58,
      },
    ],
  },

  pending_cash_account_transactions: {
    "CAPITAL U.S. DOLLAR": [
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-06-02",
        type: "PURCHASE OF SECURITIES",
        reference: null,
        description: "GS FCN META US 9.0400% 061025 XS30 41681373 9.04% 02.06.2025-06.10.2025",
        credits_or_debits: -100000.0,
        credits_or_debits_value_in_usd: -100000.0,
      },
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-06-02",
        type: "PURCHASE OF SECURITIES",
        reference: null,
        description: "GS FCN AMZN US 10.3300% 061025 XS3 041681290 10.33% 02.06.2025-06.10.2025",
        credits_or_debits: -100000.0,
        credits_or_debits_value_in_usd: -100000.0,
      },
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-06-02",
        type: "PURCHASE OF SECURITIES",
        reference: null,
        description: "BNP FCN CRM US 9.5900% 061025 XS30 35098527 9.59% 02.06.2025-06.10.2025",
        credits_or_debits: -180000.0,
        credits_or_debits_value_in_usd: -180000.0,
      },
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-06-02",
        type: "PURCHASE OF SECURITIES",
        reference: null,
        description: "BNP FCN AAPL US 6.5800% 061025 XS3 035098873 6.58% 02.06.2025-06.10.2025",
        credits_or_debits: -180000.0,
        credits_or_debits_value_in_usd: -180000.0,
      },
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-06-02",
        type: "PURCHASE OF SECURITIES",
        reference: null,
        description: "BARC FCN TSM US 11.7600% 061025 XS 3025776686 11.76% 02.06.2025-06.10.2025",
        credits_or_debits: -100000.0,
        credits_or_debits_value_in_usd: -100000.0,
      },
      {
        booking_date: "2025-05-28",
        settlement_date: "2025-06-02",
        type: "INTEREST RECEIVED",
        reference: null,
        description: "INTEREST RECEIVED 2.25% 21.05.2025-02.06.2025",
        credits_or_debits: 495.0,
        credits_or_debits_value_in_usd: 495.0,
      },
    ],
  },

  fx_gain_or_loss_cash_account_transactions: {
    "CAPITAL U.S. DOLLAR": [
      {
        booking_date: null,
        settlement_date: null,
        type: null,
        reference: null,
        description: "FX GAIN/LOSS",
        credits_or_debits: 0.0,
        credits_or_debits_value_in_usd: 0.0,
      },
    ],
  },

  security_transactions: {
    "Security Transactions": [
      {
        booking_date: "2025-05-20",
        settlement_date: "2025-05-20",
        type: "Maturity",
        description: "BNP FCN AAPL US 13.1000% 200825 XS 2997057067 13.1% -16.04.2025-20.08.2025",
        ccy: "USD",
        quantity: -180000.0,
        price_local: 100.0,
        fees_comission_taxes: 0.0,
        total_consideration_local: 180000.0,
        total_consideration_base: 180000.0,
        accrued_interest_local: 0.0,
        accrued_interest_base: 0.0,
      },
      {
        booking_date: "2025-05-20",
        settlement_date: "2025-05-20",
        type: "Maturity",
        description: "BNP FCN TSM US 22.0700% 200825 XS2 997056762 22.07% -16.04.2025-20.08.2025",
        ccy: "USD",
        quantity: -180000.0,
        price_local: 100.0,
        fees_comission_taxes: 0.0,
        total_consideration_local: 180000.0,
        total_consideration_base: 180000.0,
        accrued_interest_local: 0.0,
        accrued_interest_base: 0.0,
      },
      {
        booking_date: "2025-05-20",
        settlement_date: "2025-05-20",
        type: "Maturity",
        description: "GS FCN AMZN US 18.7500% 200825 XS3 021042125 18.75% -16.04.2025-20.08.2025",
        ccy: "USD",
        quantity: -100000.0,
        price_local: 100.0,
        fees_comission_taxes: 0.0,
        total_consideration_local: 100000.0,
        total_consideration_base: 100000.0,
        accrued_interest_local: 0.0,
        accrued_interest_base: 0.0,
      },
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-05-20",
        type: "Maturity",
        description: "BARC FCN ABT US 9.0900% 200825 XS2 925758158 9.09% -16.04.2025-20.08.2025",
        ccy: "USD",
        quantity: -100000.0,
        price_local: 100.0,
        fees_comission_taxes: 0.0,
        total_consideration_local: 100000.0,
        total_consideration_base: 100000.0,
        accrued_interest_local: 0.0,
        accrued_interest_base: 0.0,
      },
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-05-20",
        type: "Maturity",
        description: "BARC FCN CRM US 13.1500% 200825 XS 2925756889 13.15% -16.04.2025-20.08.2025",
        ccy: "USD",
        quantity: -100000.0,
        price_local: 100.0,
        fees_comission_taxes: 0.0,
        total_consideration_local: 100000.0,
        total_consideration_base: 100000.0,
        accrued_interest_local: 0.0,
        accrued_interest_base: 0.0,
      },
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-05-20",
        type: "Maturity",
        description: "BARC FCN META US 16.2500% 200825 X XS2925756459 16.25% -16.04.2025-20.08.2025",
        ccy: "USD",
        quantity: -100000.0,
        price_local: 100.0,
        fees_comission_taxes: 0.0,
        total_consideration_local: 100000.0,
        total_consideration_base: 100000.0,
        accrued_interest_local: 0.0,
        accrued_interest_base: 0.0,
      },
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-06-02",
        type: "Purchase",
        description: "BARC FCN TSM US 11.7600% 061025 XS 3025776686 11.76% -02.06.2025-06.10.2025",
        ccy: "USD",
        quantity: 100000.0,
        price_local: 100.0,
        fees_comission_taxes: 0.0,
        total_consideration_local: -100000.0,
        total_consideration_base: -100000.0,
        accrued_interest_local: 0.0,
        accrued_interest_base: 0.0,
      },
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-06-02",
        type: "Purchase",
        description: "BNP FCN AAPL US 6.5800% 061025 XS3 035098873 6.58% -02.06.2025-06.10.2025",
        ccy: "USD",
        quantity: 180000.0,
        price_local: 100.0,
        fees_comission_taxes: 0.0,
        total_consideration_local: -180000.0,
        total_consideration_base: -180000.0,
        accrued_interest_local: 0.0,
        accrued_interest_base: 0.0,
      },
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-06-02",
        type: "Purchase",
        description: "BNP FCN CRM US 9.5900% 061025 XS30 35098527 9.59% -02.06.2025-06.10.2025",
        ccy: "USD",
        quantity: 180000.0,
        price_local: 100.0,
        fees_comission_taxes: 0.0,
        total_consideration_local: -180000.0,
        total_consideration_base: -180000.0,
        accrued_interest_local: 0.0,
        accrued_interest_base: 0.0,
      },
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-06-02",
        type: "Purchase",
        description: "GS FCN AMZN US 10.3300% 061025 XS3 041681290 10.33% -02.06.2025-06.10.2025",
        ccy: "USD",
        quantity: 100000.0,
        price_local: 100.0,
        fees_comission_taxes: 0.0,
        total_consideration_local: -100000.0,
        total_consideration_base: -100000.0,
        accrued_interest_local: 0.0,
        accrued_interest_base: 0.0,
      },
      {
        booking_date: "2025-05-21",
        settlement_date: "2025-06-02",
        type: "Purchase",
        description: "GS FCN META US 9.0400% 061025 XS30 41681373 9.04% -02.06.2025-06.10.2025",
        ccy: "USD",
        quantity: 100000.0,
        price_local: 100.0,
        fees_comission_taxes: 0.0,
        total_consideration_local: -100000.0,
        total_consideration_base: -100000.0,
        accrued_interest_local: 0.0,
        accrued_interest_base: 0.0,
      },
      {
        booking_date: "2025-05-22",
        settlement_date: "2025-05-22",
        type: "Subscript.",
        description: "JPMORGAN LIQUIDITY FUNDS JPM USD LIQUIDITY LVNAV W (ACC.)",
        ccy: "USD",
        quantity: 16.91,
        price_local: 11829.29,
        fees_comission_taxes: 0.0,
        total_consideration_local: -200046.38,
        total_consideration_base: -200046.38,
        accrued_interest_local: 0.0,
        accrued_interest_base: 0.0,
      },
    ],
  },
};

/** ──────────────────────────────────────────────────────────────
 * Route Handler
 * ──────────────────────────────────────────────────────────────*/
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    const now = new Date();

    const item = {
      PK: "doc",
      SK: now.toISOString(), // e.g. 2025-06-27T10:54:32.000Z
      bank_name: randomBank(),
      as_of_date: randomDate(),
      excel_report_url: "https://example.com/report.xlsx",
      assets: SAMPLE_ASSETS,
      transactions: SAMPLE_TRANSACTIONS,
    };

    await ddbDocClient.send(
      new PutCommand({
        TableName: "exampleTable", // ← change if your table name differs
        Item: item,
      })
    );

    res.status(200).json({ success: true, inserted: item });
  } catch (err: any) {
    console.error("PutItem Error:", err);
    res.status(500).json({ error: err.message || "Unknown error" });
  }
}
