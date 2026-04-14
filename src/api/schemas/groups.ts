import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(1, 'name is required'),
  participants: z.array(z.string().min(1)).min(1, 'participants required'),
});

export const joinGroupSchema = z.object({
  invite: z.string().min(1, 'invite code is required'),
});

export const participantsSchema = z.object({
  participants: z.array(z.string().min(1)).min(1, 'participants required'),
});

export const updateGroupSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  photo: z.string().optional(),
}).refine(data => data.name || data.description || data.photo, {
  message: 'At least one field (name, description, photo) is required',
});

export const groupSettingsSchema = z.object({
  announce: z.boolean().optional(),
  restrict: z.boolean().optional(),
});
