import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/user.model.js", () => ({
  default: { findById: vi.fn() },
}));

vi.mock("../models/session.model.js", () => ({
  default: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
}));

import Session from "../models/session.model.js";
import User from "../models/user.model.js";
import { rotateSession } from "../services/auth.service.js";
import { generateRefreshToken, hashToken } from "../services/token.service.js";

const fakeReq = {
  get: (name) => (name === "user-agent" ? "vitest" : null),
  ip: "127.0.0.1",
};

const activeSession = (overrides = {}) => ({
  _id: "session-1",
  familyId: "family-1",
  userId: "user-1",
  revokedAt: null,
  replacedByTokenHash: null,
  expiresAt: new Date(Date.now() + 60_000),
  ...overrides,
});

describe("rotateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when no refresh token is supplied", async () => {
    await expect(rotateSession({ rawRefreshToken: undefined, req: fakeReq })).rejects.toMatchObject({
      status: 401,
      code: "SESSION_EXPIRED",
    });
  });

  it("rejects unknown sessions without touching the family", async () => {
    Session.findOne.mockResolvedValue(null);

    await expect(rotateSession({ rawRefreshToken: "unknown", req: fakeReq })).rejects.toMatchObject({
      status: 401,
    });
    expect(Session.updateMany).not.toHaveBeenCalled();
  });

  it("revokes the whole family when a revoked token is reused", async () => {
    Session.findOne.mockResolvedValue(activeSession({ revokedAt: new Date() }));

    await expect(rotateSession({ rawRefreshToken: "reused", req: fakeReq })).rejects.toMatchObject({
      code: "SESSION_EXPIRED",
    });
    expect(Session.updateMany).toHaveBeenCalledWith(
      { familyId: "family-1", revokedAt: null },
      expect.objectContaining({ $set: expect.objectContaining({ revokedAt: expect.any(Date) }) })
    );
  });

  it("revokes the family when the atomic claim loses a race", async () => {
    const raw = generateRefreshToken();
    Session.findOne.mockResolvedValue(activeSession());
    Session.findOneAndUpdate.mockResolvedValue(null);

    await expect(rotateSession({ rawRefreshToken: raw, req: fakeReq })).rejects.toMatchObject({
      code: "SESSION_EXPIRED",
    });
    expect(Session.updateMany).toHaveBeenCalledWith(
      { familyId: "family-1", revokedAt: null },
      expect.any(Object)
    );
  });

  it("rotates the token and stores only a hash", async () => {
    const raw = generateRefreshToken();
    Session.findOne.mockResolvedValue(activeSession());
    Session.findOneAndUpdate.mockResolvedValue(activeSession({ revokedAt: new Date() }));
    Session.create.mockResolvedValue({});
    User.findById.mockResolvedValue({
      _id: "user-1",
      role: "user",
      status: "active",
      tokenVersion: 0,
    });

    const result = await rotateSession({ rawRefreshToken: raw, req: fakeReq });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.refreshToken).not.toBe(raw);
    expect(Session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: hashToken(result.refreshToken),
        familyId: "family-1",
        userId: "user-1",
      })
    );
    expect(Session.create.mock.calls[0][0].tokenHash).not.toBe(result.refreshToken);
  });

  it("rejects when the session owner is suspended", async () => {
    const raw = generateRefreshToken();
    Session.findOne.mockResolvedValue(activeSession());
    Session.findOneAndUpdate.mockResolvedValue(activeSession({ revokedAt: new Date() }));
    User.findById.mockResolvedValue({
      _id: "user-1",
      role: "user",
      status: "suspended",
      tokenVersion: 0,
    });

    await expect(rotateSession({ rawRefreshToken: raw, req: fakeReq })).rejects.toMatchObject({
      status: 401,
    });
    expect(Session.create).not.toHaveBeenCalled();
  });
});
