import { describe, it, expect } from "vitest";
import { ApiError, describeApiError } from "@/lib/api/errors";

describe("ApiError", () => {
  it("flags HTTP status helpers correctly", () => {
    const err = new ApiError("Bad", 400, { status: 400 });
    expect(err.isValidation).toBe(true);
    expect(err.isUnauthorized).toBe(false);
    expect(new ApiError("x", 401, { status: 401 }).isUnauthorized).toBe(true);
    expect(new ApiError("x", 403, { status: 403 }).isForbidden).toBe(true);
    expect(new ApiError("x", 404, { status: 404 }).isNotFound).toBe(true);
    expect(new ApiError("x", 409, { status: 409 }).isConflict).toBe(true);
    expect(new ApiError("x", 500, { status: 500 }).isServer).toBe(true);
  });

  it("normalises array-style field errors", () => {
    const err = new ApiError("v", 400, {
      status: 400,
      errors: [
        { field: "username", defaultMessage: "Required" },
        { field: "email", message: "Bad email" },
      ],
    });
    expect(err.fieldErrors).toEqual({ username: "Required", email: "Bad email" });
  });

  it("describeApiError returns best message", () => {
    const err = new ApiError("fallback", 400, { status: 400, detail: "Detailed" });
    expect(describeApiError(err)).toBe("Detailed");
    expect(describeApiError(new Error("plain"))).toBe("plain");
    expect(describeApiError("nope")).toBe("Unexpected error");
  });
});
