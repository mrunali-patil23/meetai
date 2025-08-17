/**
 * Tests for src/lib/auth.ts
 *
 * Testing framework:
 * - This suite is compatible with Vitest and Jest. It relies on global test functions
 *   (describe/it/expect) and chooses vi/jest dynamically for mocking.
 *
 * Scope covered:
 * - Wires drizzleAdapter(db, { provider: "pg", schema: { ...schema } }) into betterAuth(...)
 * - Passes emailAndPassword.enabled = true
 * - Forwards the adapter result to betterAuth as "database"
 * - Exposes the exact object returned by betterAuth as the exported "auth"
 * - Propagates failures from drizzleAdapter and betterAuth
 */

declare const vi: any;
declare const jest: any;

const mocker: any =
  typeof vi !== "undefined" ? vi :
  (typeof jest !== "undefined" ? jest : undefined);

if (!mocker || (typeof mocker.doMock !== "function" && typeof mocker.mock !== "function")) {
  throw new Error("No supported test mocking framework detected (Vitest or Jest).");
}

const doMock = (moduleName: string, factory: any) => {
  if (typeof mocker.doMock === "function") {
    return mocker.doMock(moduleName, factory);
  }
  return mocker.mock(moduleName, factory);
};

const resetModules = () => {
  if (mocker && typeof mocker.resetModules === "function") mocker.resetModules();
};

const clearAllMocks = () => {
  if (!mocker) return;
  if (typeof mocker.resetAllMocks === "function") mocker.resetAllMocks();
  else if (typeof mocker.clearAllMocks === "function") mocker.clearAllMocks();
};

beforeEach(() => {
  clearAllMocks();
  resetModules();
});

describe("auth configuration (src/lib/auth.ts)", () => {
  it('creates auth by wiring drizzleAdapter(db, { provider: "pg", schema: { ...schema } }) into betterAuth', async () => {
    const dbMock = { _db: true };
    const schemaMock = { user: { id: 1 }, session: { id: 2 } };
    const adapterReturn = { adapter: "drizzle", configured: true };

    const drizzleAdapterCalls: any[] = [];
    const betterAuthCalls: any[] = [];

    // Mock adapter to capture args and return a sentinel adapter object
    doMock("better-auth/adapters/drizzle", () => ({
      drizzleAdapter: (...args: any[]) => {
        drizzleAdapterCalls.push(args);
        return adapterReturn;
      },
    }));

    // Mock betterAuth to capture configuration and return a sentinel auth object
    const authReturn = { __auth__: true };
    doMock("better-auth", () => ({
      betterAuth: (config: any) => {
        betterAuthCalls.push(config);
        return authReturn;
      },
    }));

    // Mock local db and schema dependencies
    doMock("@/db", () => ({ db: dbMock }));
    doMock("@/db/schema", () => ({ ...schemaMock }));

    const mod = await import("./auth");

    // Validate drizzleAdapter was called correctly
    expect(drizzleAdapterCalls.length).toBe(1);
    const [dbArg, optionsArg] = drizzleAdapterCalls[0];
    expect(dbArg).toBe(dbMock);
    expect(optionsArg).toBeDefined();
    expect(optionsArg.provider).toBe("pg");
    expect(optionsArg.schema).toBeDefined();

    // Schema should be a shallow clone (due to spread), not the same reference
    expect(optionsArg.schema).not.toBe(schemaMock);
    // But it should contain the same entries
    expect(optionsArg.schema.user).toBe(schemaMock.user);
    expect(optionsArg.schema.session).toBe(schemaMock.session);

    // Validate betterAuth wiring and returned export
    expect(betterAuthCalls.length).toBe(1);
    const passedConfig = betterAuthCalls[0];

    expect(passedConfig.emailAndPassword).toBeDefined();
    expect(passedConfig.emailAndPassword.enabled).toBe(true);
    expect(passedConfig.database).toBe(adapterReturn);

    // Exported value should be exactly what betterAuth returned
    expect(mod.auth).toBe(authReturn);
  });

  it("propagates an error if drizzleAdapter throws", async () => {
    doMock("better-auth/adapters/drizzle", () => ({
      drizzleAdapter: () => {
        throw new Error("drizzle exploded");
      },
    }));
    doMock("better-auth", () => ({
      betterAuth: (_: any) => ({}),
    }));
    doMock("@/db", () => ({ db: {} }));
    doMock("@/db/schema", () => ({}));

    await expect(import("./auth")).rejects.toThrow(/drizzle exploded/);
  });

  it("propagates an error if betterAuth throws", async () => {
    doMock("better-auth/adapters/drizzle", () => ({
      drizzleAdapter: (_db: any, _opts: any) => ({}),
    }));
    doMock("better-auth", () => ({
      betterAuth: () => {
        throw new Error("betterAuth exploded");
      },
    }));
    doMock("@/db", () => ({ db: {} }));
    doMock("@/db/schema", () => ({}));

    await expect(import("./auth")).rejects.toThrow(/betterAuth exploded/);
  });
});