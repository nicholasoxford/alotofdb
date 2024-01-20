import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/cloudflare";
import { DeleteDatabaseSchema } from "@repo/alot-zod";

export async function loader({ request }: LoaderFunctionArgs) {
  // return hello world
  return new Response(JSON.stringify({ hello: "world" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  // grab env from context
  let env = context.env as Env;

  // parse form data
  const formData = await request.formData();
  const parseDeleteDatabase = await DeleteDatabaseSchema.safeParseAsync({
    database_uuid: formData.get("database_uuid"),
    delete_worker: Boolean(formData.get("delete_worker")),
    worker_name: formData.get("worker_name"),
  });
  if (!parseDeleteDatabase.success) {
    return new Response(parseDeleteDatabase.error.toString(), { status: 400 });
  }
  const { database_uuid, delete_worker, worker_name } =
    parseDeleteDatabase.data;

  let deleteProgress = {
    deletedWorker: false,
    deletedUserDataBase: false,
    updateDatabaseTable: false,
  };

  // delete worker
  if (delete_worker) {
    //let url = 'https://api.cloudflare.com/client/v4/accounts/account_identifier/workers/scripts/script_name';
    let delete_worker_url = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_IDENTIFIER}/workers/scripts/${worker_name}`;
    let delete_worker_options = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.CF_API_KEY}`,
      },
    };
    const deleteWorkerResponse = await fetch(
      delete_worker_url,
      delete_worker_options
    );

    if (deleteWorkerResponse.ok) {
      deleteProgress.deletedWorker = true;
    }
  }

  let delete_database_url = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_IDENTIFIER}/d1/database/${database_uuid}`;
  let delete_database_options = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.CF_API_KEY}`,
    },
  };
  const deleteDatabaseResponse = await fetch(
    delete_database_url,
    delete_database_options
  );
  if (deleteDatabaseResponse.ok) {
    deleteProgress.deletedUserDataBase = true;
  }
  // update to isDeleted = true in databases table
  const dbResponse = await env.DB.prepare(
    `UPDATE databases SET isDeleted = true WHERE uuid = ?`
  )
    .bind(database_uuid)
    .run();
  if (!dbResponse.success) {
    return new Response(JSON.stringify({ error: "Error updating DB" }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  deleteProgress.updateDatabaseTable = true;

  return json(deleteProgress);
}
