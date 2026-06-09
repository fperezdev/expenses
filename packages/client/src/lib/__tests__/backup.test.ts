import { describe, it, expect, beforeEach, vi } from "vitest";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

import { isBackupEnabled, isBackupDue, getBackupInfo, performBackupDownload } from "../backup";

describe("backup", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("isBackupEnabled defaults to false", () => {
    expect(isBackupEnabled()).toBe(false);
  });

  it("isBackupEnabled reads from localStorage", () => {
    localStorageMock.setItem("backup_enabled", "true");
    expect(isBackupEnabled()).toBe(true);
  });

  it("isBackupDue returns false when disabled", () => {
    expect(isBackupDue()).toBe(false);
  });

  it("isBackupDue returns true when enabled and never backed up", () => {
    localStorageMock.setItem("backup_enabled", "true");
    expect(isBackupDue()).toBe(true);
  });

  it("getBackupInfo returns defaults", () => {
    const info = getBackupInfo();
    expect(info.enabled).toBe(false);
    expect(info.due).toBe(false);
    expect(info.intervalHours).toBe(24);
    expect(info.lastBackupTs).toBe(0);
  });

  it("performBackupDownload returns false when worker not initialized", async () => {
    // DB not initialized, should fail gracefully
    const result = await performBackupDownload();
    expect(result).toBe(false);
  });
});
