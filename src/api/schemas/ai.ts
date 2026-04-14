import { z } from 'zod';

export const aiTestSchema = z.object({
  message: z.string().min(1, 'message is required'),
  provider: z.string().optional(),
});

export const aiPromptSchema = z.object({
  prompt: z.string().min(1, 'prompt is required'),
});

export const aiConfigSchema = z.object({
  enabled: z.boolean().optional(),
  defaultProvider: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
});
