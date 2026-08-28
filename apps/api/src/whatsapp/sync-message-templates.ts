import 'dotenv/config';
import {
  buildMetaTemplatePayload,
  WA_TEMPLATE_DEFINITIONS,
} from './wa-template-definitions';

type Command = 'dry-run' | 'verify' | 'apply';

interface ExistingTemplate {
  id?: string;
  name?: string;
  language?: string;
  status?: string;
  category?: string;
  components?: Array<{ type?: string; text?: string }>;
}

function parseCommand(args: string[]): Command {
  if (args.length === 0 || args[0] === '--dry-run') return 'dry-run';
  if (args.length === 1 && args[0] === '--verify') return 'verify';
  if (args.length === 1 && args[0] === '--apply') return 'apply';
  throw new Error(
    'Usage: npm run whatsapp:templates:sync -- [--dry-run|--verify|--apply]',
  );
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} wajib diisi untuk mengakses Meta`);
  return value;
}

function graphVersion(): string {
  const value = process.env.WA_GRAPH_API_VERSION?.trim() || 'v25.0';
  if (!/^v\d+\.\d+$/.test(value))
    throw new Error(`WA_GRAPH_API_VERSION tidak valid: ${value}`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function metaRequest(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      signal: controller.signal,
    });
    const raw = await response.text();
    let body: unknown = {};
    try {
      body = raw ? (JSON.parse(raw) as unknown) : {};
    } catch {
      body = {};
    }
    if (!response.ok) {
      const root = isRecord(body) ? body : {};
      const error = isRecord(root.error) ? root.error : {};
      const message =
        typeof error.message === 'string'
          ? error.message
          : raw || 'Unknown Meta error';
      const code = typeof error.code === 'number' ? ` (#${error.code})` : '';
      throw new Error(
        `Meta Graph API ${response.status}${code}: ${message.slice(0, 1000)}`,
      );
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function extractExistingTemplates(body: unknown): ExistingTemplate[] {
  if (!isRecord(body) || !Array.isArray(body.data)) return [];
  return body.data.filter(isRecord);
}

function existingBody(template: ExistingTemplate): string | undefined {
  return template.components?.find((component) => component.type === 'BODY')
    ?.text;
}

function extractNextPage(body: unknown): string | null {
  if (!isRecord(body) || !isRecord(body.paging)) return null;
  return typeof body.paging.next === 'string' ? body.paging.next : null;
}

async function fetchTemplates(
  baseUrl: string,
  token: string,
): Promise<ExistingTemplate[]> {
  const fields = 'id,name,language,status,category,components';
  let nextPage: string | null =
    `${baseUrl}/message_templates?fields=${encodeURIComponent(fields)}&limit=100`;
  const templates: ExistingTemplate[] = [];
  while (nextPage) {
    const body = await metaRequest(nextPage, token);
    templates.push(...extractExistingTemplates(body));
    nextPage = extractNextPage(body);
  }
  return templates;
}

async function run(command: Command): Promise<void> {
  const payloads = WA_TEMPLATE_DEFINITIONS.map(buildMetaTemplatePayload);
  if (command === 'dry-run') {
    console.log(JSON.stringify(payloads, null, 2));
    console.log(
      '\nDry run only. Use --verify to inspect Meta or --apply to create missing templates.',
    );
    return;
  }

  const token = requiredEnv('WA_ACCESS_TOKEN');
  const wabaId = requiredEnv('WA_WABA_ID');
  const baseUrl = `https://graph.facebook.com/${graphVersion()}/${wabaId}`;
  const existing = await fetchTemplates(baseUrl, token);
  let hasProblem = false;

  for (const payload of payloads) {
    const current = existing.find(
      (template) =>
        template.name === payload.name &&
        template.language === payload.language,
    );
    if (current) {
      const bodyMatches = existingBody(current) === payload.components[0].text;
      console.log(
        `${payload.name}: ${current.status ?? 'UNKNOWN'}${bodyMatches ? '' : ' (BODY DRIFT)'}`,
      );
      if (!bodyMatches || current.status === 'REJECTED') hasProblem = true;
      continue;
    }

    if (command === 'verify') {
      console.log(`${payload.name}: MISSING`);
      hasProblem = true;
      continue;
    }

    const created = await metaRequest(`${baseUrl}/message_templates`, token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const result = isRecord(created) ? created : {};
    const creationStatus =
      typeof result.status === 'string' ? result.status : 'PENDING';
    console.log(`${payload.name}: CREATED (${creationStatus})`);
  }

  if (hasProblem) process.exitCode = 1;
}

const command = parseCommand(process.argv.slice(2));
void run(command).catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Template sync failed',
  );
  process.exitCode = 1;
});
