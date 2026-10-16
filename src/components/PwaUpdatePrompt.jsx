import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { supabase } from "../lib/supabase";
import { clearApplicationCaches } from "../utils/appCacheCleanup";

const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export default function PwaUpdatePrompt() {
  const [signedIn, setSignedIn] = useState(false);

  const [authChecked, setAuthChecked] = useState(false);

  const [installingUpdate, setInstallingUpdate] = useState(false);

  const [updateError, setUpdateError] = useState("");

  const registrationRef = useRef(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,

    onRegisteredSW(_serviceWorkerUrl, registration) {
      registrationRef.current = registration || null;
    },

    onRegisterError(error) {
      console.error("Service worker registration failed:", error);

      setUpdateError(
        error?.message || "The application updater could not be registered.",
      );
    },
  });

  useEffect(() => {
    let active = true;

    async function loadAuthenticationState() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!active) {
          return;
        }

        setSignedIn(Boolean(data.session));
      } catch (error) {
        console.error("Authentication state check failed:", error);
      } finally {
        if (active) {
          setAuthChecked(true);
        }
      }
    }

    void loadAuthenticationState();

    const { data: authSubscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSignedIn(Boolean(session));
        setAuthChecked(true);
      },
    );

    return () => {
      active = false;

      authSubscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function checkForUpdate() {
      if (!window.navigator.onLine || !registrationRef.current) {
        return;
      }

      try {
        await registrationRef.current.update();
      } catch (error) {
        console.error("Application update check failed:", error);
      }
    }

    const initialTimer = window.setTimeout(() => {
      void checkForUpdate();
    }, 1000);

    const updateTimer = window.setInterval(() => {
      void checkForUpdate();
    }, UPDATE_CHECK_INTERVAL_MS);

    function handleOnline() {
      void checkForUpdate();
    }

    window.addEventListener("online", handleOnline);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(updateTimer);

      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    async function installUpdateBeforeLogin() {
      if (!authChecked || !needRefresh || signedIn || installingUpdate) {
        return;
      }

      try {
        setInstallingUpdate(true);
        setUpdateError("");

        await updateServiceWorker(true);
      } catch (error) {
        console.error("Automatic application update failed:", error);

        setInstallingUpdate(false);

        setUpdateError(
          error?.message ||
            "The latest application version could not be installed.",
        );
      }
    }

    void installUpdateBeforeLogin();
  }, [
    authChecked,
    installingUpdate,
    needRefresh,
    signedIn,
    updateServiceWorker,
  ]);

  async function handleManualUpdate() {
    try {
      setInstallingUpdate(true);
      setUpdateError("");

      await updateServiceWorker(true);
    } catch (error) {
      console.error("Application update failed:", error);

      setInstallingUpdate(false);

      setUpdateError(
        error?.message ||
          "The latest application version could not be installed.",
      );
    }
  }

  async function handleUpdateRecovery() {
    try {
      setInstallingUpdate(true);
      setUpdateError("");

      const registration = await navigator.serviceWorker.getRegistration();

      if (registration) {
        await registration.unregister();
      }

      const deletedCacheCount = await clearApplicationCaches();

      console.info(`Removed ${deletedCacheCount} application cache(s).`);

      const recoveryUrl = new URL(
        import.meta.env.BASE_URL,
        window.location.origin,
      );

      recoveryUrl.hash = "#/login";
      recoveryUrl.searchParams.set("app-refresh", Date.now().toString());

      window.location.replace(recoveryUrl.toString());
    } catch (error) {
      console.error("Application update recovery failed:", error);

      setInstallingUpdate(false);

      setUpdateError(
        error?.message || "The application cache could not be refreshed.",
      );
    }
  }

  if (!authChecked) {
    return null;
  }

  if (needRefresh && !signedIn) {
    return (
      <div
        className="mandatory-update-screen"
        role="alert"
        aria-live="assertive"
      >
        <div className="mandatory-update-card">
          <strong>Updating OPS Checklist</strong>

          <p>A new version is being installed before sign-in.</p>

          <span>Keep this screen open.</span>

          {updateError ? (
            <>
              <p className="mandatory-update-error">{updateError}</p>

              <button
                type="button"
                className="mandatory-update-retry"
                disabled={installingUpdate}
                onClick={() => {
                  void handleUpdateRecovery();
                }}
              >
                Refresh application
              </button>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  if (needRefresh && signedIn) {
    return (
      <div className="pwa-update-prompt" role="alert" aria-live="assertive">
        <div className="pwa-update-content">
          <strong>Application update available</strong>

          <span>
            Save or complete the current operation before installing the latest
            version.
          </span>

          {updateError ? <span>{updateError}</span> : null}
        </div>

        <div className="pwa-update-actions">
          <button
            type="button"
            className="pwa-update-button pwa-update-button-primary"
            disabled={installingUpdate}
            onClick={() => {
              void handleManualUpdate();
            }}
          >
            {installingUpdate ? "Updating..." : "Update now"}
          </button>

          <button
            type="button"
            className="pwa-update-button pwa-update-button-secondary"
            disabled={installingUpdate}
            onClick={() => {
              setNeedRefresh(false);
            }}
          >
            Later
          </button>
        </div>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div
        className="pwa-update-prompt pwa-update-prompt-ready"
        role="status"
        aria-live="polite"
      >
        <div className="pwa-update-content">
          <strong>Offline mode is ready</strong>

          <span>
            The application shell is available when connectivity is interrupted.
          </span>
        </div>

        <div className="pwa-update-actions">
          <button
            type="button"
            className="pwa-update-button pwa-update-button-primary"
            onClick={() => {
              setOfflineReady(false);
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return null;
}
