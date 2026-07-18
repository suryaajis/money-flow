import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Query } from 'typeorm/driver/Query';
import { AppDataSource } from './data-source';

/**
 * Thin replacement for the `typeorm` CLI.
 *
 * TypeORM 1.0 ships a CommonJS CLI that `require()`s yargs 18, which is
 * ESM-only. Node 20 cannot require() an ES module, so `typeorm`,
 * `typeorm-ts-node-commonjs` and `typeorm-ts-node-esm` all crash with
 * ERR_REQUIRE_ESM before reaching any command. This drives the same
 * DataSource APIs the CLI would, so it works on Node 20 and on Node 22+.
 *
 * If the project later moves to Node >= 22.12 (which supports require(ESM)),
 * the upstream CLI becomes usable and this file can be dropped.
 */

const MIGRATIONS_DIR = join(__dirname, 'migrations');

function quote(sql: string): string {
  return `\`${sql.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\``;
}

function renderQueries(queries: Query[], indent = '        '): string {
  if (queries.length === 0) return '';
  return queries
    .map((q) => `${indent}await queryRunner.query(${quote(q.query)});`)
    .join('\n');
}

async function generate(name: string): Promise<void> {
  const sqlInMemory = await AppDataSource.driver.createSchemaBuilder().log();

  if (sqlInMemory.upQueries.length === 0) {
    console.log('No schema changes found. Migration not created.');
    return;
  }

  const timestamp = Date.now();
  const className = `${name}${timestamp}`;
  const filePath = join(MIGRATIONS_DIR, `${timestamp}-${name}.ts`);

  const content = `import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ${className} implements MigrationInterface {
    name = '${className}';

    public async up(queryRunner: QueryRunner): Promise<void> {
${renderQueries(sqlInMemory.upQueries)}
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
${renderQueries([...sqlInMemory.downQueries].reverse())}
    }
}
`;

  mkdirSync(MIGRATIONS_DIR, { recursive: true });
  writeFileSync(filePath, content, 'utf8');
  console.log(`Migration created: ${filePath}`);
  console.log(`  ${sqlInMemory.upQueries.length} up / ${sqlInMemory.downQueries.length} down queries`);
}

async function run(): Promise<void> {
  const applied = await AppDataSource.runMigrations({ transaction: 'all' });
  if (applied.length === 0) {
    console.log('No pending migrations.');
    return;
  }
  for (const m of applied) console.log(`Applied: ${m.name}`);
}

async function revert(): Promise<void> {
  await AppDataSource.undoLastMigration({ transaction: 'all' });
  console.log('Reverted the last migration.');
}

async function show(): Promise<void> {
  // Logs each migration and whether it has been applied.
  await AppDataSource.showMigrations();
}

const USAGE = `Usage:
  npm run migration:generate -- <Name>   e.g. -- AddCurrencyToTransaction
  npm run migration:run
  npm run migration:revert
  npm run migration:show`;

/**
 * Validate arguments before opening a connection, so a typo fails instantly
 * instead of after the driver has connected and logged its startup queries.
 */
function parseArgs(argv: string[]): { command: string; name: string } {
  const [command, name] = argv;

  if (!command) {
    throw new Error(`Missing command.\n\n${USAGE}`);
  }
  if (!['generate', 'run', 'revert', 'show'].includes(command)) {
    throw new Error(`Unknown command "${command}".\n\n${USAGE}`);
  }
  if (command === 'generate') {
    if (!name) {
      throw new Error(`migration:generate needs a name.\n\n${USAGE}`);
    }
    // The name becomes part of a TypeScript class name.
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) {
      throw new Error(
        `Invalid migration name "${name}".\n` +
          'Use PascalCase letters and digits only (no spaces, dashes or underscores), ' +
          'e.g. AddCurrencyToTransaction.',
      );
    }
  }

  return { command, name };
}

async function main(): Promise<void> {
  const { command, name } = parseArgs(process.argv.slice(2));

  await AppDataSource.initialize();
  try {
    switch (command) {
      case 'generate':
        await generate(name);
        break;
      case 'run':
        await run();
        break;
      case 'revert':
        await revert();
        break;
      case 'show':
        await show();
        break;
    }
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
