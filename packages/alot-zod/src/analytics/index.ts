import { z } from "zod";

const sumSchema = z.object({
  readQueries: z.number(),
  writeQueries: z.number(),
  rowsRead: z.number(),
  rowsWritten: z.number(),
});

const dimensionsSchema = z.object({
  date: z.string(), // Assuming date is a string; adjust the type if needed
  databaseId: z.string(), // Assuming databaseId is a string; adjust the type if needed
});

const quantilesSchema = z.object({
  queryBatchTimeMsP50: z.number(),
  queryBatchTimeMsP90: z.number(),
});

export const DatabaseAnalyticsSchema = z.object({
  sum: sumSchema,
  dimensions: dimensionsSchema,
  quantiles: quantilesSchema,
});

export type DatabaseAnalytics = z.infer<typeof DatabaseAnalyticsSchema>;

export const parseD1ResponseSchema = z.object({
  data: z.object({
    viewer: z.object({
      accounts: z.array(
        z.object({
          d1AnalyticsAdaptiveGroups: z.array(DatabaseAnalyticsSchema),
        })
      ),
    }),
  }),
});

export type ParseD1Response = z.infer<typeof parseD1ResponseSchema>;

export const userUsageTotalsSchema = z.object({
  readQueries: z.number(),
  writeQueries: z.number(),
  rowsRead: z.number(),
  rowsWritten: z.number(),
});

export type UserUsageTotals = z.infer<typeof userUsageTotalsSchema>;
