export interface WaWebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WaInboundMessage[];
        statuses?: WaDeliveryStatus[];
      };
    }>;
  }>;
}

export interface WaInboundMessage {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  audio?: { id?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
  };
}

export interface WaDeliveryStatus {
  id?: string;
  status?: string;
  recipient_id?: string;
  errors?: Array<{
    code?: string | number;
    title?: string;
    message?: string;
    error_data?: { details?: string };
  }>;
}
