import { supabase } from "../lib/supabase";
import {
  getAllQueueItems,
  type LifecycleQueueItem,
  removeQueueItem,
  updateQueueItem,
} from "./lifecycleQueue";

const LIFECYCLE_SYNC_LOCK_NAME = "saa-ramp-lifecycle-sync";

let lifecycleSyncPromise: Promise<void> | null = null;

function sortOperations(
  operations: LifecycleQueueItem[],
): LifecycleQueueItem[] {
  return [...operations].sort((first, second) => {
    if (
      first.checklistId === second.checklistId &&
      first.taskId === second.taskId
    ) {
      const sequenceDifference = first.sequenceNumber - second.sequenceNumber;

      if (sequenceDifference !== 0) {
        return sequenceDifference;
      }
    }

    const dateDifference =
      new Date(first.clientCreatedAt).getTime() -
      new Date(second.clientCreatedAt).getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return first.sequenceNumber - second.sequenceNumber;
  });
}

function isConflictError(error: { code?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "40001" ||
    error.code === "409" ||
    message.includes("conflict") ||
    message.includes("version") ||
    message.includes("sequence") ||
    message.includes("already started") ||
    message.includes("already completed") ||
    message.includes("must be started") ||
    message.includes("can be reopened")
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Lifecycle synchronization failed.";
}

async function resetInterruptedOperation(
  operation: LifecycleQueueItem,
): Promise<LifecycleQueueItem> {
  if (operation.status !== "uploading") {
    return operation;
  }

  const resetOperation: LifecycleQueueItem = {
    ...operation,
    status: "pending",
    lastError: "The previous upload was interrupted and will be retried.",
  };

  await updateQueueItem(resetOperation);

  return resetOperation;
}

async function uploadOperation(operation: LifecycleQueueItem): Promise<void> {
  const uploadingItem: LifecycleQueueItem = {
    ...operation,
    status: "uploading",
    attempts: Number(operation.attempts ?? 0) + 1,
    lastError: null,
  };

  await updateQueueItem(uploadingItem);

  try {
    const { data, error } = await supabase.rpc("process_lifecycle_operation", {
      p_operation_id: operation.operationId,
      p_checklist_id: operation.checklistId,
      p_task_id: operation.taskId,
      p_sequence_number: operation.sequenceNumber,
      p_action: operation.action,
      p_payload: operation.payload,
      p_expected_version: operation.expectedVersion,
      p_device_id: operation.deviceId,
      p_client_created_at: operation.clientCreatedAt,
    });

    if (error) {
      const conflict = isConflictError(error);

      await updateQueueItem({
        ...uploadingItem,
        status: conflict ? "conflict" : "failed",
        lastError: error.message || "Lifecycle upload failed.",
      });

      window.dispatchEvent(
        new CustomEvent(
          conflict
            ? "lifecycle-operation-conflict"
            : "lifecycle-operation-failed",
          {
            detail: {
              operationId: operation.operationId,
              checklistId: operation.checklistId,
              taskId: operation.taskId,
              action: operation.action,
              errorCode: error.code ?? null,
              errorMessage: error.message || "Lifecycle upload failed.",
            },
          },
        ),
      );

      throw new Error(error.message || "Lifecycle upload failed.");
    }

    await removeQueueItem(operation.operationId);

    window.dispatchEvent(
      new CustomEvent("lifecycle-operation-synced", {
        detail: {
          operationId: operation.operationId,
          checklistId: operation.checklistId,
          taskId: operation.taskId,
          action: operation.action,
          lifecycleVersion: Number(
            data?.lifecycleVersion ?? operation.expectedVersion + 1,
          ),
        },
      }),
    );
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    /*
     * Supabase errors are classified and
     * stored above. This fallback handles
     * network and unexpected failures.
     */
    const latestItems = await getAllQueueItems();

    const latestOperation = latestItems.find(
      (item) => item.operationId === operation.operationId,
    );

    if (latestOperation?.status === "uploading") {
      await updateQueueItem({
        ...uploadingItem,
        status: "failed",
        lastError: errorMessage,
      });

      window.dispatchEvent(
        new CustomEvent("lifecycle-operation-failed", {
          detail: {
            operationId: operation.operationId,
            checklistId: operation.checklistId,
            taskId: operation.taskId,
            action: operation.action,
            errorCode: null,
            errorMessage,
          },
        }),
      );
    }

    throw error;
  }
}

async function processLifecycleQueueInternal(): Promise<void> {
  if (typeof window === "undefined" || !window.navigator.onLine) {
    return;
  }

  const allOperations = await getAllQueueItems();

  const retryableOperations = allOperations.filter(
    (item) =>
      item.status === "pending" ||
      item.status === "failed" ||
      item.status === "uploading",
  );

  const normalizedOperations: LifecycleQueueItem[] = [];

  for (const operation of retryableOperations) {
    const normalizedOperation = await resetInterruptedOperation(operation);

    normalizedOperations.push(normalizedOperation);
  }

  const orderedOperations = sortOperations(normalizedOperations);

  for (const operation of orderedOperations) {
    if (!window.navigator.onLine) {
      break;
    }

    try {
      await uploadOperation(operation);
    } catch (error) {
      console.error("Lifecycle queue processing paused:", error);

      /*
       * Stop here so a later lifecycle action
       * cannot overtake the failed operation.
       */
      break;
    }
  }
}

type BrowserLockManager = {
  request<T>(
    name: string,
    options: {
      mode: "exclusive";
    },
    callback: () => Promise<T>,
  ): Promise<T>;
};

type NavigatorWithLocks = Navigator & {
  locks?: BrowserLockManager;
};

async function runWithBrowserLifecycleLock(
  callback: () => Promise<void>,
): Promise<void> {
  if (typeof navigator === "undefined") {
    await callback();
    return;
  }

  const browserNavigator = navigator as NavigatorWithLocks;

  if (browserNavigator.locks) {
    await browserNavigator.locks.request(
      LIFECYCLE_SYNC_LOCK_NAME,
      {
        mode: "exclusive",
      },
      callback,
    );

    return;
  }

  await callback();
}

export function processLifecycleQueue(): Promise<void> {
  if (lifecycleSyncPromise) {
    return lifecycleSyncPromise;
  }

  lifecycleSyncPromise = runWithBrowserLifecycleLock(
    processLifecycleQueueInternal,
  ).finally(() => {
    lifecycleSyncPromise = null;

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("lifecycle-sync-finished"));
    }
  });

  return lifecycleSyncPromise;
}

export function registerLifecycleSync(): () => void {
  function handleOnline() {
    void processLifecycleQueue();
  }

  window.addEventListener("online", handleOnline);

  return () => {
    window.removeEventListener("online", handleOnline);
  };
}
