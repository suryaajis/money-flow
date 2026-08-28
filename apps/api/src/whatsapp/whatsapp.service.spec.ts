/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { createHash } from 'crypto';
import { WhatsappService } from './whatsapp.service';

describe('WhatsappService linking', () => {
  const userRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const challengeRepo = {
    delete: jest.fn(),
    create: jest.fn((value: any) => ({ id: 'challenge-1', ...value })),
    save: jest.fn(async (value: any) => value),
    findOne: jest.fn(),
    update: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const notifier = { sendText: jest.fn() };
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      const values: Record<string, string> = {
        WA_ACCESS_TOKEN: 'test-token',
        WA_PHONE_NUMBER_ID: 'test-phone-id',
        WA_BUSINESS_PHONE_NUMBER: '628111111111',
        WA_LINK_TOKEN_TTL_MINUTES: '10',
      };
      return values[key] ?? fallback;
    }),
  };

  function service() {
    return new WhatsappService(
      {} as any,
      userRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      challengeRepo as any,
      notifier as any,
      {} as any,
      {} as any,
      {} as any,
      config as any,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores only a hash and returns a short-lived wa.me ownership challenge', async () => {
    const result = await service().createLinkChallenge('user-1');
    const url = new URL(result.linkUrl);
    const message = url.searchParams.get('text') ?? '';
    const token = message.replace('HUBUNGKAN ', '');
    const expectedHash = createHash('sha256').update(token).digest('hex');

    expect(url.hostname).toBe('wa.me');
    expect(url.pathname).toBe('/628111111111');
    expect(token.length).toBeGreaterThanOrEqual(20);
    expect(challengeRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        tokenHash: expectedHash,
        consumedAt: null,
      }),
    );
    expect(JSON.stringify(challengeRepo.create.mock.calls[0][0])).not.toContain(
      token,
    );
  });

  it('links the account to the phone number supplied by Meta and consumes the challenge', async () => {
    const token = 'abcdefghijklmnopqrstuvwxyz123456';
    const challenge = {
      id: 'challenge-1',
      userId: 'user-1',
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    };
    challengeRepo.findOne.mockResolvedValue(challenge);
    userRepo.findOne.mockResolvedValue(null);
    challengeRepo.manager.transaction.mockImplementation(
      async (callback: any) => {
        const transactionalChallengeRepo = {
          findOne: jest.fn().mockResolvedValue(challenge),
          update: jest.fn(),
        };
        const transactionalUserRepo = { update: jest.fn() };
        await callback({
          getRepository: (entity: any) =>
            entity.name === 'WaLinkChallenge'
              ? transactionalChallengeRepo
              : transactionalUserRepo,
        });
        expect(transactionalUserRepo.update).toHaveBeenCalledWith(
          'user-1',
          expect.objectContaining({ waPhone: '628222222222' }),
        );
        expect(transactionalChallengeRepo.update).toHaveBeenCalledWith(
          'challenge-1',
          expect.objectContaining({ consumedAt: expect.any(Date) }),
        );
      },
    );

    await service().handleTextMessage('628222222222', `HUBUNGKAN ${token}`);

    expect(notifier.sendText).toHaveBeenCalledWith(
      '628222222222',
      expect.stringContaining('berhasil dihubungkan'),
    );
  });
});
