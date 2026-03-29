/**
 * WA Convo — Legacy entry point redirect
 * This file exists for backward compatibility.
 * The main entry point is now: src/api/server.ts
 *
 * @deprecated Use `src/api/server.ts` directly
 */

// Re-export everything from the new server
export { default } from './api/server.js';
