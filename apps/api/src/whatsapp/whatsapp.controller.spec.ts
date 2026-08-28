/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { WhatsappController } from './whatsapp.controller';

describe('WhatsappController', () => {
  const secret = 'app-secret-for-tests';
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      const values: Record<string, string> = {
        WA_APP_SECRET: secret,
        WA_ACCESS_TOKEN: 'token',
        WA_PHONE_NUMBER_ID: 'phone-id',
        NODE_ENV: 'test',
      };
      return values[key] ?? fallback;
    }),
  };
  const whatsappService = {
    handleTextMessage: jest.fn(),
    handleAudioMessage: jest.fn(),
    handleButtonReply: jest.fn(),
  };
  const notifier = { updateDeliveryStatus: jest.fn() };
  const eventRepo = {
    create: jest.fn((value: any) => value),
    insert: jest.fn(async () => ({ identifiers: [] })),
    update: jest.fn(async () => ({ affected: 1 })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function signedRequest(body: any) {
    const rawBody = Buffer.from(JSON.stringify(body));
    const signature = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    return {
      rawBody,
      headers: { 'x-hub-signature-256': `sha256=${signature}` },
    } as any;
  }

  it('verifies the signature, processes every entry, and records message idempotency', async () => {
    const body = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ id: 'wamid.out', status: 'delivered' }],
                messages: [
                  {
                    id: 'wamid.in',
                    from: '628123456789',
                    type: 'text',
                    text: { body: 'saldo' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const controller = new WhatsappController(
      config as any,
      whatsappService as any,
      notifier as any,
      eventRepo as any,
    );

    await expect(
      controller.handleWebhook(signedRequest(body), body),
    ).resolves.toEqual({ status: 'ok' });

    expect(notifier.updateDeliveryStatus).toHaveBeenCalledWith({
      id: 'wamid.out',
      status: 'delivered',
    });
    expect(whatsappService.handleTextMessage).toHaveBeenCalledWith(
      '628123456789',
      'saldo',
    );
    expect(eventRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ eventKey: 'message:wamid.in' }),
    );
    expect(eventRepo.update).toHaveBeenCalledWith('message:wamid.in', {
      status: 'processed',
      lastError: null,
    });
  });

  it('rejects webhook bodies with an invalid signature', async () => {
    const body = { entry: [] };
    const request = {
      rawBody: Buffer.from(JSON.stringify(body)),
      headers: { 'x-hub-signature-256': 'sha256=00' },
    } as any;
    const controller = new WhatsappController(
      config as any,
      whatsappService as any,
      notifier as any,
      eventRepo as any,
    );

    await expect(
      controller.handleWebhook(request, body),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not process a retried message twice', async () => {
    eventRepo.insert.mockRejectedValueOnce({ code: '23505' });
    const body = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid.duplicate',
                    from: '6281',
                    type: 'text',
                    text: { body: 'kopi 15rb' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const controller = new WhatsappController(
      config as any,
      whatsappService as any,
      notifier as any,
      eventRepo as any,
    );

    await controller.handleWebhook(signedRequest(body), body);

    expect(whatsappService.handleTextMessage).not.toHaveBeenCalled();
  });
});
