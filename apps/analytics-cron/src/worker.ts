/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Scheduled Worker: a Worker that can run on a
 * configurable interval:
 * https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Database } from '@repo/alot-zod';

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
	//
	// Example binding to a D1 Database. Learn more at https://developers.cloudflare.com/workers/platform/bindings/#d1-database-bindings
	DB: D1Database;
	ACCOUNT_IDENTIFIER: string;
	CF_API_KEY: string;
	ZONE_ID: string;
}

export default {
	// The scheduled handler is invoked at the interval set in our wrangler.toml's
	// [[triggers]] configuration.
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		// Grab databases from DB
		const { DB } = env;
		const dbQuery = await DB.prepare(`SELECT * FROM databases where user_id is not null and uuid is not null AND isDeleted = false`).run();

		const databases = dbQuery.results as Database[];

		console.log('databases', databases);

		for (const database of databases) {
			const query = `
				query($accountId: String!, $startDate: String!, $endDate: String!, $databaseId: String!) {
					viewer {
					accounts(filter: { accountTag: $accountId }) {
						d1AnalyticsAdaptiveGroups(
						limit: 10000
						filter: {
							date_geq: $startDate
							date_leq: $endDate
							databaseId: $databaseId
						}
						orderBy: [date_DESC]
						) {
						sum {
							readQueries
							writeQueries
						}
						dimensions {
							date
							databaseId
						} 
						}
					}
					}
				}
				`;
			const endDate = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format
			const startDate = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]; // Date one month ago

			// Replace these with actual values
			const variables = {
				accountId: env.ACCOUNT_IDENTIFIER,
				startDate,
				endDate,
				databaseId: database.uuid,
			};

			const resp = await fetch('https://api.cloudflare.com/client/v4/graphql', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					// Add your authentication header here, for example:
					Authorization: `Bearer ${env.CF_API_KEY}`,
				},
				body: JSON.stringify({
					query: query,
					variables: variables,
				}),
			});
			if (!resp.ok) {
				console.error(
					JSON.stringify({
						text: await resp.text(),
						staus: resp.status,
						statusText: resp.statusText,
					}),
				);
				continue;
			}

			const analyticsJson = await resp.json();
			console.log({ analyticsJson });
		}

		// In this template, we'll just log the result:
		console.log(`trigger fired at ${event.cron}: ${databases}`);
	},
};
