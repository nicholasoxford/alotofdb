import { z } from 'zod';
/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Queue consumer: a Worker that can consume from a
 * Queue: https://developers.cloudflare.com/queues/get-started/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	SUPABASE_URL: string;
	SUPABASE_ANON_KEY: string;
	R2_PUBLIC_URL: string;
	ACCOUNT_IDENTIFIER: string;
	CF_API_KEY: string;
	ZONE_ID: string;
	DB: D1Database;
	KV: KVNamespace;
}

export default {
	// **IMPORTANT**: This is a Queue consumer, not a HTTP request handler.
	// Following the creation of a D1 database, this worker will be triggered
	// 1. Create a worker that will query the database
	// 2. Attach a domain to the worker
	async queue(batch: MessageBatch<Error>, env: Env): Promise<void> {
		// A queue consumer can make requests to other endpoints on the Internet,
		// write to R2 object storage, query a D1 Database, and much more.
		for (let message of batch.messages) {
			// @ts-ignore
			const json = JSON.parse(message.body);
			const parseWorkerBody = await CreateDatabaseQueueSchema.safeParseAsync(json.data);

			if (!parseWorkerBody.success) {
				console.log(parseWorkerBody.error);
				continue;
			}
			const { name, database_uuid, KV_KEY } = parseWorkerBody.data;
			let databaseCreateProgress = (await env.KV.get(KV_KEY, 'json')) as progressData;

			// Create a worker that will query the database
			let url = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_IDENTIFIER}/workers/scripts/${name}`;
			let options = {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/javascript',
					Authorization: `Bearer ${env.CF_API_KEY}`,
				},
				body: `addEventListener('fetch', async (event) => {
				event.respondWith(queryDB(event.request))
				});

				const corsHeaders = {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, OPTIONS, POST, PUT',
					'Access-Control-Allow-Headers': '*',
				  }
				
				async function queryDB(request) {
				// Construct the URL using template literals
				if (request.method === "GET") {
					return new Response("Post for query", {
					status: 200,
					headers: corsHeaders
					})
				}
				// Extract the JSON body from the event
				try {
					const body = await request.body.getReader().read();
					const json = JSON.parse(new TextDecoder().decode(body.value));
					const params = json.params ?? undefined;
					const query = json.query ?? undefined;
					if (!query) {
					return new Response(JSON.stringify({ error: "No query provided" }), { status: 400 })
					}
					let url = "https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_IDENTIFIER}/d1/database/${database_uuid}/query";
					// Define the options for the fetch request
					let options = {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': "Bearer ${env.CF_API_KEY}"
					},
					body: JSON.stringify({
						sql: query,
					})
					};
					// Make the fetch request and await the response
					const resp = await fetch(url, options).catch(e => console.log("ERROR: ", { e }));
					if (!resp) {
					return new Response("No response from query")
					}
					const query_json = await resp.json()
					// Respond to the fetch event with the response from the API
					return new Response(JSON.stringify(query_json.result[0].results), {
					status: 200,
					headers: corsHeaders
					})
				} catch (error) {
					console.log({ error })
					return new Response("Error somewhere",
					{
						status: 500,
						headers: corsHeaders
					})
				}
				}
      				`,
			};
			const create_worker_response = await fetch(url, options);
			if (!create_worker_response.ok) {
				console.error('CREATE WORKER STATUS: ', create_worker_response.status);
				console.error('CREATE WORKER STATUS: ', create_worker_response.statusText);
				console.error('CREATE WORKER TEXT: ', await create_worker_response.text());
				continue;
			}

			// update KV to reflect that the worker has been created
			databaseCreateProgress.workerCreated = true;
			await env.KV.put(KV_KEY, JSON.stringify(databaseCreateProgress));

			// Attach a domain to the worker
			const hostname = `${name}.alotofdatabases.com`;
			let create_url_route = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_IDENTIFIER}/workers/domains`;
			let create_options_route = {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/javascript',
					Authorization: `Bearer ${env.CF_API_KEY}`,
				},
				body: JSON.stringify({
					environment: 'production',
					hostname,
					service: name,
					zone_id: 'd128952c96a3e5558f8a80b17080ff1e',
				}),
			};
			const create_route_response = await fetch(create_url_route, create_options_route);

			// update databses table where uuid = database_uuid and set worker_url = hostname
			const dbUpdateRes = await env.DB.prepare(`UPDATE databases SET worker_url = ? WHERE uuid = ?`).bind(hostname, database_uuid).run();
			if (!dbUpdateRes.success) {
				console.log('DB UPDATE ERROR: ', dbUpdateRes.error);
				continue;
			}

			if (!create_route_response.ok) {
				console.log(create_route_response.text);
				continue;
			}

			// update KV to reflect that the route has been created
			databaseCreateProgress.routeCreated = true;
			await env.KV.put(KV_KEY, JSON.stringify(databaseCreateProgress));

			return;
		}
	},
};

const CreateDatabaseQueueSchema = z.object({
	user_id: z.string(),
	database_uuid: z.string(),
	name: z.string(),
	KV_KEY: z.string(),
});

type progressData = {
	databaseCreated: boolean;
	workerCreated: boolean;
	routeCreated: boolean;
	database_uuid?: string;
	database_name?: string;
};
