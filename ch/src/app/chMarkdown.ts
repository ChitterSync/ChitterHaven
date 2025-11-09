// ChitterHaven Markdown Extension — parser + resolver contract
// Produces lightweight AST nodes for inline CH tokens and a pluggable resolver.

export type CHFetch = 'S' | 'H' | 'M' | 'DM' | '#';
export type CHOption = 'Name' | 'PFP' | 'Link' | 'Card';

export interface CHToken {
  type: 'token';
  service: 'CH';
  fetch: CHFetch;
  id?: string | null;
  option?: CHOption; // default 'Name'
  channel?: { havenId: string; channelId: string }; // for '#'
  range: { start: number; end: number };
}

export type CHResolveKind = 'text' | 'url' | 'card' | 'error';

interface CHBase { kind: CHResolveKind; source: CHToken }
export interface CHText extends CHBase { kind: 'text'; text: string }
export interface CHUrl extends CHBase { kind: 'url'; url: string; mediaType?: 'image'|'page' }
export interface CHCard extends CHBase {
  kind: 'card';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  linkUrl?: string;
  meta?: Record<string,string>;
}
export interface CHError extends CHBase { kind: 'error'; code: 'NotFound'|'InvalidFetch'|'UnsupportedOption'|'Network'; message: string }
export type CHResolve = CHText | CHUrl | CHCard | CHError;

export interface CHResolver {
  resolve(token: CHToken): Promise<CHResolve>;
}

export const RE_CH_CHANNEL = /\{CH:#:([A-Za-z0-9_\-:.]+):([A-Za-z0-9_\-:.]+)(?:;(Name|PFP|Link|Card))?\}/g;
export const RE_CH_GENERAL = /\{CH:(S|H|M|DM):([A-Za-z0-9_\-:.]+)(?:;(Name|PFP|Link|Card))?\}/g;

type InlineNode = { type: 'text'; text: string } | CHToken;

// Parses inline CH tokens, returning a sequence of text and token nodes.
export function parseCHInline(text: string, base = 0): InlineNode[] {
  const nodes: InlineNode[] = [];
  let cursor = 0;
  const pushText = (to: number) => {
    if (to > cursor) nodes.push({ type: 'text', text: text.slice(cursor, to) });
  };

  // Pass 1: channel 4‑segment tokens
  text.replace(RE_CH_CHANNEL, (m, havenId, channelId, opt, idx) => {
    const i = Number(idx);
    pushText(i);
    nodes.push({
      type: 'token',
      service: 'CH',
      fetch: '#',
      id: null,
      option: (opt as CHOption) ?? 'Name',
      channel: { havenId, channelId },
      range: { start: base + i, end: base + i + m.length }
    });
    cursor = i + m.length;
    return m;
  });

  // Pass 2: general tokens
  const rest = text.slice(cursor);
  rest.replace(RE_CH_GENERAL, (m, fetch, id, opt, idx) => {
    const i = cursor + Number(idx);
    pushText(i);
    nodes.push({
      type: 'token',
      service: 'CH',
      fetch: fetch as CHFetch,
      id,
      option: (opt as CHOption) ?? 'Name',
      range: { start: base + i, end: base + i + m.length }
    });
    cursor = i + m.length;
    return m;
  });

  pushText(text.length);
  return nodes;
}

// Minimal API abstraction; provide your own backed by your DB/routes.
export interface CHApi {
  getHaven?(id: string): Promise<{
    id: string; name?: string; iconUrl?: string; url?: string; memberCount?: number;
  } | null>;
  getChannel?(havenId: string, channelId: string): Promise<{
    id: string; name?: string; iconUrl?: string; url?: string; havenName?: string;
  } | null>;
  getMessage?(id: string): Promise<{
    id: string; url?: string; authorName?: string; preview?: string;
  } | null>;
  getDM?(id: string): Promise<{
    id: string; title?: string; participants?: string[]; iconUrl?: string; url?: string;
  } | null>;
}

export function createCHResolver(api: CHApi = {}): CHResolver {
  const ensureHttps = (url?: string) => {
    if (!url) return '';
    try {
      const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://example.com');
      if (u.protocol !== 'https:') u.protocol = 'https:';
      return u.toString();
    } catch { return ''; }
  };

  const cap = (s?: string, n = 256) => (s || '').slice(0, n);
  const safeText = (s?: string) => cap(s, 256);

  return {
    async resolve(token: CHToken): Promise<CHResolve> {
      const opt = token.option ?? 'Name';
      try {
        switch (token.fetch) {
          case '#': {
            const ch = token.channel ? await (api.getChannel?.(token.channel.havenId, token.channel.channelId) ?? null) : null;
            if (!ch) return { kind: 'text', source: token, text: '[Unknown]' };
            if (opt === 'PFP')  return { kind: 'url', source: token, url: ensureHttps(ch.iconUrl), mediaType: 'image' };
            if (opt === 'Link') return { kind: 'url', source: token, url: ensureHttps(ch.url), mediaType: 'page' };
            if (opt === 'Card') return {
              kind: 'card', source: token,
              title: safeText(ch.name ?? '[Unknown]'),
              subtitle: safeText(ch.havenName),
              imageUrl: ensureHttps(ch.iconUrl),
              linkUrl: ensureHttps(ch.url),
              meta: { channelId: token.channel!.channelId, havenId: token.channel!.havenId }
            };
            return { kind: 'text', source: token, text: safeText(ch.name ?? '[Unknown]') };
          }
          case 'S':
          case 'H': {
            const hv = token.id ? await (api.getHaven?.(token.id) ?? null) : null;
            if (!hv) return { kind: 'text', source: token, text: '[Unknown]' };
            if (opt === 'PFP')  return { kind: 'url', source: token, url: ensureHttps(hv.iconUrl), mediaType: 'image' };
            if (opt === 'Link') return { kind: 'url', source: token, url: ensureHttps(hv.url), mediaType: 'page' };
            if (opt === 'Card') return {
              kind: 'card', source: token,
              title: safeText(hv.name ?? '[Unknown]'),
              subtitle: hv.memberCount ? `${hv.memberCount} members` : undefined,
              imageUrl: ensureHttps(hv.iconUrl),
              linkUrl: ensureHttps(hv.url),
              meta: { havenId: token.id! }
            };
            return { kind: 'text', source: token, text: safeText(hv.name ?? '[Unknown]') };
          }
          case 'M': {
            const msg = token.id ? await (api.getMessage?.(token.id) ?? null) : null;
            if (!msg) return { kind: 'text', source: token, text: '[Unknown]' };
            if (opt === 'Link') return { kind: 'url', source: token, url: ensureHttps(msg.url), mediaType: 'page' };
            if (opt === 'Card') return {
              kind: 'card', source: token,
              title: safeText(msg.authorName ?? '[Unknown]'),
              subtitle: safeText(msg.preview),
              linkUrl: ensureHttps(msg.url),
              meta: { messageId: token.id! }
            };
            return { kind: 'text', source: token, text: safeText(msg.preview ?? '[Message]') };
          }
          case 'DM': {
            const dm = token.id ? await (api.getDM?.(token.id) ?? null) : null;
            if (!dm) return { kind: 'text', source: token, text: '[Unknown]' };
            if (opt === 'PFP')  return { kind: 'url', source: token, url: ensureHttps(dm.iconUrl), mediaType: 'image' };
            if (opt === 'Link') return { kind: 'url', source: token, url: ensureHttps(dm.url), mediaType: 'page' };
            if (opt === 'Card') return {
              kind: 'card', source: token,
              title: safeText(dm.title ?? '[Direct Message]'),
              subtitle: Array.isArray(dm.participants) ? dm.participants.join(', ') : undefined,
              imageUrl: ensureHttps(dm.iconUrl),
              linkUrl: ensureHttps(dm.url),
              meta: { dmId: token.id! }
            };
            return { kind: 'text', source: token, text: safeText(dm.title ?? '[Direct Message]') };
          }
          default:
            return { kind: 'error', source: token, code: 'InvalidFetch', message: `Unsupported fetch: ${String(token.fetch)}` };
        }
      } catch (e: any) {
        return { kind: 'error', source: token, code: 'Network', message: String(e?.message ?? e) };
      }
    }
  }
}

// Utility: Given plain text, return a simplified AST with tokens resolved via provided resolver.
export async function resolveCHInline(text: string, resolver: CHResolver, base = 0): Promise<(InlineNode | CHResolve)[]> {
  const ast = parseCHInline(text, base);
  const out: (InlineNode | CHResolve)[] = [];
  for (const node of ast) {
    if ((node as any).type === 'token') {
      out.push(await resolver.resolve(node as CHToken));
    } else {
      out.push(node);
    }
  }
  return out;
}

