import { z } from 'zod';

export const sendMessageSchema = z.object({
  number: z.string().min(1, 'number is required'),
  message: z.string().min(1, 'message is required'),
});

export const sendMediaSchema = z.object({
  number: z.string().min(1, 'number is required'),
  mediaUrl: z.string().url('mediaUrl must be a valid URL'),
  caption: z.string().optional(),
});

export const sendBulkSchema = z.object({
  numbers: z.array(z.string().min(1)).min(1, 'numbers array is required'),
  message: z.string().min(1, 'message is required'),
});

export const sendButtonsSchema = z.object({
  number: z.string().min(1, 'number is required'),
  body: z.string().min(1, 'body is required'),
  buttons: z.array(z.object({
    id: z.string(),
    body: z.string(),
  })).min(1, 'buttons array is required'),
  title: z.string().optional(),
  footer: z.string().optional(),
});
