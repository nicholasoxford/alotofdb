import type { ColumnDef } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from "../ui/table";
import { useEffect, useState } from "react";
import { DatabaseTableType } from "@repo/alot-zod";
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DatabaseTable<TData, TValue>({
  columns,
  data,
  setLoadingNumberOfTables,
  setTableData,
}: DataTableProps<DatabaseTableType, TValue> & {
  setLoadingNumberOfTables: React.Dispatch<React.SetStateAction<boolean>>;
  setTableData: React.Dispatch<
    React.SetStateAction<DatabaseTableType[] | undefined>
  >;
}) {
  // if data changes we need to update the table

  const [callTableCount, setCallTableCount] = useState(false);

  const table = useReactTable<DatabaseTableType>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Create an array of worker_url columns
  const workerUrls = table.getRowModel().rows.map((row) => {
    return {
      worker_url: row.original.worker_url,
      db_uuid: row.original.uuid,
    };
  });

  useEffect(() => {
    if (!callTableCount) {
      setLoadingNumberOfTables(true);
      const fetchWorkerUrls = async () => {
        const requests = workerUrls.map(async (row) => {
          if (!row.db_uuid) {
            return Promise.reject(
              `Error fetching from ${row.worker_url}: No db_uuid`
            );
          }
          let url = row.worker_url;
          if (url) {
            if (!url.startsWith("http")) {
              url = "https://" + url;
            }

            const tableQueryResult = await fetch(url, {
              method: "POST",
              body: JSON.stringify({
                query: "PRAGMA table_list",
              }),
            }); // Assuming response needs to be parsed as JSON
            if (!tableQueryResult.ok) {
              return Promise.reject(
                `Error fetching from ${row.worker_url}: ${tableQueryResult.statusText}`
              );
            }
            let tableQueryResults = (await tableQueryResult.json()) as {
              schema: string;
              name: string;
              type: string;
              ncol: number;
              wr: number;
              strict: number;
            }[];
            const tableQueryResultsFiltered = tableQueryResults.filter(
              ({ name }) => {
                if (name.startsWith("sqlite_") || name.startsWith("_cf")) {
                  return false;
                }
                return true;
              }
            );
            return Promise.resolve({
              numberOfTables: tableQueryResultsFiltered.length,
              tableQueryResultsFiltered,
              db_uuid: row.db_uuid,
            });
          }
          return Promise.resolve(null);
        });

        const v = await Promise.allSettled(requests);
        v.forEach((result) => {
          if (result.status === "fulfilled") {
            const value = result.value;
            if (!value || !value.db_uuid) {
              return;
            }
            const row = table
              .getRowModel()
              .rows.find((row) => row.original.uuid === value.db_uuid);
            if (row) {
              setTableData((prev) => {
                return prev?.map((prevRow) => {
                  if (prevRow.uuid === value.db_uuid) {
                    return {
                      ...prevRow,
                      numberOfTables: value.numberOfTables ?? 0,
                    };
                  }
                  return prevRow;
                });
              });
            }
          }
        });
        setLoadingNumberOfTables(false);
        setCallTableCount(true);
      };

      fetchWorkerUrls();
    }
  }, [
    callTableCount,
    setLoadingNumberOfTables,
    setTableData,
    table,
    workerUrls,
  ]);

  return (
    // Rest of your component rendering
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
