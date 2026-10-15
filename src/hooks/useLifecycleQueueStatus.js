import { useCallback, useEffect, useState } from "react";

import { getQueueSummary } from "../offline/lifecycleQueue";
import { processLifecycleQueue } from "../offline/processLifecycleQueue";

const initialSummary = {
  total: 0,
  pending: 0,
  uploading: 0,
  conflicts: 0,
  failed: 0,
};

export default function useLifecycleQueueStatus() {
  const [summary, setSummary] = useState(initialSummary);
  const [isOnline, setIsOnline] = useState(
    () => window.navigator.onLine
  );
  const [isRetrying, setIsRetrying] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const nextSummary = await getQueueSummary();
      setSummary(nextSummary);
    } catch (error) {
      console.error(
        "Unable to read lifecycle queue status:",
        error
      );
    }
  }, []);

  const retry = useCallback(async () => {
    if (!window.navigator.onLine || isRetrying) {
      return;
    }

    setIsRetrying(true);

    try {
      await processLifecycleQueue();
      await refresh();
    } catch (error) {
      console.error(
        "Unable to process lifecycle queue:",
        error
      );
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, refresh]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void refresh();
    };

    const handleOffline = () => {
      setIsOnline(false);
      void refresh();
    };

    const handleQueueChange = () => {
      void refresh();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    window.addEventListener(
      "lifecycle-queue-changed",
      handleQueueChange
    );

    window.addEventListener(
      "lifecycle-sync-finished",
      handleQueueChange
    );

    const initialRefreshTimer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(initialRefreshTimer);

      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );

      window.removeEventListener(
        "lifecycle-queue-changed",
        handleQueueChange
      );

      window.removeEventListener(
        "lifecycle-sync-finished",
        handleQueueChange
      );
    };
  }, [refresh]);

  return {
    ...summary,
    isOnline,
    isRetrying,
    refresh,
    retry,
  };
}