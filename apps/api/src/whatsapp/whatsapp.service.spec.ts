/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await */
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { WhatsappService } from './whatsapp.service';

describe('WhatsappService multi-number linking', () => {
  const userRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const phoneLinkRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    count: jest.fn(),
    create: jest.fn((value: any) => ({ id: 'phone-link-1', ...value })),
    save: jest.fn(async (value: any) => value),
    update: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const sessionRepo = {
    findOne: jest.fn(),
    create: jest.fn((value: any) => ({ id: 'session-1', ...value })),
    save: jest.fn(async (value: any) => value),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const challengeRepo = {
    delete: jest.fn(),
    create: jest.fn((value: any) => ({ id: 'challenge-1', ...value })),
    save: jest.fn(async (value: any) => value),
    findOne: jest.fn(),
    update: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const notifier = {
    sendText: jest.fn(),
    sendTextWithButtons: jest.fn(),
  };
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
      sessionRepo as any,
      userRepo as any,
      phoneLinkRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      challengeRepo as any,
      {} as any,
      notifier as any,
      {} as any,
      {} as any,
      {} as any,
      config as any,
      {} as any,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    phoneLinkRepo.count.mockResolvedValue(0);
    phoneLinkRepo.find.mockResolvedValue([]);
    phoneLinkRepo.findOne.mockResolvedValue(null);
  });

  it('stores only a hash and returns a labelled ownership challenge', async () => {
    const result = await service().createLinkChallenge('user-1', 'Kerja');
    const url = new URL(result.linkUrl);
    const message = url.searchParams.get('text') ?? '';
    const token = message.replace('HUBUNGKAN ', '');
    const expectedHash = createHash('sha256').update(token).digest('hex');

    expect(url.hostname).toBe('wa.me');
    expect(url.pathname).toBe('/628111111111');
    expect(result.label).toBe('Kerja');
    expect(challengeRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        tokenHash: expectedHash,
        consumedAt: null,
        label: 'Kerja',
      }),
    );
    expect(JSON.stringify(challengeRepo.create.mock.calls[0][0])).not.toContain(
      token,
    );
  });

  it('rejects a fourth active number before creating a challenge', async () => {
    phoneLinkRepo.count.mockResolvedValue(3);

    await expect(
      service().createLinkChallenge('user-1', 'Nomor 4'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(challengeRepo.save).not.toHaveBeenCalled();
  });

  it('creates the first phone link as primary and consumes the challenge', async () => {
    const token = 'abcdefghijklmnopqrstuvwxyz123456';
    const challenge = {
      id: 'challenge-1',
      userId: 'user-1',
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      label: 'Pribadi',
    };
    challengeRepo.findOne.mockResolvedValue(challenge);
    phoneLinkRepo.findOne.mockResolvedValue(null);
    challengeRepo.manager.transaction.mockImplementation(
      async (callback: any) => {
        const transactionalChallengeRepo = {
          createQueryBuilder: jest.fn(() => ({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(challenge),
          })),
          update: jest.fn(),
        };
        const transactionalUserRepo = {
          createQueryBuilder: jest.fn(() => ({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOneOrFail: jest.fn().mockResolvedValue({ id: 'user-1' }),
          })),
          update: jest.fn(),
        };
        const transactionalPhoneLinkRepo = {
          findOne: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn((value: any) => ({ id: 'phone-link-1', ...value })),
          save: jest.fn(async (value: any) => value),
        };
        await callback({
          getRepository: (entity: any) => {
            if (entity.name === 'WaLinkChallenge')
              return transactionalChallengeRepo;
            if (entity.name === 'WaPhoneLink')
              return transactionalPhoneLinkRepo;
            return transactionalUserRepo;
          },
        });
        expect(transactionalPhoneLinkRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-1',
            phone: '628222222222',
            isPrimary: true,
            notificationsEnabled: true,
          }),
        );
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

  it('routes a command reply back to the secondary number', async () => {
    const user = { id: 'user-1', name: 'Surya' };
    phoneLinkRepo.findOne.mockResolvedValue({
      id: 'phone-link-2',
      phone: '628333333333',
      userId: 'user-1',
      user,
    });
    sessionRepo.findOne.mockResolvedValue({
      id: 'session-2',
      waPhone: '628333333333',
      state: 'idle',
      context: null,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await service().handleTextMessage('628333333333', 'bantuan');

    expect(notifier.sendText).toHaveBeenCalledWith(
      '628333333333',
      expect.stringContaining('Panduan Money Flow Bot'),
    );
  });

  it('requires password re-authentication before unlinking a number', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'user-1',
      password: await bcrypt.hash('correct-password', 4),
    });

    await expect(
      service().unlinkPhone('user-1', 'wrong-password', 'phone-link-1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(phoneLinkRepo.manager.transaction).not.toHaveBeenCalled();
  });

  it('requires moving primary before unlinking it when another number exists', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 'user-1',
      password: await bcrypt.hash('correct-password', 4),
    });
    const transactionalPhoneLinkRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'phone-link-1',
        userId: 'user-1',
        phone: '628111111111',
        isPrimary: true,
      }),
      count: jest.fn().mockResolvedValue(2),
      update: jest.fn(),
    };
    phoneLinkRepo.manager.transaction.mockImplementationOnce(
      async (callback: any) =>
        callback({
          getRepository: (entity: any) =>
            entity.name === 'WaPhoneLink'
              ? transactionalPhoneLinkRepo
              : {
                  createQueryBuilder: jest.fn(() => ({
                    setLock: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    getOneOrFail: jest.fn().mockResolvedValue({ id: 'user-1' }),
                  })),
                },
        }),
    );

    await expect(
      service().unlinkPhone('user-1', 'correct-password', 'phone-link-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transactionalPhoneLinkRepo.update).not.toHaveBeenCalled();
  });
});
