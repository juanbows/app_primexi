"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabaseClient";

type UseAuthUserOptions = {
  required?: boolean;
  redirectTo?: string;
};

export function useAuthUser(options: UseAuthUserOptions = {}) {
  const { required = false, redirectTo = "/login" } = options;
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setUser(authUser ?? null);
      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!required) return;
    if (loading) return;
    if (user) return;

    router.replace(redirectTo);
  }, [loading, redirectTo, required, router, user]);

  return { user, loading };
}
