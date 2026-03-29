import { getApiBase, buildHeaders, handleApiError, success, error } from '../utils.js';

export async function stopCommand(): Promise<void> {
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/health`, { headers: buildHeaders() });
    if (!res.ok) {
      error('Server is not responding or already stopped');
      process.exit(1);
    }
    // Send shutdown signal via a special endpoint (if implemented)
    // For now, we just inform the user
    success('To stop the server, press Ctrl+C in the server terminal');
    success('Or send SIGTERM to the server process');
  } catch (err) {
    handleApiError(err);
  }
}
