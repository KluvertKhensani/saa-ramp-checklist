const DATABASE_NAME = "saa-ramp-checklist-offline";

const DATABASE_VERSION = 1;

const ACTION_STORE = "pending_actions";

const CURRENT_SNAPSHOT_VERSION = 1;

function createActionId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return [Date.now(), Math.random().toString(16).slice(2)].join("-");
}

function dateValue(value) {
  const timestamp = new Date(value || 0).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("IndexedDB request failed."));
    };
  });
}

function transactionToPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error || new Error("IndexedDB transaction failed."));
    };

    transaction.onabort = () => {
      reject(
        transaction.error || new Error("IndexedDB transaction was aborted."),
      );
    };
  });
}

function openOfflineDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));

      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (database.objectStoreNames.contains(ACTION_STORE)) {
        return;
      }

      const store = database.createObjectStore(ACTION_STORE, {
        keyPath: "id",
      });

      store.createIndex("created_at", "created_at", {
        unique: false,
      });

      store.createIndex("checklist_id", "checklist_id", {
        unique: false,
      });

      store.createIndex("status", "status", {
        unique: false,
      });

      store.createIndex("deduplication_key", "deduplication_key", {
        unique: false,
      });
    };

    request.onsuccess = () => {
      const database = request.result;

      database.onversionchange = () => {
        database.close();
      };

      resolve(database);
    };

    request.onerror = () => {
      reject(
        request.error || new Error("The offline database could not be opened."),
      );
    };

    request.onblocked = () => {
      reject(
        new Error(
          "The offline database upgrade is blocked by another open application tab.",
        ),
      );
    };
  });
}

async function withStore(mode, operation) {
  const database = await openOfflineDatabase();

  try {
    const transaction = database.transaction(ACTION_STORE, mode);

    const store = transaction.objectStore(ACTION_STORE);

    const result = await operation(store, transaction);

    await transactionToPromise(transaction);

    return result;
  } finally {
    database.close();
  }
}

function validateQueuedAction({ actionType, payload, userId }) {
  if (!actionType) {
    throw new Error("Offline action type is required.");
  }

  if (actionType !== "checklist_snapshot") {
    throw new Error(`Unsupported offline action type: ${actionType}`);
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("A valid local draft payload is required.");
  }

  if (!payload.checklist || !Array.isArray(payload.items)) {
    throw new Error("The local draft payload is incomplete.");
  }

  if (!userId) {
    throw new Error("A signed-in user is required to store a local draft.");
  }
}

export async function getOfflineActions() {
  return withStore("readonly", async (store) => {
    const actions = await requestToPromise(store.getAll());

    return (actions || []).sort(
      (firstAction, secondAction) =>
        dateValue(firstAction.updated_at || firstAction.created_at) -
        dateValue(secondAction.updated_at || secondAction.created_at),
    );
  });
}

export async function getOfflineActionCount() {
  const actions = await getOfflineActions();

  return actions.filter(
    (action) =>
      action.status === "pending" &&
      action.action_type === "checklist_snapshot",
  ).length;
}

export async function findOfflineActionByDeduplicationKey(deduplicationKey) {
  if (!deduplicationKey) {
    return null;
  }

  return withStore("readonly", async (store) => {
    const index = store.index("deduplication_key");

    const actions = await requestToPromise(index.getAll(deduplicationKey));

    if (!actions?.length) {
      return null;
    }

    return [...actions].sort(
      (firstAction, secondAction) =>
        dateValue(secondAction.updated_at) - dateValue(firstAction.updated_at),
    )[0];
  });
}

export async function queueOfflineAction({
  checklistId = null,
  actionType,
  payload,
  userId = null,
  baseVersion = null,
  deduplicationKey = null,
}) {
  validateQueuedAction({
    actionType,
    payload,
    userId,
  });

  const existingAction =
    await findOfflineActionByDeduplicationKey(deduplicationKey);

  if (existingAction?.user_id && existingAction.user_id !== userId) {
    throw new Error(
      "The existing local draft belongs to another signed-in user.",
    );
  }

  const now = new Date().toISOString();

  const action = {
    id: existingAction?.id || createActionId(),
    checklist_id: checklistId,
    action_type: actionType,
    payload,
    user_id: userId,
    snapshot_version: CURRENT_SNAPSHOT_VERSION,
    base_version: baseVersion,
    deduplication_key: deduplicationKey,
    created_at: existingAction?.created_at || now,
    updated_at: now,
    retry_count: existingAction?.retry_count || 0,
    last_error: null,
    status: "pending",
  };

  await withStore("readwrite", async (store) => {
    await requestToPromise(store.put(action));
  });

  return action;
}

export async function getLatestOfflineSnapshot({
  userId,
  checklistId = null,
} = {}) {
  const actions = await getOfflineActions();

  const matchingActions = actions.filter(
    (action) =>
      action.action_type === "checklist_snapshot" &&
      action.status === "pending" &&
      (!userId || action.user_id === userId) &&
      (!checklistId || action.checklist_id === checklistId),
  );

  if (!matchingActions.length) {
    return null;
  }

  return matchingActions.sort(
    (firstAction, secondAction) =>
      dateValue(secondAction.updated_at) - dateValue(firstAction.updated_at),
  )[0];
}

export async function removeOfflineAction(actionId) {
  if (!actionId) {
    return;
  }

  await withStore("readwrite", async (store) => {
    await requestToPromise(store.delete(actionId));
  });
}

export async function updateOfflineAction(actionId, changes) {
  if (!actionId) {
    return null;
  }

  return withStore("readwrite", async (store) => {
    const currentAction = await requestToPromise(store.get(actionId));

    if (!currentAction) {
      return null;
    }

    const updatedAction = {
      ...currentAction,
      ...changes,
      id: currentAction.id,
      updated_at: new Date().toISOString(),
    };

    await requestToPromise(store.put(updatedAction));

    return updatedAction;
  });
}

export async function clearOfflineActions({ userId = null } = {}) {
  if (!userId) {
    await withStore("readwrite", async (store) => {
      await requestToPromise(store.clear());
    });

    return;
  }

  const actions = await getOfflineActions();

  const userActions = actions.filter((action) => action.user_id === userId);

  await withStore("readwrite", async (store) => {
    for (const action of userActions) {
      await requestToPromise(store.delete(action.id));
    }
  });
}
