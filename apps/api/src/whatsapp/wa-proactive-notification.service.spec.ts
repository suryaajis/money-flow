/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { WaProactiveNotificationService } from './wa-proactive-notification.service';

describe('WaProactiveNotificationService', () => {
  const notifier = { sendTemplate: jest.fn() };
  const repository = {
    create: jest.fn((value: any) => ({ id: 'delivery-1', ...value })),
    save: jest.fn(async (value: any) => value),
    update: jest.fn(async () => ({ affected: 1 })),
  };
  const phoneLinkRepository = {
    findOne: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    notifier.sendTemplate.mockResolvedValue({
      messageId: 'wamid.1',
      accepted: true,
      devMode: false,
    });
    phoneLinkRepository.findOne.mockResolvedValue({ id: 'phone-link-1' });
  });

  it('sends a template and records the Jakarta delivery date', async () => {
    const service = new WaProactiveNotificationService(
      repository as any,
      phoneLinkRepository as any,
      notifier as any,
    );

    const sent = await service.sendOncePerDay(
      {
        userId: 'user-1',
        to: '628123456789',
        kind: 'debt_due',
        templateName: 'moneyflow_debt_due',
        bodyParameters: ['detail'],
      },
      new Date('2026-08-28T18:00:00.000Z'),
    );

    expect(sent).toBe(true);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryDate: '2026-08-29' }),
    );
    expect(notifier.sendTemplate).toHaveBeenCalledWith(
      '628123456789',
      'moneyflow_debt_due',
      ['detail'],
    );
  });

  it('skips another proactive notification after the daily unique constraint is claimed', async () => {
    repository.save.mockRejectedValueOnce({ code: '23505' });
    const service = new WaProactiveNotificationService(
      repository as any,
      phoneLinkRepository as any,
      notifier as any,
    );

    const sent = await service.sendOncePerDay({
      userId: 'user-1',
      to: '628123456789',
      kind: 'over_budget',
      templateName: 'moneyflow_budget_alert',
      bodyParameters: ['detail'],
    });

    expect(sent).toBe(false);
    expect(notifier.sendTemplate).not.toHaveBeenCalled();
  });

  it('does not send to a revoked phone link', async () => {
    phoneLinkRepository.findOne.mockResolvedValueOnce(null);
    const service = new WaProactiveNotificationService(
      repository as any,
      phoneLinkRepository as any,
      notifier as any,
    );

    const sent = await service.sendOncePerDay({
      userId: 'user-1',
      to: '628123456789',
      waPhoneLinkId: 'revoked-link',
      kind: 'debt_due',
      templateName: 'moneyflow_debt_due',
      bodyParameters: ['detail'],
    });

    expect(sent).toBe(false);
    expect(repository.save).not.toHaveBeenCalled();
    expect(notifier.sendTemplate).not.toHaveBeenCalled();
  });
});
