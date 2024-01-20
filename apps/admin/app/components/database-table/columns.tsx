import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "../ui/button";
import { Form, Link } from "@remix-run/react";
import { Loader2 } from "lucide-react";
import { DatabaseTableType } from "@repo/alot-zod";

// i need columns to be a function that accepts a useState

export function Columns({
  isLoading,
  setIsLoading,
  loadingNumberOfTables,
}: {
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  loadingNumberOfTables: boolean;
}): ColumnDef<DatabaseTableType>[] {
  console.log({ loadingNumberOfTables });
  return [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "created_at",
      header: "Created At",
    },
    {
      accessorKey: "db_type",
      header: "Database Type",
    },
    {
      accessorKey: "worker_url",
      header: "Worker URL",
    },
    {
      accessorKey: "Number of Tables",
      header: "numberOfTables",
      cell: ({ row }) => {
        const database = row.original;

        if (loadingNumberOfTables) {
          return (
            <div className="w-full flex justify-center items-center my-1">
              <Loader2 className="animate-spin" size={24} />
            </div>
          );
        }
        if (database.numberOfTables) {
          return <div>{database.numberOfTables} </div>;
        }
        return (
          <Button variant={"outline"}>
            <Link to={`/database/${database.uuid}`}> Create Tables</Link>
          </Button>
        );
      },
    },

    {
      accessorKey: "delete",
      cell: ({ row }) => {
        const database = row.original;
        if (!database.uuid) {
          return null;
        }

        return (
          <Form
            action="/api/delete-database"
            method="POST"
            navigate={false}
            onSubmit={(event) => {
              // submit form and then update state
              event.preventDefault();
              setIsLoading(true);
              fetch("/api/delete-database", {
                method: "POST",
                body: new FormData(event.currentTarget),
              })
                .then((res) => res.json())
                .then((data: any) => {
                  setIsLoading(false);
                  if (data.error) {
                    alert(data.error);
                  } else {
                    window.location.reload();
                  }
                })
                .catch((error) => {
                  setIsLoading(false);
                  alert(error);
                });
            }}
          >
            <input type="hidden" name="database_uuid" value={database.uuid} />
            <input type="hidden" name="delete_worker" value="true" />
            <input type="hidden" name="worker_name" value={database.name} />
            <Button type="submit" variant="destructive">
              {isLoading ? (
                <div className="w-full flex justify-center items-center">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              ) : (
                "Delete"
              )}
            </Button>
          </Form>
        );
      },
    },
  ];
}
