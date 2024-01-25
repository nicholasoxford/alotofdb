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

import { fetchOneMonthOfD1DatabasesAnalytics, grabDatabaseQuery } from '@repo/alot-analytics';
import { Database, UserUsageTotals } from '@repo/alot-zod';
import { createClient } from '@supabase/supabase-js';
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
	SUPABASE_URL: string;
	SUPABASE_KEY: string;
}

export default {
	// The scheduled handler is invoked at the interval set in our wrangler.toml's
	// [[triggers]] configuration.
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		// Grab databases from DB

		// Grab list of users from supabase
		const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
		const authList = await supabase.auth.admin.listUsers();

		// For each user we are going to make an analytics repport
		for (const user of authList.data.users) {
			// Fetch associated databases
			const { DB } = env;
			const dbQuery = await DB.prepare(`SELECT * FROM databases where uuid is not null AND isDeleted = false and user_id = ?`)
				.bind(user.id)
				.run();

			const databases = dbQuery.results as Database[];

			// Get databaseIds
			const databaseIds = databases.map((database) => database.uuid).filter((databaseId) => databaseId !== null) as string[];

			// Date one month ago
			const startDate = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
			// Current date in YYYY-MM-DD format
			const endDate = new Date().toISOString().split('T')[0];
			// Returns list of analytics
			const analyticsResults = await fetchOneMonthOfD1DatabasesAnalytics({
				databaseIds,
				env,
				startDate,
				endDate,
			});

			const userUsageTotals = {
				readQueries: 0,
				writeQueries: 0,
				rowsRead: 0,
				rowsWritten: 0,
			} as UserUsageTotals;

			for (const database of analyticsResults) {
				// get user_id from databases\

				const { sum } = database;
				const { readQueries, writeQueries, rowsRead, rowsWritten } = sum;

				userUsageTotals.readQueries += readQueries;
				userUsageTotals.writeQueries += writeQueries;
				userUsageTotals.rowsRead += rowsRead;
				userUsageTotals.rowsWritten += rowsWritten;
			}

			await DB.prepare(
				`INSERT INTO analyticSummaryReports ( readQueries, writeQueries, rowsRead, rowsWritten, startingDate, endingDate, numberOfDatabases, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
				.bind(
					userUsageTotals.readQueries,
					userUsageTotals.writeQueries,
					userUsageTotals.rowsRead,
					userUsageTotals.rowsWritten,
					startDate,
					endDate,
					databaseIds.length,
					user.id,
				)
				.run();
		}
		// In this template, we'll just log the result:
		console.log(`trigger fired at ${event.cron}}`);
	},
};
