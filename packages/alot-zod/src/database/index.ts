import { z } from "zod";

export const createDatabaseFormSchema = z.object({
  name: z.string(),
});

export type CreateDatabaseFormSchema = z.infer<typeof createDatabaseFormSchema>;

export const createDatabaseFormSchemaResponse = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const DatabaseSchema = z.object({
  id: z.number(), // INTEGER PRIMARY KEY AUTOINCREMENT
  name: z.string(), // TEXT NOT NULL
  description: z.string().nullable(), // TEXT, can be NULL
  user_id: z.number(), // INTEGER NOT NULL
  size: z.number().nullable(), // INTEGER, can be NULL
  created_at: z.date().or(z.string()), // DATETIME NOT NULL
  updated_at: z.date().or(z.string()), // DATETIME NOT NULL
  uuid: z.string().nullable(), // TEXT, can be NULL
  worker_url: z.string().nullable(), // TEXT, can be NULL
  host: z.string().nullable(), // TEXT, can be NULL
  port: z.number().nullable(), // INTEGER, can be NULL
  db_type: z.string(), // TEXT NOT NULL
  isDeleted: z.boolean().default(false).optional(), // INTEGER NOT NULL
});

export const DatabaseTableSchema = z.object({
  // DatabaseSchema
  ...DatabaseSchema.shape,
  numberOfTables: z.number(),
});

export type DatabaseTableType = z.infer<typeof DatabaseTableSchema>;

export type Database = z.infer<typeof DatabaseSchema>;

export const querySchema = z.object({
  query: z.string(),
  database_name: z.string().optional(),
});

export const CreateDatabaseQueueSchema = z.object({
  user_id: z.string(),
  database_uuid: z.string(),
  name: z.string(),
  KV_KEY: z.string(),
});

export type CreateDatabaseQueueSchemaType = z.infer<
  typeof CreateDatabaseQueueSchema
>;

export const CheckProgressDatabaseSchema = z.object({
  KV_KEY: z.string(),
});

export type CheckProgressDatabaseSchemaType = z.infer<
  typeof CheckProgressDatabaseSchema
>;

export const DeleteDatabaseSchema = z.object({
  database_uuid: z.string(),
  delete_worker: z.boolean().default(true),
  worker_name: z.string().optional(),
  user_id: z.string().optional(),
});
