import { z } from 'zod';

const messageKeySchema = z.object({
  remoteJid: z.string(),
  fromMe: z.boolean(),
  id: z.string(),
  participant: z.string().optional(),
});

export const reactSchema = z.object({
  key: messageKeySchema,
  emoji: z.string().min(1, 'emoji is required'),
});

export const pollSchema = z.object({
  number: z.string().min(1, 'number is required'),
  title: z.string().min(1, 'title is required'),
  options: z.array(z.string().min(1)).min(2, 'at least 2 options required'),
  singleSelect: z.boolean().optional(),
});

export const viewOnceSchema = z.object({
  number: z.string().min(1, 'number is required'),
  media: z.string().min(1, 'media is required'),
  mediaType: z.enum(['image', 'video']).optional(),
  caption: z.string().optional(),
});

export const editSchema = z.object({
  key: messageKeySchema,
  newText: z.string().min(1, 'newText is required'),
});

export const deleteSchema = z.object({
  key: messageKeySchema,
});

export const replySchema = z.object({
  key: messageKeySchema,
  text: z.string().min(1, 'text is required'),
});

export const forwardSchema = z.object({
  key: messageKeySchema,
  to: z.string().min(1, 'to is required'),
});

export const locationSchema = z.object({
  number: z.string().min(1, 'number is required'),
  latitude: z.number(),
  longitude: z.number(),
  name: z.string().optional(),
  address: z.string().optional(),
});

export const contactSchema = z.object({
  number: z.string().min(1, 'number is required'),
  name: z.string().min(1, 'name is required'),
  contactNumber: z.string().min(1, 'contactNumber is required'),
});

export const stickerSchema = z.object({
  number: z.string().min(1, 'number is required'),
  sticker: z.string().min(1, 'sticker is required'),
});

export const voiceSchema = z.object({
  number: z.string().min(1, 'number is required'),
  audio: z.string().min(1, 'audio is required'),
});

export const readSchema = z.object({
  keys: z.array(messageKeySchema).min(1, 'keys array is required'),
});
