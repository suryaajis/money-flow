import {
  buildMetaTemplatePayload,
  WA_TEMPLATE_DEFINITIONS,
} from './wa-template-definitions';

describe('WhatsApp template definitions', () => {
  it('defines every proactive MoneyFlow template as positional Utility content', () => {
    const payloads = WA_TEMPLATE_DEFINITIONS.map(buildMetaTemplatePayload);

    expect(payloads.map((payload) => payload.name)).toEqual([
      'moneyflow_monthly_recap',
      'moneyflow_budget_alert',
      'moneyflow_debt_due',
      'moneyflow_shared_wallet_activity',
    ]);
    for (const payload of payloads) {
      expect(payload.category).toBe('UTILITY');
      expect(payload.language).toBe('id');
      expect(payload.components[0].text).toContain('MoneyFlow');
    }
  });

  it('provides exactly one example for every positional variable', () => {
    for (const definition of WA_TEMPLATE_DEFINITIONS) {
      const variableNumbers = [
        ...definition.body.matchAll(/\{\{(\d+)\}\}/g),
      ].map((match) => Number(match[1]));
      expect(variableNumbers).toEqual(
        definition.examples.map((_, index) => index + 1),
      );
      expect(definition.body.trim()).not.toMatch(/\}\}$/);
    }
  });
});
