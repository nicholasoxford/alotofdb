import { LoaderFunctionArgs, json } from "@remix-run/cloudflare";
import { useLoaderData, useParams, useSearchParams } from "@remix-run/react";
import { fetchOneMonthOfD1DatabasesAnalytics } from "@repo/alot-analytics";
import { createServerClient } from "@supabase/auth-helpers-remix";

export async function loader({ request, context }: LoaderFunctionArgs) {
  let env = context.env as Env;
  const db = env.DB;
  const response = new Response();

  // grad uuid from end of url
  const url = new URL(request.url);
  // after last slash is uuid
  const uuid = url.pathname.split("/").pop();
  if (!uuid) {
    return json(
      {
        session: null,
        assets: null,
      },
      {
        headers: response.headers,
      }
    );
  }

  if (!uuid) {
    return json(
      {
        session: null,
        assets: null,
      },
      {
        headers: response.headers,
      }
    );
  }

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

  console.log("getting here?", { uuid });
  // Date one month ago
  const startDate = new Date(new Date().setMonth(new Date().getMonth() - 1))
    .toISOString()
    .split("T")[0];
  // Current date in YYYY-MM-DD format
  const endDate = new Date().toISOString().split("T")[0];
  const resp = await fetchOneMonthOfD1DatabasesAnalytics({
    databaseIds: [uuid],
    env,
    startDate,
    endDate,
  });
  console.log("resp now", resp);

  if (!resp) {
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
  return json(
    {
      session,
      assets: resp,
    },
    {
      headers: response.headers,
    }
  );
}

export default function Database() {
  const { uuid } = useParams<{ uuid: string }>();
  const { session, assets } = useLoaderData<typeof loader>();

  if (!uuid) {
    return <div>Database not found</div>;
  }

  return <div>{`Database: ${uuid}`}</div>;
}
