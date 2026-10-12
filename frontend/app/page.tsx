"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AuthScreen } from "@/components/auth-screen";
import { AppShell } from "@/components/app-shell";
import { ToastProvider, Spinner } from "@/components/ui";

export default function Home() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase().auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase().auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === undefined)
    return <div className="flex min-h-[100dvh] items-center justify-center text-fg-3"><Spinner className="h-5 w-5" /></div>;
  return <ToastProvider>{session ? <AppShell email={session.user.email || ""} /> : <AuthScreen />}</ToastProvider>;
}
