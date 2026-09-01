import { TemplateParserService } from './template-parser.service';
import type { Category } from '../categories/category.entity';

describe('TemplateParserService confidence', () => {
  const parser = new TemplateParserService();
  const categories = [
    { id: 'food', name: 'Makanan', type: 'expense' },
    { id: 'salary', name: 'Gaji', type: 'income' },
  ] as Category[];
  const now = new Date('2026-08-31T12:00:00.000Z');

  it('marks an explicit, categorized amount as high confidence', () => {
    const result = parser.parse('makan 15rb', categories, now);
    expect(result.transactions[0]).toEqual(
      expect.objectContaining({
        amount: 15_000,
        categoryId: 'food',
        confidence: 0.95,
        ambiguousFields: [],
      }),
    );
  });

  it('flags a small bare amount and missing category as ambiguous', () => {
    const result = parser.parse('barang 15', categories, now);
    expect(result.transactions[0].confidence).toBeLessThan(0.8);
    expect(result.transactions[0].ambiguousFields).toEqual(
      expect.arrayContaining(['amount', 'categoryId']),
    );
  });
});
