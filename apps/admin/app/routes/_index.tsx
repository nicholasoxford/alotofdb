import {
  json,
  type MetaFunction,
  type LoaderFunctionArgs,
} from "@remix-run/cloudflare";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { Database, DatabaseTableType } from "@repo/alot-zod";
import { createServerClient } from "@supabase/auth-helpers-remix";
import { useEffect, useState } from "react";
import CreateDatabase from "~/components/create-database";
import { Columns } from "~/components/database-table/columns";
import { DatabaseTable } from "~/components/database-table/database-table";
import Login from "~/components/login";

export const meta: MetaFunction = () => {
  return [
    { title: "A Lot Of Databases" },
    {
      name: "description",
      content: "The easiest way to create a lot of databases",
    },
  ];
};

export default function Index() {
  const { session, assets } = useLoaderData<typeof loader>();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingNumberOfTables, setLoadingNumberOfTables] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const isSignUpValue = searchParams.get("isSignUp") === "true";
  const [isSignUp, setSignUp] = useState(isSignUpValue);

  const [tableData, setTableData] = useState<DatabaseTableType[] | undefined>(
    assets?.map((asset) => ({
      ...asset,
      numberOfTables: 0,
    }))
  );
  useEffect(() => {
    // Directly parse the `isSignUp` value inside useEffect
    if (searchParams.has("isSignUp")) {
      setSignUp(isSignUpValue);
    }
    if (assets) {
      setTableData(
        assets.map((asset) => ({
          ...asset,
          numberOfTables: 0,
        }))
      );
    }
  }, [isSignUpValue, searchParams, assets]); // Only depend on searchParams

  return (
    <div
      style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}
      className="flex text-center justify-center flex-col  min-h-screen w-full "
    >
      <div>
        <h1 className="mb-2">Welcome to A Lot Of Databases</h1>
      </div>

      {session ? (
        <div>
          <div className="w-full flex justify-center align-middle items-center">
            <CreateDatabase />
          </div>

          {!!tableData && (
            <div className="container mx-auto py-10">
              <DatabaseTable
                columns={Columns({
                  setIsLoading,
                  loadingNumberOfTables,
                  isLoading,
                })}
                setLoadingNumberOfTables={setLoadingNumberOfTables}
                data={tableData}
                setTableData={setTableData}
              />
            </div>
          )}
        </div>
      ) : (
        <Login isSignUp={isSignUp} setSearchParams={setSearchParams} />
      )}
      <h1 className="mt-2">
        {" "}
        Create more databases than days in an year, or centuries!
      </h1>
    </div>
  );
}
export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  let env = context.env as Env;
  const db = env.DB;
  const response = new Response();
  const supabase = createServerClient(
    env.SUPABASE_URL!,
    env.SUPABASE_ANON_KEY!,
    {
      request,
      response,
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return json(
      {
        session,
        assets: null,
      },
      {
        headers: response.headers,
      }
    );
  }

  const { results } = await db
    .prepare(
      "SELECT * FROM databases WHERE user_id = ? AND isDeleted = false ORDER BY created_at DESC LIMIT 10"
    )
    .bind(session.user.id)
    .all<Database>();
  return json(
    {
      session,
      assets: results.map((result) => ({
        ...result,
        created_at:
          new Date(result.created_at + "Z").toLocaleTimeString() +
          " " +
          new Date(result.created_at).toLocaleDateString(),
        updated_at: new Date(result.updated_at).toLocaleDateString(),
      })),
    },
    {
      headers: response.headers,
    }
  );
};
