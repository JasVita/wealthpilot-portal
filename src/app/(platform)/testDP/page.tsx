// DashboardPage.tsx
"use client"
import React, { FC, useState } from 'react';
import {
  ChartBarIcon,
  UserIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  CogIcon,
} from '@heroicons/react/24/outline';


/* ----------  Domain Models ---------- */

interface Holding {
  type: string;
  value: number;
  percentage: number;
  holdings: number;
}

type Tab =
  | 'Holdings'
  | 'Cash Distribution'
  | 'Analysis'
  | 'Profit & Loss'
  | 'Statement'
  | 'Report';

/* ----------  Static Data ---------- */

const HOLDINGS_DATA: Holding[] = [
  { type: 'Deposit', value: 19_541_639, percentage: 29.75, holdings: 18 },
  { type: 'Fixed Income', value: 19_339_648, percentage: 29.45, holdings: 45 },
  { type: 'Equities', value: 12_641_971.69, percentage: 19.25, holdings: 105 },
  { type: 'Cash', value: 10_364_579, percentage: 15.78, holdings: 24 },
  { type: 'Structure Products', value: 2_962_854, percentage: 4.51, holdings: 10 },
  { type: 'Hedge Fund', value: 961_444, percentage: 1.46, holdings: 7 },
];

const TABS = [
  'Holdings',
  'Cash Distribution',
  'Analysis',
  'Profit & Loss',
  'Statement',
  'Report',
] as const satisfies Readonly<Tab[]>;

/* ----------  Main Page ---------- */

const DashboardPage: FC = () => {
  const [selectedTab, setSelectedTab] = useState<Tab>('Holdings');

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-20 bg-white border-r flex flex-col items-center py-4">
        <img
          src="/easyview-logo.png"
          alt="Easyview Limited"
          className="w-12 h-12 mb-6"
        />
        <nav className="space-y-4">
          <SidebarIcon Icon={ChartBarIcon} />
          <SidebarIcon Icon={UserIcon} active />
          <SidebarIcon Icon={DocumentTextIcon} />
          <SidebarIcon Icon={ClipboardDocumentCheckIcon} />
          <SidebarIcon Icon={CogIcon} />
        </nav>
      </aside>

      {/* Content */}
      <section className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2 text-gray-600">
            <span>Product Express</span>
            <span>›</span>
            <span>Client 0001</span>
          </div>
          <input
            type="text"
            placeholder="Search by ISIN / BBG Ticker / Name"
            className="border px-3 py-2 rounded-md w-64"
          />
        </header>

        <main className="p-6 space-y-6">
          {/* Overview */}
          <Overview />

          {/* Holdings / other tabs */}
          <section className="bg-white rounded-lg shadow">
            {/* Tab bar */}
            <nav className="flex space-x-6 px-6 py-4 border-b">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  className={`pb-2 font-medium ${
                    selectedTab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500'
                  }`}
                  onClick={() => setSelectedTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </nav>

            {/* Holdings grid (only when on Holdings tab) */}
            {selectedTab === 'Holdings' && (
              <>
                <div className="grid grid-cols-8 gap-4 p-6">
                  {HOLDINGS_DATA.map((holding) => (
                    <HoldingCard key={holding.type} {...holding} />
                  ))}
                </div>

                {/* Placeholder table */}
                <div className="px-6 pb-6">
                  <TableSkeleton />
                </div>
              </>
            )}
          </section>
        </main>
      </section>
    </div>
  );
};

/* ----------  Reusable Components ---------- */

interface SidebarIconProps {
  Icon: typeof ChartBarIcon;
  active?: boolean;
}

const SidebarIcon: FC<SidebarIconProps> = ({ Icon, active = false }) => (
  <div
    className={`p-3 rounded-lg cursor-pointer ${
      active ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
    }`}
  >
    <Icon className="w-6 h-6" />
  </div>
);

interface FinancialCardProps {
  label: string;
  value: number | string;
  change: number;
  currency?: string;
  percentage?: boolean;
}

const FinancialCard: FC<FinancialCardProps> = ({
  label,
  value,
  change,
  currency,
  percentage,
}) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <div className="text-gray-500 mb-2">{label}</div>
    <div className="flex items-center">
      <span className="text-xl font-bold mr-2">
        {percentage ? `${value}%` : `$${value}`}
      </span>
      {currency && (
        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
          {currency}
        </span>
      )}
      <span
        className={`ml-2 text-sm ${
          change > 0 ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {change > 0 ? '+' : ''}
        {change}%
      </span>
    </div>
  </div>
);

const Overview: FC = () => (
  <section className="bg-white rounded-lg shadow">
    <div className="px-6 py-4 border-b flex justify-between items-center">
      <h2 className="text-xl font-semibold">Overview</h2>
      <div className="flex items-center space-x-4">
        <span className="text-gray-500">Settlement Currency: USD</span>
        <button className="bg-amber-500 text-white px-4 py-2 rounded">
          Upload Statement
        </button>
      </div>
    </div>
    <div className="grid grid-cols-4 gap-4 p-6">
      <FinancialCard
        label="Total Assets"
        value="65,680,416.80"
        change={12}
        currency="USS SG"
      />
      <FinancialCard
        label="Total Liabilities"
        value="4,835,438.00"
        change={-5}
        currency="UBS SG"
      />
      <FinancialCard
        label="Net Assets"
        value="60,844,978.80"
        change={14}
        currency="JP Morgan SG"
      />
      <FinancialCard label="YTD P&L" value="29,698,59" change={12} percentage />
    </div>
  </section>
);

const HoldingCard: FC<Holding> = ({
  type,
  value,
  percentage,
  holdings,
}) => (
  <div className="border rounded-lg p-4 text-center hover:shadow-md cursor-pointer">
    <div className="text-gray-600 mb-2">{type}</div>
    <div className="font-bold text-lg">${value.toLocaleString()}</div>
    <div className="text-sm text-gray-500">
      {percentage}% • {holdings} Holdings
    </div>
  </div>
);

const TableSkeleton: FC = () => (
  <table className="w-full text-sm">
    <thead className="bg-gray-100">
      <tr>
        <th className="p-2 text-left">Account</th>
        <th className="p-2 text-left">Description</th>
        <th className="p-2 text-right">Position Ccy</th>
        <th className="p-2 text-right">Market Value (USD)</th>
        <th className="p-2 text-right">Interest Rate</th>
        <th className="p-2 text-right">Maturity</th>
      </tr>
    </thead>
    <tbody>
      {/* TODO: populate with real rows */}
    </tbody>
  </table>
);

export default DashboardPage;
