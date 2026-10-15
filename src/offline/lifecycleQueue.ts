export type LifecycleAction =
    | "start"
    | "complete"
    | "reopen"
    | "update";

export type QueueStatus =
    | "pending"
    | "uploading"
    | "conflict"
    | "failed";

export interface LifecycleQueueItem {
    operationId: string;
    checklistId: string;
    taskId: string;
    sequenceNumber: number;
    action: LifecycleAction;
    payload: Record<string, unknown>;
    expectedVersion: number;
    deviceId: string;
    userId: string;
    clientCreatedAt: string;
    status: QueueStatus;
    attempts: number;
    lastError: string | null;
}

const DATABASE_NAME = "saa-ramp-checklist-offline";
const DATABASE_VERSION = 2;
const STORE_NAME = "lifecycle-operations";
const METADATA_STORE_NAME =
    "lifecycle-queue-metadata";

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(
            DATABASE_NAME,
            DATABASE_VERSION
        );

        request.onupgradeneeded = () => {
            const database = request.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(
                    STORE_NAME,
                    {
                        keyPath: "operationId",
                    }
                );

                store.createIndex(
                    "status",
                    "status",
                    { unique: false }
                );

                store.createIndex(
                    "taskSequence",
                    [
                        "checklistId",
                        "taskId",
                        "sequenceNumber",
                    ],
                    { unique: true }
                );
            }

            if (
                !database.objectStoreNames.contains(
                    METADATA_STORE_NAME
                )
            ) {
                database.createObjectStore(
                    METADATA_STORE_NAME,
                    {
                        keyPath: "key",
                    }
                );
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function runTransaction<T>(
    mode: IDBTransactionMode,
    handler: (
        store: IDBObjectStore,
        resolve: (value: T) => void,
        reject: (reason?: unknown) => void
    ) => void
): Promise<T> {
    return openDatabase().then(
        database =>
            new Promise<T>((resolve, reject) => {
                const transaction = database.transaction(
                    STORE_NAME,
                    mode
                );

                const store =
                    transaction.objectStore(STORE_NAME);

                handler(store, resolve, reject);

                transaction.oncomplete = () => {
                    database.close();
                };

                transaction.onerror = () => {
                    database.close();
                    reject(transaction.error);
                };
            })
    );
}

function getDeviceId(): string {
    const storageKey = "saa-ramp-device-id";
    const current = localStorage.getItem(storageKey);

    if (current) {
        return current;
    }

    const deviceId = crypto.randomUUID();
    localStorage.setItem(storageKey, deviceId);

    return deviceId;
}

export async function getNextSequenceNumber(
  checklistId: string,
  taskId: string
): Promise<number> {
  const database = await openDatabase();

  return new Promise<number>((resolve, reject) => {
    const transaction = database.transaction(
      METADATA_STORE_NAME,
      "readwrite"
    );

    const store = transaction.objectStore(
      METADATA_STORE_NAME
    );

    const key =
      `sequence:${checklistId}:${taskId}`;

    const request = store.get(key);

    let nextSequence = 1;

    request.onsuccess = () => {
      const currentRecord = request.result as
        | {
            key: string;
            value: number;
          }
        | undefined;

      const currentSequence =
        currentRecord?.value ?? 0;

      nextSequence = currentSequence + 1;

      store.put({
        key,
        value: nextSequence,
      });
    };

    request.onerror = () => {
      reject(request.error);
    };

    transaction.oncomplete = () => {
      database.close();
      resolve(nextSequence);
    };

    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      database.close();
      reject(
        transaction.error ??
          new Error(
            "Sequence transaction was aborted."
          )
      );
    };
  });
}

export async function enqueueLifecycleOperation(
    input: Omit<
        LifecycleQueueItem,
        | "operationId"
        | "sequenceNumber"
        | "deviceId"
        | "clientCreatedAt"
        | "status"
        | "attempts"
        | "lastError"
    >
): Promise<LifecycleQueueItem> {
    const sequenceNumber =
        await getNextSequenceNumber(
            input.checklistId,
            input.taskId
        );

    const item: LifecycleQueueItem = {
        ...input,
        operationId: crypto.randomUUID(),
        sequenceNumber,
        deviceId: getDeviceId(),
        clientCreatedAt: new Date().toISOString(),
        status: "pending",
        attempts: 0,
        lastError: null,
    };

    await runTransaction<void>(
        "readwrite",
        (store, resolve, reject) => {
            const request = store.add(item);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        }
    );

    window.dispatchEvent(
        new CustomEvent("lifecycle-queue-changed")
    );

    return item;
}

export async function getAllQueueItems():
    Promise<LifecycleQueueItem[]> {
    return runTransaction<LifecycleQueueItem[]>(
        "readonly",
        (store, resolve, reject) => {
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(
                    request.result as LifecycleQueueItem[]
                );
            };

            request.onerror = () => reject(request.error);
        }
    );
}

export async function updateQueueItem(
    item: LifecycleQueueItem
): Promise<void> {
    await runTransaction<void>(
        "readwrite",
        (store, resolve, reject) => {
            const request = store.put(item);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        }
    );

    window.dispatchEvent(
        new CustomEvent("lifecycle-queue-changed")
    );
}

export async function removeQueueItem(
    operationId: string
): Promise<void> {
    await runTransaction<void>(
        "readwrite",
        (store, resolve, reject) => {
            const request = store.delete(operationId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        }
    );

    window.dispatchEvent(
        new CustomEvent("lifecycle-queue-changed")
    );
}

export async function getQueueSummary() {
    const items = await getAllQueueItems();

    return {
        total: items.length,
        pending: items.filter(
            item => item.status === "pending"
        ).length,
        uploading: items.filter(
            item => item.status === "uploading"
        ).length,
        conflicts: items.filter(
            item => item.status === "conflict"
        ).length,
        failed: items.filter(
            item => item.status === "failed"
        ).length,
    };
}