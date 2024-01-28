import { Database, parseD1ResponseSchema } from "@repo/alot-zod";

export const grabDatabaseQuery = `
query($accountId: String!, $startDate: String!, $endDate: String!, $databaseId_in: [String!]) {
    viewer {
    accounts(filter: { accountTag: $accountId }) {
        d1AnalyticsAdaptiveGroups(
        limit: 10000
        filter: {
            date_geq: $startDate
            date_leq: $endDate
            databaseId_in:$databaseId_in
        }
        orderBy: [databaseId_DESC]
        ) {
        sum {
            readQueries
            writeQueries
            rowsRead
            rowsWritten
        }
        dimensions {
            date
            databaseId
        }
        quantiles {
            queryBatchTimeMsP50
            queryBatchTimeMsP90
        } 
        }
    }
    }
}
`;

export async function fetchOneMonthOfD1DatabasesAnalytics({
  databaseIds,
  env,
  startDate,
  endDate,
}: {
  databaseIds: string[];
  env: {
    ACCOUNT_IDENTIFIER: string;
    CF_API_KEY: string;
    ZONE_ID: string;
  };
  startDate: string;
  endDate: string;
}) {
  // Replace these with actual values
  const variables = {
    accountId: env.ACCOUNT_IDENTIFIER,
    startDate,
    endDate,
    databaseId_in: databaseIds,
  };
  const resp = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Add your authentication header here, for example:
      Authorization: `Bearer ${env.CF_API_KEY}`,
    },
    body: JSON.stringify({
      query: grabDatabaseQuery,
      variables: variables,
    }),
  });
  if (!resp.ok) {
    console.error(
      JSON.stringify({
        text: await resp.text(),
        staus: resp.status,
        statusText: resp.statusText,
      })
    );
  }

  const analyticsJson = await resp.json();
  // @ts-ignore
  console.log({ analyticsJson: analyticsJson.data.viewer.accounts });

  const parseD1Response =
    await parseD1ResponseSchema.safeParseAsync(analyticsJson);
  if (!parseD1Response.success) {
    console.error(JSON.stringify(parseD1Response.error));
    throw new Error(
      JSON.stringify({
        text: await resp.text(),
        staus: resp.status,
        statusText: resp.statusText,
        message: "Failed to parse D1 response",
        error: parseD1Response.error,
      })
    );
  }
  const userDatabases =
    parseD1Response.data.data.viewer.accounts[0]?.d1AnalyticsAdaptiveGroups;
  return userDatabases;
}
