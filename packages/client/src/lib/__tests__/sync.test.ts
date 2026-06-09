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
  login, register, updateProfile, getUserTimezone,
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

describe("timezone", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.restoreAllMocks();
  });

  it("getUserTimezone returns browser timezone when localStorage is empty", () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
      resolvedOptions: () => ({ timeZone: 'Europe/Madrid' })
    } as any);
    expect(getUserTimezone()).toBe("Europe/Madrid");
  });

  it("getUserTimezone returns stored timezone when localStorage has it", () => {
    localStorageMock.setItem("user_timezone", "America/Santiago");
    expect(getUserTimezone()).toBe("America/Santiago");
  });

  it("register sends timezone from browser", async () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
      resolvedOptions: () => ({ timeZone: 'Europe/Madrid' })
    } as any);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: "test-token",
        user: { id: "1", email: "test@test.com", timezone: "Europe/Madrid", created_at: "" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await register("test@test.com", "password123");
    expect(result.ok).toBe(true);

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody).toHaveProperty("timezone");
    expect(callBody.timezone).toBe("Europe/Madrid");
    expect(localStorageMock.getItem("user_timezone")).toBe("Europe/Madrid");
  });

  it("login saves timezone from server response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: "test-token",
        user: { id: "1", email: "test@test.com", timezone: "America/Lima", created_at: "" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await login("test@test.com", "password123");
    expect(result.ok).toBe(true);
    expect(localStorageMock.getItem("user_timezone")).toBe("America/Lima");
  });

  it("updateProfile sends PATCH with correct headers and body", async () => {
    localStorageMock.setItem("auth_token", "test-token");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        user: { id: "1", timezone: "Europe/Madrid" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateProfile({ timezone: "Europe/Madrid" });
    expect(result).toBe(true);

    const url = fetchMock.mock.calls[0][0];
    const opts = fetchMock.mock.calls[0][1];
    expect(url).toContain("/api/auth/profile");
    expect(opts.method).toBe("PATCH");
    expect(opts.headers["Content-Type"]).toBe("application/json");
    expect(opts.headers["Authorization"]).toBe("Bearer test-token");
    expect(JSON.parse(opts.body)).toEqual({ timezone: "Europe/Madrid" });

    expect(localStorageMock.getItem("user_timezone")).toBe("Europe/Madrid");
  });

  it("updateProfile returns false when not logged in", async () => {
    const result = await updateProfile({ timezone: "UTC" });
    expect(result).toBe(false);
  });

  it("updateProfile returns false when server responds with error", async () => {
    localStorageMock.setItem("auth_token", "test-token");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Server error" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateProfile({ timezone: "UTC" });
    expect(result).toBe(false);
  });
});
