import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Can } from "@/components/rbac/can";

vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({
    can: (required: string[], mode: "all" | "any" = "all") => {
      const granted = ["admin:users:read"];
      const set = new Set(granted);
      return mode === "all"
        ? required.every((p) => set.has(p))
        : required.some((p) => set.has(p));
    },
  }),
}));

describe("Can", () => {
  it("renders children when permission is granted", () => {
    render(
      <Can permissions={["admin:users:read"]}>
        <span>visible</span>
      </Can>,
    );
    expect(screen.getByText("visible")).toBeInTheDocument();
  });

  it("hides children and renders fallback when denied", () => {
    render(
      <Can
        permissions={["admin:users:write"]}
        fallback={<span>denied</span>}
      >
        <span>secret</span>
      </Can>,
    );
    expect(screen.queryByText("secret")).toBeNull();
    expect(screen.getByText("denied")).toBeInTheDocument();
  });
});
