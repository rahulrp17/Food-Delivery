import { describe, expect, it, vi } from "vitest";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  STAFF_ROLES,
  resolvePermissions,
} from "../config/permissions.js";
import { requirePermission } from "../middleware/requirePermission.js";

describe("resolvePermissions", () => {
  it("returns no permissions for non-admin users", () => {
    expect(resolvePermissions({ role: "user" })).toEqual([]);
    expect(resolvePermissions(null)).toEqual([]);
  });

  it("grants every permission to an admin without a staff role", () => {
    const permissions = resolvePermissions({ role: "admin" });
    expect(permissions).toEqual(ALL_PERMISSIONS);
  });

  it("maps staff roles to scoped permissions", () => {
    const manager = resolvePermissions({ role: "admin", staffRole: STAFF_ROLES.MANAGER });
    expect(manager).toEqual([...ROLE_PERMISSIONS[STAFF_ROLES.MANAGER]]);
    expect(manager).not.toContain(PERMISSIONS.STAFF_WRITE);
    expect(manager).not.toContain(PERMISSIONS.SETTINGS_WRITE);

    const support = resolvePermissions({ role: "admin", staffRole: STAFF_ROLES.SUPPORT });
    expect(support).toContain(PERMISSIONS.ORDERS_WRITE);
    expect(support).not.toContain(PERMISSIONS.CATALOG_WRITE);
    expect(support).not.toContain(PERMISSIONS.COUPONS_WRITE);
  });

  it("uses explicit permissions and drops unknown values", () => {
    const permissions = resolvePermissions({
      role: "admin",
      staffRole: STAFF_ROLES.SUPPORT,
      permissions: [PERMISSIONS.CATALOG_WRITE, "unknown:permission"],
    });

    expect(permissions).toEqual([PERMISSIONS.CATALOG_WRITE]);
  });
});

describe("requirePermission middleware", () => {
  const run = (user, permission) => {
    const req = { user };
    const next = vi.fn();
    requirePermission(permission)(req, {}, next);
    return next;
  };

  it("allows an authorized admin", () => {
    const next = run({ role: "admin", staffRole: STAFF_ROLES.MANAGER }, PERMISSIONS.ORDERS_WRITE);
    expect(next).toHaveBeenCalledWith();
  });

  it("blocks a staff member missing the permission", () => {
    const next = run({ role: "admin", staffRole: STAFF_ROLES.SUPPORT }, PERMISSIONS.CATALOG_WRITE);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeTruthy();
    expect(next.mock.calls[0][0].status).toBe(403);
  });

  it("rejects unauthenticated requests with 401", () => {
    const next = run(undefined, PERMISSIONS.OVERVIEW_READ);
    expect(next.mock.calls[0][0].status).toBe(401);
  });
});
