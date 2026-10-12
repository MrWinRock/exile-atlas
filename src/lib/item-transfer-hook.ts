"use client";
import { useMemo, useSyncExternalStore } from "react";
import type { ItemTransfer } from "./item-transfer";
const key = "exile-atlas-item-transfer-v1";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("item-transfer", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("item-transfer", callback);
  };
}
const snapshot = () => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
export function useItemTransfer() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  return useMemo(() => {
    if (!raw) return { transfer: undefined, error: "" };
    try {
      const value = JSON.parse(raw);
      if (
        value.version !== 1 ||
        typeof value.itemText !== "string" ||
        new TextEncoder().encode(value.itemText).length > 65536
      )
        throw new Error("Invalid item transfer");
      return { transfer: value as ItemTransfer, error: "" };
    } catch {
      return { transfer: undefined, error: "Unreadable item transfer retained; paste manually." };
    }
  }, [raw]);
}
export function clearItemTransfer() {
  sessionStorage.removeItem(key);
  window.dispatchEvent(new Event("item-transfer"));
}
