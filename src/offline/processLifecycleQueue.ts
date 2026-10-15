import { supabase } from "../lib/supabase";
import {
  getAllQueueItems,
  LifecycleQueueItem,
  removeQueueItem,
  updateQueueItem,
} from "./lifecycleQueue";

let processing = false;

function sortOperations(
  operations: LifecycleQueueItem[]
): LifecycleQueueItem[] {
  return [...operations].sort((a, b) => {
    const dateDifference =
      new Date(a.clientCreatedAt).getTime() -
      new Date(b.clientCreatedAt).getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return a.sequenceNumber - b.sequenceNumber;
  });
}

function isConflictError(
  error: {
    code?: string;
    message?: string;
  }
): boolean {
  const message =
    error.message?.toLowerCase() ?? "";

  return (
    error.code === "40001" ||
    message.includes("conflict") ||
    message.includes("version") ||
    message.includes("sequence") ||
    message.includes("already started") ||
    message.includes("already completed") ||
    message.includes("must be started") ||
    message.includes("can be reopened")
  );
}

async function uploadOperation(
  operation: LifecycleQueueItem
): Promise<void> {
  const uploadingItem: LifecycleQueueItem = {
    ...operation,
    status: "uploading",
    attempts: operation.attempts + 1,
    lastError: null,
  };

  await updateQueueItem(uploadingItem);

  const { error } = await supabase.rpc(
    "process_lifecycle_operation",
    {
      p_operation_id: operation.operationId,
      p_checklist_id: operation.checklistId,
      p_task_id: operation.taskId,
      p_sequence_number: operation.sequenceNumber,
      p_action: operation.action,
      p_payload: operation.payload,
      p_expected_version: operation.expectedVersion,
      p_device_id: operation.deviceId,
      p_client_created_at:
        operation.clientCreatedAt,
    }
  );

  if (!error) {
    await removeQueueItem(operation.operationId);
    return;
  }

  const conflict = isConflictError(error);

  await updateQueueItem({
    ...uploadingItem,
    status: conflict ? "conflict" : "failed",
    lastError: error.message,
  });

  throw new Error(error.message);
}

export async function processLifecycleQueue():
Promise<void> {
  if (processing) {
    return;
  }

  processing = true;

  try {
    const allOperations = await getAllQueueItems();

    const replayable = allOperations.filter(
      item =>
        item.status === "pending" ||
        item.status === "failed" ||
        item.status === "uploading"
    );

    const orderedOperations =
      sortOperations(replayable);

    for (const operation of orderedOperations) {
      try {
        await uploadOperation(operation);
      } catch {
        /*
         * Stop replay here so later lifecycle actions
         * cannot overtake the failed operation.
         */
        break;
      }
    }
  } finally {
    processing = false;

    window.dispatchEvent(
      new CustomEvent("lifecycle-sync-finished")
    );
  }
}

export function registerLifecycleSync(): () => void {
  const handleOnline = () => {
    void processLifecycleQueue();
  };

  const handleFocus = () => {
    void processLifecycleQueue();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("focus", handleFocus);

  void processLifecycleQueue();

  return () => {
    window.removeEventListener(
      "online",
      handleOnline
    );

    window.removeEventListener(
      "focus",
      handleFocus
    );
  };
}