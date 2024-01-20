import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { CheckProgressDatabaseSchema } from "@repo/alot-zod";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const env = context.env as Env;
  const json = request.json();
  const parsedStatusCheck =
    await CheckProgressDatabaseSchema.safeParseAsync(json);
  if (!parsedStatusCheck.success) {
    return new Response(JSON.stringify({ error: parsedStatusCheck.error }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  const { KV_KEY } = parsedStatusCheck.data;
  const data = await env.KV.get(KV_KEY);
  if (!data) {
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  return new Response(data, {
    headers: {
      "Content-Type": "application/json",
    },
  });
};
