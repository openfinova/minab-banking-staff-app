import { describe, it, expect } from "vitest";
import { serializeQuery, withPaging } from "@/lib/api/query";

describe("serializeQuery", () => {
  it("returns empty string when no params", () => {
    expect(serializeQuery(undefined)).toBe("");
    expect(serializeQuery({})).toBe("");
  });

  it("ignores null and undefined values", () => {
    expect(serializeQuery({ a: null, b: undefined, c: "1" })).toBe("?c=1");
  });

  it("serialises arrays as repeated keys", () => {
    expect(serializeQuery({ sort: ["a,asc", "b,desc"] })).toBe("?sort=a%2Casc&sort=b%2Cdesc");
  });

  it("encodes Date as ISO string", () => {
    const d = new Date(Date.UTC(2026, 0, 1));
    expect(serializeQuery({ from: d })).toBe(`?from=${encodeURIComponent(d.toISOString())}`);
  });

  it("supports paging shorthand", () => {
    const query = withPaging({ filter: "x" }, { page: 2, size: 25, sort: "id,desc" });
    expect(query.page).toBe(2);
    expect(query.size).toBe(25);
    expect(query.sort).toBe("id,desc");
    expect(query.filter).toBe("x");
  });
});
