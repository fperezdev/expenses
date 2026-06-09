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

import {
  isLoggedIn, clearAuth,
  isSyncEnabled, setSyncEnabled,
  getSyncIntervalMs, setSyncIntervalHours,
  getSyncStatus, getAuthToken,
} from "../sync";

describe("sync config", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("isLoggedIn returns false by default", () => {
    expect(isLoggedIn()).toBe(false);
  });

  it("isLoggedIn returns false after clearAuth", () => {
    localStorageMock.setItem("auth_token", "fake-token");
    expect(isLoggedIn()).toBe(true);
    clearAuth();
    expect(isLoggedIn()).toBe(false);
  });

  it("isSyncEnabled returns false by default", () => {
    expect(isSyncEnabled()).toBe(false);
  });

  it("setSyncEnabled roundtrip", () => {
    setSyncEnabled(true);
    expect(isSyncEnabled()).toBe(true);
    setSyncEnabled(false);
    expect(isSyncEnabled()).toBe(false);
  });

  it("getSyncIntervalMs defaults to 24 hours", () => {
    expect(getSyncIntervalMs()).toBe(24 * 60 * 60 * 1000);
  });

  it("setSyncIntervalHours and getSyncIntervalMs roundtrip", () => {
    setSyncIntervalHours(6);
    expect(getSyncIntervalMs()).toBe(6 * 60 * 60 * 1000);
  });

  it("getSyncIntervalMs clamps invalid values to 24h", () => {
    localStorageMock.setItem("sync_interval_hours", "not-a-number");
    expect(getSyncIntervalMs()).toBe(24 * 60 * 60 * 1000);

    localStorageMock.setItem("sync_interval_hours", "-5");
    expect(getSyncIntervalMs()).toBe(24 * 60 * 60 * 1000);

    localStorageMock.setItem("sync_interval_hours", "0");
    expect(getSyncIntervalMs()).toBe(24 * 60 * 60 * 1000);
  });

  it("getSyncStatus returns correct defaults", () => {
    const status = getSyncStatus();
    expect(status.enabled).toBe(false);
    expect(status.loggedIn).toBe(false);
    expect(status.intervalHours).toBe(24);
  });

  it("getAuthToken returns null by default", () => {
    expect(getAuthToken()).toBeNull();
  });
});
