type Jwk = {
  kid?: string;
  kty?: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
  y?: string;
};

type JwksResponse = {
  keys: Jwk[];
};

type CachedJwks = {
  jwks: JwksResponse;
  fetchedAt: number;
};

const JWKS_TTL_MS = 10 * 60 * 1000;
let cache: CachedJwks | null = null;

export const getJwks = async (authBaseUrl: string): Promise<JwksResponse> => {
  if (cache && Date.now() - cache.fetchedAt < JWKS_TTL_MS) {
    return cache.jwks;
  }

  const res = await fetch(`${authBaseUrl}/.well-known/jwks.json`);
  if (!res.ok) {
    throw new Error("Failed to fetch JWKS.");
  }
  const jwks = (await res.json()) as JwksResponse;
  cache = { jwks, fetchedAt: Date.now() };
  return jwks;
};

export type { Jwk, JwksResponse };
