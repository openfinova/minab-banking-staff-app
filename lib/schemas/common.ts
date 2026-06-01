import { z } from "zod";

export const pageRequestSchema = z.object({
  page: z.number().int().min(0).optional(),
  size: z.number().int().min(1).max(200).optional(),
  sort: z.union([z.string(), z.array(z.string())]).optional(),
});

export type PageRequestInput = z.infer<typeof pageRequestSchema>;

export const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use ISO date format YYYY-MM-DD");

export const isoDateTimeString = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Use ISO-8601 timestamp");
