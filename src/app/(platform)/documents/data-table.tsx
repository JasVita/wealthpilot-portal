import React from "react";

interface DataTableProps {
  title?: string;
  rows: Record<string, unknown>[] | undefined | null;
}

export const DataTable = ({ title, rows }: DataTableProps) => {
  if (!Array.isArray(rows) || !rows.length) return null; // 👈 guard

  const columns = Object.keys(rows[0] ?? {});

  if (!columns.length) return null;

  return (
    <section className="space-y-2">
      {title && <h4 className="font-semibold">{title}</h4>}

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-left text-xs md:text-sm">
          <thead className="bg-gray-200/60">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 font-medium">
                  {col.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0 odd:bg-white even:bg-gray-50">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 whitespace-nowrap">
                    {String((row as any)?.[col] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
