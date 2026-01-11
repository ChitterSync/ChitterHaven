"use client";

import { useCallback, useEffect, useState } from "react";

export type AuthUser = {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  email?: string | null;
  roles?: string[] | null;
};

type AuthResponse = {
  authenticated: boolean;
  user: AuthUser | null;
};

let cachedAuth: AuthResponse | null = null;

const fetchAuth = async (): Promise<AuthResponse> => {
  const res = await fetch("/api/auth/me");
  if (!res.ok) {
    return { authenticated: false, user: null };
  }
  const data = (await res.json()) as AuthResponse;
  return {
    authenticated: !!data?.authenticated,
    user: data?.user || null,
  };
};

export const useAuth = () => {
  const [auth, setAuth] = useState<AuthResponse | null>(cachedAuth);
  const [loading, setLoading] = useState(!cachedAuth);

  const refresh = useCallback(async () => {
    setLoading(true);
    const next = await fetchAuth().catch(() => ({ authenticated: false, user: null }));
    cachedAuth = next;
    setAuth(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!cachedAuth) {
      refresh();
    }
  }, [refresh]);

  return {
    authenticated: auth?.authenticated ?? false,
    user: auth?.user ?? null,
    loading,
    refresh,
  };
};
