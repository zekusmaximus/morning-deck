import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = "/login" } =
    options ?? {};
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const logout = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      throw signOutError;
    }
  }, []);

  const state = useMemo(() => {
    return {
      user: session?.user ?? null,
      session,
      loading,
      error,
      isAuthenticated: Boolean(session?.user),
    };
  }, [error, loading, session]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [loading, redirectOnUnauthenticated, redirectPath, state.user]);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setError(sessionError);
        }
        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch((sessionError) => {
        if (!active) return;
        setError(sessionError);
        setLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setLoading(false);
      }
    );

    return () => {
      active = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return {
    ...state,
    logout,
  };
}
