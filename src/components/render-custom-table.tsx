"use client";

import React from "react";

type TableData = {
  columns: string[];
  rows: any[];
};

export function RenderCustomTable({ data }: { data: TableData }) {
  const { columns, rows } = data;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-300">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="p-2 font-semibold">Account</th>
            {columns.map((col) => (
              <th key={col} className="p-2 font-semibold capitalize">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            // If 'account' is present, it's a nested row
            if (row.account && Array.isArray(row.account)) {
              return row.account.map((acctKey: string) => {
                const rowData = row[acctKey];
                return (
                  <tr key={`${idx}-${acctKey}`} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-mono">{acctKey}</td>
                    {columns.map((col) => (
                      <td key={col} className="p-2">
                        {rowData?.[col] ?? "-"}
                      </td>
                    ))}
                  </tr>
                );
              });
            } else {
              return (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-mono">—</td>
                  {columns.map((col) => (
                    <td key={col} className="p-2">
                      {row[col] ?? "-"}
                    </td>
                  ))}
                </tr>
              );
            }
          })}
        </tbody>
      </table>
    </div>
  );
}
