import {
  getSession,
  getCurrentUser,
  getAuthToken,
  isAuthenticated,
  login,
  logout,
} from "@/lib/auth";

describe("auth", () => {
  describe("getSession", () => {
    it("returns a session with user, token, and expiry", () => {
      const session = getSession();
      expect(session).not.toBeNull();
      expect(session?.user).toBeDefined();
      expect(session?.token).toBeDefined();
      expect(session?.expiresAt).toBeDefined();
    });
  });

  describe("getCurrentUser", () => {
    it("returns the mock user", () => {
      const user = getCurrentUser();
      expect(user).not.toBeNull();
      expect(user?.email).toBe("john@acme.com");
      expect(user?.name).toBe("John Doe");
      expect(user?.role).toBe("OWNER");
    });
  });

  describe("getAuthToken", () => {
    it("returns a JWT token string", () => {
      const token = getAuthToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      // JWT format: header.payload.signature
      expect(token?.split(".")).toHaveLength(3);
    });
  });

  describe("isAuthenticated", () => {
    it("returns true for mock session", () => {
      expect(isAuthenticated()).toBe(true);
    });
  });

  describe("login", () => {
    it("returns a session", async () => {
      const session = await login("test@example.com", "password");
      expect(session.user).toBeDefined();
      expect(session.token).toBeDefined();
    });
  });

  describe("logout", () => {
    it("resolves without error", async () => {
      await expect(logout()).resolves.toBeUndefined();
    });
  });
});
