import { type ReactNode } from 'react';

interface Column<T> {
  header: string | (() => ReactNode);
  accessor: keyof T | ((row: T) => ReactNode);
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
}

export const DataTable = <T extends object>({ columns, data }: DataTableProps<T>) => (
  <div className="bg-white rounded-lg shadow overflow-x-auto">
    <table className="w-full">
      <thead className="bg-primary text-white">
        <tr>
          {columns.map((col, index) => (
            <th key={col.header.toString() + index} className="p-2 text-left">
              {typeof col.header === 'function' ? col.header() : col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr key={index} className="border-b hover:bg-ash">
            {columns.map((col, colIndex) => (
              <td key={col.header.toString() + colIndex} className="p-2">
                {typeof col.accessor === 'function' ? col.accessor(row) : String(row[col.accessor] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);