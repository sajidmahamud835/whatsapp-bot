export interface RegisteredWebhook {
  id: string;
  url: string;
  events: string[]; // ['*'] = all events, or specific event names
  secret: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryAttempt {
  webhookId: string;
  event: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  error: string | null;
  createdAt: number;
}
