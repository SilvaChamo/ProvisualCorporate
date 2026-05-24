import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normaliza nomes vindos do Google Drive para exibição legível nos painéis. */
export function displayDriveName(name: unknown): string {
  if (typeof name !== "string") return "Sem nome";
  let cleaned = name.normalize("NFC").replace(/\uFFFD/g, "").trim();
  if (!cleaned) return "Sem nome";
  if (/%[0-9A-Fa-f]{2}/.test(cleaned)) {
    try {
      cleaned = decodeURIComponent(cleaned);
    } catch (_) {}
  }
  return cleaned.normalize("NFC").trim() || "Sem nome";
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: null,
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
