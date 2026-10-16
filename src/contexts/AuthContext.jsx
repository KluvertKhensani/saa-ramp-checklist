import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AuthContext } from "./AuthContextObject";

import { supabase } from "../lib/supabase";

const PROFILE_TIMEOUT_MS = 12000;

async function queryProfile(userId) {
  let timeoutId;

  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(
          new Error(
            "Profile verification timed out. The database service is taking too long to respond.",
          ),
        );
      }, PROFILE_TIMEOUT_MS);
    });

    const queryPromise = supabase
      .from("profiles")
      .select(["id", "full_name", "role"].join(","))
      .eq("id", userId)
      .maybeSingle();

    const result = await Promise.race([queryPromise, timeoutPromise]);

    if (result.error) {
      throw result.error;
    }

    if (!result.data) {
      throw new Error("No operational profile was found for this account.");
    }

    return result.data;
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);

  const [user, setUser] = useState(null);

  const [profile, setProfile] = useState(null);

  const [authLoading, setAuthLoading] = useState(true);

  const [profileError, setProfileError] = useState("");

  const loadedProfileUserIdRef = useRef(null);

  const profileRequestRef = useRef(null);

  const loadProfile = useCallback(
    async (userId, { force = false } = {}) => {
      if (!userId) {
        setProfile(null);
        loadedProfileUserIdRef.current = null;

        return {
          data: null,
          error: new Error("A user ID is required to load the profile."),
        };
      }

      if (!force && loadedProfileUserIdRef.current === userId && profile) {
        return {
          data: profile,
          error: null,
        };
      }

      if (!force && profileRequestRef.current?.userId === userId) {
        return profileRequestRef.current.promise;
      }

      const profilePromise = queryProfile(userId)
        .then((data) => {
          setProfile(data);
          setProfileError("");

          loadedProfileUserIdRef.current = userId;

          return {
            data,
            error: null,
          };
        })
        .catch((error) => {
          console.error("Could not load user profile:", error);

          setProfile(null);

          setProfileError(
            error?.message || "Your operational profile could not be verified.",
          );

          return {
            data: null,
            error,
          };
        })
        .finally(() => {
          if (profileRequestRef.current?.userId === userId) {
            profileRequestRef.current = null;
          }
        });

      profileRequestRef.current = {
        userId,
        promise: profilePromise,
      };

      return profilePromise;
    },
    [profile],
  );

  useEffect(() => {
    let mounted = true;

    async function initialiseAuthentication() {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (error) {
          throw error;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user?.id) {
          const result = await loadProfile(currentSession.user.id);

          if (!mounted || result.error) {
            return;
          }
        } else {
          setProfile(null);

          loadedProfileUserIdRef.current = null;
        }
      } catch (error) {
        console.error("Could not initialise authentication:", error);

        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);

          setProfileError(
            error?.message || "Authentication could not be initialised.",
          );
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    void initialiseAuthentication();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user?.id) {
        setProfile(null);
        setProfileError("");

        loadedProfileUserIdRef.current = null;

        profileRequestRef.current = null;

        setAuthLoading(false);

        return;
      }

      /*
       * signIn() loads the profile directly.
       * Do not duplicate that request here.
       */
      if (loadedProfileUserIdRef.current === nextSession.user.id) {
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);

      void loadProfile(nextSession.user.id).finally(() => {
        if (mounted) {
          setAuthLoading(false);
        }
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async ({ email, password }) => {
      setAuthLoading(true);
      setProfileError("");

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        if (!data.user) {
          throw new Error(
            "Authentication succeeded, but no user record was returned.",
          );
        }

        setSession(data.session);
        setUser(data.user);

        const profileResult =
          await loadProfile(data.user.id);

        if (profileResult.error) {
          throw profileResult.error;
        }

        return {
          data: {
            session: data.session,
            user: data.user,
            profile: profileResult.data,
          },
          error: null,
        };
      } catch (error) {
        console.error("Sign-in failed:", error);

        setProfileError(error?.message || "Sign-in could not be completed.");

        return {
          data: null,
          error,
        };
      } finally {
        setAuthLoading(false);
      }
    },
    [loadProfile],
  );

  const retryProfile = useCallback(async () => {
    if (!user?.id) {
      return {
        data: null,
        error: new Error("There is no signed-in user."),
      };
    }

    setAuthLoading(true);

    try {
      return await loadProfile(user.id, {
        force: true,
      });
    } finally {
      setAuthLoading(false);
    }
  }, [loadProfile, user?.id]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (!error) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setProfileError("");

      loadedProfileUserIdRef.current = null;

      profileRequestRef.current = null;
    }

    return {
      error,
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      session,
      user,
      profile,
      authLoading,
      profileError,
      signIn,
      signOut,
      loadProfile,
      retryProfile,
    }),
    [
      authLoading,
      loadProfile,
      profile,
      profileError,
      retryProfile,
      session,
      signIn,
      signOut,
      user,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
