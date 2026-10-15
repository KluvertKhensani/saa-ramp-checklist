import useLifecycleQueueStatus from "../hooks/useLifecycleQueueStatus";

export default function SyncStatusBadge() {
  const {
    total,
    pending,
    uploading,
    conflicts,
    failed,
    isOnline,
    isRetrying,
    retry,
  } = useLifecycleQueueStatus();

  if (conflicts > 0) {
    return (
      <button
        type="button"
        className="sync-status sync-status-conflict"
        onClick={() => void retry()}
        disabled={!isOnline || isRetrying}
        title="Some offline changes conflict with newer server data"
      >
        {conflicts} change
        {conflicts === 1 ? "" : "s"} need review
      </button>
    );
  }

  if (failed > 0) {
    return (
      <button
        type="button"
        className="sync-status sync-status-failed"
        onClick={() => void retry()}
        disabled={!isOnline || isRetrying}
        title={
          isOnline
            ? "Retry failed uploads"
            : "Uploads will retry when the connection returns"
        }
      >
        {isRetrying
          ? "Retrying uploads"
          : `${failed} failed upload${failed === 1 ? "" : "s"}`}
      </button>
    );
  }

  if (uploading > 0 || isRetrying) {
    return (
      <span
        className="sync-status sync-status-uploading"
        role="status"
        aria-live="polite"
      >
        Uploading {uploading || total} change
        {(uploading || total) === 1 ? "" : "s"}
      </span>
    );
  }

  if (pending > 0 || total > 0) {
    return (
      <button
        type="button"
        className="sync-status sync-status-pending"
        onClick={() => void retry()}
        disabled={!isOnline}
        title={
          isOnline
            ? "Upload pending changes"
            : "Changes are saved on this device"
        }
      >
        {total} pending upload
        {total === 1 ? "" : "s"}
      </button>
    );
  }

  if (!isOnline) {
    return (
      <span
        className="sync-status sync-status-offline"
        role="status"
        aria-live="polite"
      >
        Offline
      </span>
    );
  }

  return (
    <span
      className="sync-status sync-status-synced"
      role="status"
      aria-live="polite"
    >
      All changes synced
    </span>
  );
}