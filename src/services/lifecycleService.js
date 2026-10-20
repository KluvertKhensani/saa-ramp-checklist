import { enqueueLifecycleOperation } from "../offline/lifecycleQueue";
import { processLifecycleQueue } from "../offline/processLifecycleQueue";

const supportedActions = new Set(["start", "complete", "reopen", "update"]);

const completionStatuses = new Set(["on_time", "light_delay", "delay"]);

function validateLifecycleVersion(value) {
  const version = Number(value ?? 0);

  if (!Number.isInteger(version) || version < 0) {
    throw new Error("Lifecycle version must be zero or greater.");
  }

  return version;
}

function validateDelaySeconds(value) {
  const delay = Number(value);

  if (!Number.isFinite(delay)) {
    throw new Error("Delay seconds must be a valid number.");
  }

  if (!Number.isInteger(delay)) {
    throw new Error("Delay seconds must be an integer.");
  }

  return delay;
}

export async function queueLifecycleAction({
  action,
  checklistId,
  taskId,
  lifecycleVersion,
  userId,
  actualTime,
  delaySeconds,
  operationalStatus,
  observation,
}) {
  if (!supportedActions.has(action)) {
    throw new Error(`Unsupported lifecycle action: ${action}`);
  }

  if (!checklistId) {
    throw new Error("Checklist ID is required.");
  }

  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  if (!userId) {
    throw new Error("An authenticated user is required.");
  }

  const expectedVersion = validateLifecycleVersion(lifecycleVersion);

  const payload = {
    occurredAt: new Date().toISOString(),
  };

  if (action === "complete") {
    if (!actualTime) {
      throw new Error("Actual time is required when completing a task.");
    }

    if (!completionStatuses.has(operationalStatus)) {
      throw new Error("Completion requires on_time, light_delay, or delay.");
    }

    payload.actualTime = actualTime;
    payload.delaySeconds = validateDelaySeconds(delaySeconds);
    payload.operationalStatus = operationalStatus;
  }

  if (action === "update" && operationalStatus !== undefined) {
    if (
      operationalStatus !== "pending" &&
      !completionStatuses.has(operationalStatus)
    ) {
      throw new Error("Invalid operational status.");
    }

    payload.operationalStatus = operationalStatus;
  }

  if (observation !== undefined) {
    payload.observation = observation;
  }

  const operation = await enqueueLifecycleOperation({
    checklistId,
    taskId,
    action,
    payload,
    expectedVersion,
    userId,
  });

  if (window.navigator.onLine) {
    await processLifecycleQueue();
  }

  return {
    operation,
    occurredAt: payload.occurredAt,
    operationalStatus:
      action === "complete"
        ? operationalStatus
        : action === "start" || action === "reopen"
          ? "pending"
          : operationalStatus,
    nextLifecycleVersion: expectedVersion + 1,
  };
}
