import {
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { AuthContext } from "./AuthStateContext";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Could not load user profile:", error);
      setProfile(null);
      return null;
    }

    setProfile(data);
    return data;
  }

  useEffect(() => {
    let mounted = true;

    async function loadInitialSession() {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (error) {
        console.error("Could not load Supabase session:", error);
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await loadProfile(currentSession.user.id);
      } else {
        setProfile(null);
      }

      if (mounted) {
        setAuthLoading(false);
      }
    }

    loadInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!mounted) {
          return;
        }

        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (nextSession?.user) {
          await loadProfile(nextSession.user.id);
        } else {
          setProfile(null);
        }

        if (mounted) {
          setAuthLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signUp({ fullName, email, password }) {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
  }

  async function signIn({ email, password }) {
    return supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (!error) {
      setSession(null);
      setUser(null);
      setProfile(null);
    }

    return { error };
  }

  const refreshProfile = async () => {
  if (!user?.id) {
    return null;
  }

  return loadProfile(user.id);
};

  const value = {
  session,
  user,
  profile,
  authLoading,
  signUp,
  signIn,
  signOut,
  refreshProfile,
};

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
