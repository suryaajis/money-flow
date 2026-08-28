/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { WaApiError, WaNotifierService } from './wa-notifier.service';

describe('WaNotifierService', () => {
  const values: Record<string, string> = {
    WA_ACCESS_TOKEN: 'test-token',
    WA_PHONE_NUMBER_ID: '123456789',
    WA_GRAPH_API_VERSION: 'v25.0',
    WA_TEMPLATE_LANGUAGE: 'id',
    WA_REQUEST_TIMEOUT_MS: '1000',
  };
  const config = {
    get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback),
  };
  const repository = {
    create: jest.fn((value: any) => value),
    insert: jest.fn(async (value: any) => ({
      identifiers: [{ id: value.id }],
    })),
    update: jest.fn(async () => ({ affected: 1 })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends an approved template and records the returned wamid', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ messages: [{ id: 'wamid.template-1' }] }),
    });
    global.fetch = fetchMock as any;
    const service = new WaNotifierService(config as any, repository as any);

    const result = await service.sendTemplate(
      '628123456789',
      'moneyflow_debt_due',
      ['Budi', 100000],
    );

    expect(result).toEqual({
      messageId: 'wamid.template-1',
      accepted: true,
      devMode: false,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.facebook.com/v25.0/123456789/messages',
      expect.objectContaining({ method: 'POST' }),
    );
    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(request.body)).toMatchObject({
      to: '628123456789',
      type: 'template',
      template: {
        name: 'moneyflow_debt_due',
        language: { code: 'id' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Budi' },
              { type: 'text', text: '100000' },
            ],
          },
        ],
      },
    });
    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'wamid.template-1' }),
    );
  });

  it('surfaces Meta API errors instead of silently succeeding', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          error: {
            code: 131047,
            message: 'Re-engagement message',
            error_data: { details: 'Customer service window expired' },
          },
        }),
    }) as any;
    const service = new WaNotifierService(config as any, repository as any);

    await expect(service.sendText('628123456789', 'hello')).rejects.toEqual(
      expect.objectContaining<Partial<WaApiError>>({
        httpStatus: 400,
        metaCode: 131047,
      }),
    );
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('updates asynchronous delivery failures from webhook statuses', async () => {
    const service = new WaNotifierService(config as any, repository as any);

    await service.updateDeliveryStatus({
      id: 'wamid.failed-1',
      status: 'failed',
      recipient_id: '628123456789',
      errors: [
        { code: 131026, error_data: { details: 'Message undeliverable' } },
      ],
    });

    expect(repository.update).toHaveBeenCalledWith(
      'wamid.failed-1',
      expect.objectContaining({
        status: 'failed',
        errorCode: '131026',
        errorDetails: 'Message undeliverable',
      }),
    );
  });
});
