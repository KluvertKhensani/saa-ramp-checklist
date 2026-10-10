const DATABASE_NAME =
    "saa-ramp-checklist-offline";

const DATABASE_VERSION = 1;

const ACTION_STORE =
    "pending_actions";

function createActionId() {
    if (
        typeof crypto !==
        "undefined" &&
        typeof crypto.randomUUID ===
        "function"
    ) {
        return crypto.randomUUID();
    }

    return [
        Date.now(),
        Math.random()
            .toString(16)
            .slice(2),
    ].join("-");
}

function requestToPromise(
    request
) {
    return new Promise(
        (
            resolve,
            reject
        ) => {
            request.onsuccess =
                () => {
                    resolve(
                        request.result
                    );
                };

            request.onerror =
                () => {
                    reject(
                        request.error ||
                        new Error(
                            "IndexedDB request failed."
                        )
                    );
                };
        }
    );
}

function transactionToPromise(
    transaction
) {
    return new Promise(
        (
            resolve,
            reject
        ) => {
            transaction.oncomplete =
                () => {
                    resolve();
                };

            transaction.onerror =
                () => {
                    reject(
                        transaction.error ||
                        new Error(
                            "IndexedDB transaction failed."
                        )
                    );
                };

            transaction.onabort =
                () => {
                    reject(
                        transaction.error ||
                        new Error(
                            "IndexedDB transaction was aborted."
                        )
                    );
                };
        }
    );
}

function openOfflineDatabase() {
    return new Promise(
        (
            resolve,
            reject
        ) => {
            if (
                typeof indexedDB ===
                "undefined"
            ) {
                reject(
                    new Error(
                        "IndexedDB is not available in this browser."
                    )
                );

                return;
            }

            const request =
                indexedDB.open(
                    DATABASE_NAME,
                    DATABASE_VERSION
                );

            request.onupgradeneeded =
                () => {
                    const database =
                        request.result;

                    if (
                        !database
                            .objectStoreNames
                            .contains(
                                ACTION_STORE
                            )
                    ) {
                        const store =
                            database
                                .createObjectStore(
                                    ACTION_STORE,
                                    {
                                        keyPath: "id",
                                    }
                                );

                        store.createIndex(
                            "created_at",
                            "created_at",
                            {
                                unique: false,
                            }
                        );

                        store.createIndex(
                            "checklist_id",
                            "checklist_id",
                            {
                                unique: false,
                            }
                        );

                        store.createIndex(
                            "status",
                            "status",
                            {
                                unique: false,
                            }
                        );

                        store.createIndex(
                            "deduplication_key",
                            "deduplication_key",
                            {
                                unique: false,
                            }
                        );
                    }
                };

            request.onsuccess =
                () => {
                    resolve(
                        request.result
                    );
                };

            request.onerror =
                () => {
                    reject(
                        request.error ||
                        new Error(
                            "The offline database could not be opened."
                        )
                    );
                };

            request.onblocked =
                () => {
                    reject(
                        new Error(
                            "The offline database upgrade is blocked by another open application tab."
                        )
                    );
                };
        }
    );
}

async function withStore(
    mode,
    operation
) {
    const database =
        await openOfflineDatabase();

    try {
        const transaction =
            database.transaction(
                ACTION_STORE,
                mode
            );

        const store =
            transaction.objectStore(
                ACTION_STORE
            );

        const result =
            await operation(
                store,
                transaction
            );

        await transactionToPromise(
            transaction
        );

        return result;
    } finally {
        database.close();
    }
}

export async function getOfflineActions() {
    return withStore(
        "readonly",
        async (store) => {
            const actions =
                await requestToPromise(
                    store.getAll()
                );

            return (
                actions || []
            ).sort(
                (
                    firstAction,
                    secondAction
                ) =>
                    String(
                        firstAction.created_at
                    ).localeCompare(
                        String(
                            secondAction.created_at
                        )
                    )
            );
        }
    );
}

export async function getOfflineActionCount() {
    return withStore(
        "readonly",
        (store) =>
            requestToPromise(
                store.count()
            )
    );
}

export async function findOfflineActionByDeduplicationKey(
    deduplicationKey
) {
    if (!deduplicationKey) {
        return null;
    }

    return withStore(
        "readonly",
        async (store) => {
            const index =
                store.index(
                    "deduplication_key"
                );

            const actions =
                await requestToPromise(
                    index.getAll(
                        deduplicationKey
                    )
                );

            return (
                actions?.[0] ||
                null
            );
        }
    );
}

export async function queueOfflineAction({
    checklistId = null,
    actionType,
    payload,
    userId = null,
    baseVersion = null,
    deduplicationKey = null,
}) {
    if (!actionType) {
        throw new Error(
            "Offline action type is required."
        );
    }

    const existingAction =
        await findOfflineActionByDeduplicationKey(
            deduplicationKey
        );

    const now =
        new Date()
            .toISOString();

    const action = {
        id:
            existingAction?.id ||
            createActionId(),
        checklist_id:
            checklistId,
        action_type:
            actionType,
        payload,
        user_id:
            userId,
        base_version:
            baseVersion,
        deduplication_key:
            deduplicationKey,
        created_at:
            existingAction
                ?.created_at ||
            now,
        updated_at:
            now,
        retry_count:
            existingAction
                ?.retry_count ||
            0,
        last_error:
            null,
        status:
            "pending",
    };

    await withStore(
        "readwrite",
        (store) => {
            store.put(
                action
            );

            return Promise.resolve();
        }
    );

    return action;
}

export async function removeOfflineAction(
    actionId
) {
    if (!actionId) {
        return;
    }

    await withStore(
        "readwrite",
        (store) => {
            store.delete(
                actionId
            );

            return Promise.resolve();
        }
    );
}

export async function updateOfflineAction(
    actionId,
    changes
) {
    if (!actionId) {
        return null;
    }

    const actions =
        await getOfflineActions();

    const currentAction =
        actions.find(
            (action) =>
                action.id ===
                actionId
        );

    if (!currentAction) {
        return null;
    }

    const updatedAction = {
        ...currentAction,
        ...changes,
        id:
            currentAction.id,
        updated_at:
            new Date()
                .toISOString(),
    };

    await withStore(
        "readwrite",
        (store) => {
            store.put(
                updatedAction
            );

            return Promise.resolve();
        }
    );

    return updatedAction;
}

export async function clearOfflineActions() {
    await withStore(
        "readwrite",
        (store) => {
            store.clear();

            return Promise.resolve();
        }
    );
}