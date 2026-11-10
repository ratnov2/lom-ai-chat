import {
  DATABASE_NAME,
  DATABASE_VERSION,
  SNAPSHOT_STORE,
  SNAPSHOT_KEY,
} from "./consts";
import { ERROR_MESSAGES } from "../../shared/constants/errors";
import type { createSnapshot } from "./persistence";


export interface ISnapshotStorage {
  read(): Promise<unknown>;
  write(snapshot: ReturnType<typeof createSnapshot>): Promise<void>;
  close(): void;
}

export function openIndexedDb(
  factory: IDBFactory = window.indexedDB,
): Promise<ISnapshotStorage> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
    let blocked = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(SNAPSHOT_STORE)) {
        request.result.createObjectStore(SNAPSHOT_STORE);
      }
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error(ERROR_MESSAGES.INDEXED_DB_UPGRADE_BLOCKED));
    };
    request.onsuccess = () => {
      const database = request.result;
      if (blocked) {
        database.close();
        return;
      }
      database.onversionchange = () => database.close();
      resolve({
        read() {
          return new Promise((resolveRead, rejectRead) => {
            const transaction = database.transaction(
              SNAPSHOT_STORE,
              "readonly",
            );
            const request = transaction
              .objectStore(SNAPSHOT_STORE)
              .get(SNAPSHOT_KEY);
            transaction.oncomplete = () => resolveRead(request.result);
            transaction.onabort = () =>
              rejectRead(
                transaction.error ??
                  new Error(ERROR_MESSAGES.INDEXED_DB_READ_ABORTED),
              );
            transaction.onerror = () => rejectRead(transaction.error);
          });
        },
        write(snapshot) {
          return new Promise<void>((resolveWrite, rejectWrite) => {
            const transaction = database.transaction(
              SNAPSHOT_STORE,
              "readwrite",
            );
            transaction.objectStore(SNAPSHOT_STORE).put(snapshot, SNAPSHOT_KEY);
            transaction.oncomplete = () => resolveWrite();
            transaction.onabort = () =>
              rejectWrite(
                transaction.error ??
                  new Error(ERROR_MESSAGES.INDEXED_DB_WRITE_ABORTED),
              );
            transaction.onerror = () => rejectWrite(transaction.error);
            transaction.commit();
          });
        },
        close: () => database.close(),
      });
    };
  });
}
