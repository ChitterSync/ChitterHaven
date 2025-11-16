export type CHFetch = 'S' | 'H' | 'M' | 'DM' | '#';
export type CHOption = 'Name' | 'PFP' | 'Link' | 'Card';

export interface CHToken {
  type: 'token';
  service: 'CH';
  fetch: CHFetch;
  id?: string | null;
  option?: CHOption;
  channel?: { havenId: string; channelId: string };
  range: { start: number; end: number };
}

export type CHResolveKind = 'text' | 'url' | 'card' | 'error';

interface CHBase { kind: CHResolveKind; source: CHToken; }

export interface CHText extends CHBase { kind: 'text'; text: string; }
export interface CHUrl extends CHBase { kind: 'url'; url: string; mediaType?: 'image' | 'page'; }
export interface CHCard extends CHBase {
  kind: 'card';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  linkUrl?: string;
  meta?: Record<string, string>;
}
export interface CHError extends CHBase {
  kind: 'error';
  code: 'NotFound' | 'InvalidFetch' | 'UnsupportedOption' | 'Network';
  message: string;
}

export type CHResolve = CHText | CHUrl | CHCard | CHError;

export interface CHResolver {
  resolve(token: CHToken): Promise<CHResolve>;
}

const RE_CH_CHANNEL = /\{CH:#:([A-Za-z0-9_\-:.]+):([A-Za-z0-9_\-:.]+)(?:;(Name|PFP|Link|Card))?\}/g;
const RE_CH_GENERAL = /\{CH:(S|H|M|DM):([A-Za-z0-9_\-:.]+)(?:;(Name|PFP|Link|Card))?\}/g;

export type ParsedNode =
  | { type: 'text'; text: string }
  | CHToken;

export function parseCHInline(text: string, base = 0): ParsedNode[] {
  const nodes: ParsedNode[] = [];
  let cursor = 0;

  const pushText = (to: number) => {
    if (to > cursor) nodes.push({ type: 'text', text: text.slice(cursor, to) });
  };

  // Pass 1: channel tokens
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

  // Pass 2: S/H/M/DM tokens on the remaining text
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

// Simple client-side resolver using existing HTTP APIs.
// This is intentionally minimal; callers can layer richer UI on top.
export async function resolveCH(token: CHToken): Promise<CHResolve> {
  const opt: CHOption = token.option ?? 'Name';
  try {
    if (token.fetch === '#') {
      const { havenId, channelId } = token.channel!;
      const res = await fetch(`/api/channels-api?haven=${encodeURIComponent(havenId)}`);
      const data = await res.json().catch(() => null);
      const channels = Array.isArray(data?.channels)
        ? (data.channels as Array<{ id?: string; name?: string; iconUrl?: string; url?: string }>)
        : [];
      const ch = channels.find(c => c.id === channelId || c.name === channelId) || null;
      if (!ch) return { kind: 'text', source: token, text: '[Unknown channel]' };
      if (opt === 'PFP') {
        return { kind: 'url', source: token, url: ch.iconUrl || '', mediaType: 'image' };
      }
      if (opt === 'Link') {
        return { kind: 'url', source: token, url: ch.url || '', mediaType: 'page' };
      }
      if (opt === 'Card') {
        return {
          kind: 'card',
          source: token,
          title: ch.name || '[Unknown channel]',
          subtitle: havenId,
          imageUrl: ch.iconUrl || undefined,
          linkUrl: ch.url || undefined,
          meta: { channelId, havenId }
        };
      }
      return { kind: 'text', source: token, text: ch.name || '[Unknown channel]' };
    }

    if (token.fetch === 'S' || token.fetch === 'H') {
      const havenId = token.id || '';
      const res = await fetch(`/api/server-settings?haven=${encodeURIComponent(havenId)}`);
      const data = await res.json().catch(() => null);
      if (!data) return { kind: 'text', source: token, text: '[Unknown haven]' };
      const name = data.name || havenId || '[Unknown haven]';
      if (opt === 'PFP') {
        return { kind: 'url', source: token, url: data.icon || '', mediaType: 'image' };
      }
      if (opt === 'Link') {
        return { kind: 'url', source: token, url: data.url || '', mediaType: 'page' };
      }
      if (opt === 'Card') {
        return {
          kind: 'card',
          source: token,
          title: name,
          subtitle: data.description || undefined,
          imageUrl: data.icon || undefined,
          linkUrl: data.url || undefined,
          meta: { havenId }
        };
      }
      return { kind: 'text', source: token, text: name };
    }

    if (token.fetch === 'M') {
      const id = token.id || '';
      const res = await fetch(`/api/history?messageId=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => null);
      const msg = data?.message;
      if (!msg) return { kind: 'text', source: token, text: '[Unknown message]' };
      if (opt === 'Link') {
        return { kind: 'url', source: token, url: msg.url || '', mediaType: 'page' };
      }
      if (opt === 'Card') {
        return {
          kind: 'card',
          source: token,
          title: msg.authorName || msg.user || '[Unknown]',
          subtitle: msg.preview || msg.text?.slice(0, 80) || undefined,
          linkUrl: msg.url || undefined,
          meta: { messageId: id }
        };
      }
      return { kind: 'text', source: token, text: msg.preview || msg.text?.slice(0, 80) || '[Message]' };
    }

    if (token.fetch === 'DM') {
      const id = token.id || '';
      const res = await fetch('/api/dms');
      const data = await res.json().catch(() => null);
      const dms = Array.isArray(data?.dms)
        ? (data.dms as Array<{ id?: string; title?: string; users?: string[]; iconUrl?: string; url?: string }>)
        : [];
      const dm = dms.find(d => d.id === id) || null;
      if (!dm) return { kind: 'text', source: token, text: '[Unknown DM]' };
      const title = dm.title || (dm.users ? dm.users.join(', ') : '[Direct Message]');
      if (opt === 'PFP') {
        return { kind: 'url', source: token, url: dm.iconUrl || '', mediaType: 'image' };
      }
      if (opt === 'Link') {
        return { kind: 'url', source: token, url: dm.url || '', mediaType: 'page' };
      }
      if (opt === 'Card') {
        return {
          kind: 'card',
          source: token,
          title,
          subtitle: dm.users?.join(', ') || undefined,
          imageUrl: dm.iconUrl || undefined,
          linkUrl: dm.url || undefined,
          meta: { dmId: id }
        };
      }
      return { kind: 'text', source: token, text: title };
    }

    return { kind: 'error', source: token, code: 'InvalidFetch', message: `Unsupported fetch: ${token.fetch}` };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { kind: 'error', source: token, code: 'Network', message };
  }
}
