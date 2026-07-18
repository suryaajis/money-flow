import type { ValueTransformer } from 'typeorm';

/**
 * Postgres `numeric`/`decimal` is returned by the `pg` driver as a string, to
 * avoid the precision loss of an IEEE double. TypeORM passes that through
 * unchanged, so a column declared `amount: number` actually holds "12000.00"
 * at runtime — which silently breaks arithmetic (`0 + "12000.00"` concatenates)
 * and serialises to JSON as a string.
 *
 * Money in this app is IDR/USD-scale with 2 decimals, well inside the 2^53
 * range a double represents exactly, so converting to number is safe here.
 * Revisit if amounts ever exceed ~9 x 10^15.
 */
export const numericTransformer: ValueTransformer = {
  // Entity -> database. Postgres accepts a JS number for numeric columns.
  to: (value: number | null | undefined) => value,

  // Database -> entity.
  from: (value: string | null): number | null =>
    value === null ? null : Number(value),
};
