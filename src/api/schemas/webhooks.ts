import { z } from 'zod';

export const createWebhookSchema = z.object({
  url: z.string().url('url must be a valid URL'),
  events: z.array(z.string()).optional().default(['*']),
  secret: z.string().optional(),
  enabled: z.boolean().optional().default(true),
});

export const updateWebhookSchema = z.object({
  url: z.string().url('url must be a valid URL').optional(),
  events: z.array(z.string()).optional(),
  secret: z.string().optional(),
  enabled: z.boolean().optional(),
});
