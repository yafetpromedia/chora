import { resolveTxt } from 'dns/promises';

export type MailAuthLookup = {
  domain: string;
  spf: string | null;
  dmarc: string | null;
  dkimSelectors: string[];
  error?: string;
};

async function readTxt(name: string): Promise<string[]> {
  try {
    const rows = await resolveTxt(name);
    return rows.map((parts) => parts.join(''));
  } catch {
    return [];
  }
}

export async function lookupMailAuthentication(
  domain = 'awuddigitals.com',
): Promise<MailAuthLookup> {
  try {
    const [apex, dmarc] = await Promise.all([
      readTxt(domain),
      readTxt(`_dmarc.${domain}`),
    ]);
    const selectors = [
      'default',
      'selector',
      'alet',
      'mail',
      'dkim',
      's1',
      's2',
      'mx1',
      'k1',
    ];
    const found: string[] = [];
    for (const selector of selectors) {
      const records = await readTxt(`${selector}._domainkey.${domain}`);
      if (records.some((record) => /v=DKIM1|p=/i.test(record))) {
        found.push(selector);
      }
    }
    return {
      domain,
      spf: apex.find((record) => /v=spf1/i.test(record)) ?? null,
      dmarc: dmarc.find((record) => /v=DMARC1/i.test(record)) ?? null,
      dkimSelectors: found,
    };
  } catch (error) {
    return {
      domain,
      spf: null,
      dmarc: null,
      dkimSelectors: [],
      error: error instanceof Error ? error.message : 'DNS lookup failed',
    };
  }
}
