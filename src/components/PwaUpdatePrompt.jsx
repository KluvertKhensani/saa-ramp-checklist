import {
  CheckCircle2,
  DownloadCloud,
  RefreshCw,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { registerSW } from "virtual:pwa-register";

export default function PwaUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const [offlineReady, setOfflineReady] = useState(false);

  const [registrationError, setRegistrationError] = useState(false);

  const [updating, setUpdating] = useState(false);

  const updateServiceWorkerRef = useRef(null);

  useEffect(() => {
    const updateServiceWorker = registerSW({
      immediate: true,

      onNeedRefresh() {
        setUpdateAvailable(true);
        setOfflineReady(false);
      },

      onOfflineReady() {
        setOfflineReady(true);
      },

      onRegisteredSW(swScriptUrl, registration) {
        console.info("PWA service worker registered:", swScriptUrl);

        if (!registration) {
          return;
        }

        const updateInterval = window.setInterval(
          () => {
            registration.update().catch((error) => {
              console.error("PWA update check failed:", error);
            });
          },
          60 * 60 * 1000,
        );

        window.addEventListener(
          "beforeunload",
          () => {
            window.clearInterval(updateInterval);
          },
          {
            once: true,
          },
        );
      },

      onRegisterError(error) {
        console.error("PWA registration failed:", error);

        setRegistrationError(true);
      },
    });

    updateServiceWorkerRef.current = updateServiceWorker;

    return () => {
      updateServiceWorkerRef.current = null;
    };
  }, []);

  async function installUpdate() {
    if (updating || !updateServiceWorkerRef.current) {
      return;
    }

    try {
      setUpdating(true);

      await updateServiceWorkerRef.current(true);
    } catch (error) {
      console.error("PWA update failed:", error);

      setUpdating(false);
      setRegistrationError(true);
      setUpdateAvailable(false);
    }
  }

  function dismissUpdate() {
    if (updating) {
      return;
    }

    setUpdateAvailable(false);
  }

  function dismissOfflineReady() {
    setOfflineReady(false);
  }

  function dismissRegistrationError() {
    setRegistrationError(false);
  }

  if (updateAvailable) {
    return (
      <aside
        className="pwa-update-prompt"
        role="alertdialog"
        aria-modal="false"
        aria-labelledby="pwa-update-title"
        aria-describedby="pwa-update-description"
      >
        <div className="pwa-update-icon">
          <DownloadCloud size={23} aria-hidden="true" />
        </div>

        <div className="pwa-update-content">
          <strong id="pwa-update-title">New version available</strong>

          <span id="pwa-update-description">
            Reload the application to open the newest deployed version.
          </span>
        </div>

        <div className="pwa-update-actions">
          <button
            type="button"
            className="pwa-update-button pwa-update-button-primary"
            onClick={installUpdate}
            disabled={updating}
          >
            <RefreshCw
              size={16}
              className={updating ? "spin" : ""}
              aria-hidden="true"
            />

            {updating ? "Updating..." : "Reload now"}
          </button>

          <button
            type="button"
            className="pwa-update-button pwa-update-button-secondary"
            onClick={dismissUpdate}
            disabled={updating}
          >
            Later
          </button>
        </div>
      </aside>
    );
  }

  if (offlineReady) {
    return (
      <aside
        className="pwa-update-prompt pwa-update-prompt-ready"
        role="status"
        aria-live="polite"
      >
        <div className="pwa-update-icon">
          <CheckCircle2 size={23} aria-hidden="true" />
        </div>

        <div className="pwa-update-content">
          <strong>Application files ready</strong>

          <span>
            Previously loaded screens can open without a network connection.
            Database actions still require Supabase.
          </span>
        </div>

        <button
          type="button"
          className="pwa-update-close"
          onClick={dismissOfflineReady}
          aria-label="Dismiss offline-ready notification"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </aside>
    );
  }

  if (registrationError) {
    return (
      <aside
        className="pwa-update-prompt pwa-update-prompt-error"
        role="status"
        aria-live="polite"
      >
        <div className="pwa-update-icon">
          <WifiOff size={23} aria-hidden="true" />
        </div>

        <div className="pwa-update-content">
          <strong>Update checking unavailable</strong>

          <span>
            Continue using the current version. Refresh the browser after the
            connection is restored.
          </span>
        </div>

        <button
          type="button"
          className="pwa-update-close"
          onClick={dismissRegistrationError}
          aria-label="Dismiss update error notification"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </aside>
    );
  }

  return null;
}
