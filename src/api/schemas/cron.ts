import { z } from 'zod';

const cronActions = ['sendMessage', 'broadcast', 'postStatus'] as const;

export const createCronSchema = z.object({
  name: z.string().min(1, 'name is required'),
  schedule: z.string().min(1, 'schedule is required'),
  clientId: z.string().min(1, 'clientId is required'),
  action: z.enum(cronActions),
  params: z.record(z.string(), z.unknown()).optional().default({}),
  enabled: z.boolean().optional().default(true),
});

export const updateCronSchema = z.object({
  name: z.string().optional(),
  schedule: z.string().optional(),
  clientId: z.string().optional(),
  action: z.enum(cronActions).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
});
