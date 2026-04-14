import express from 'express';

/**
 * Per-route body size limit middleware factory.
 * Usage: router.post('/sendMedia', bodyLimit('50mb'), handler)
 */
export function bodyLimit(limit: string) {
  return express.json({ limit });
}
