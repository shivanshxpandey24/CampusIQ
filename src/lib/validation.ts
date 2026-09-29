import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export const recordSchema = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(1000).default(""),
  status: z.string().trim().min(1).max(40).default("Open"),
  amount: z.union([z.number().finite().nonnegative().max(1_000_000_000), z.null()]).optional(),
  dueDate: z.union([z.string().datetime(), z.null()]).optional(),
  fields: z.record(z.string().max(100), z.string().max(500)).default({}),
});

export const assistantSchema = z.object({
  prompt: z.string().trim().min(3).max(1000),
});
