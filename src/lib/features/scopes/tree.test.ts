import { describe, expect, it } from "vitest";
import type { IdentityDto } from "../../types/catalog";
import { buildScopeTree, identityMatchesScope } from "./tree";

const identity = (alias: string, scopes: string[]): IdentityDto => ({
  alias,
  fingerprint: `SHA256:${alias}`,
  agent: "agent",
  scopes,
  tags: {},
  comment: null,
});

describe("scope tree", () => {
  it("derives sorted ancestors and counts each identity once per branch", () => {
    const tree = buildScopeTree([
      identity("z", ["company/prod", "company/staging"]),
      identity("a", ["personal"]),
    ]);
    expect(tree.map(({ path, count }) => [path, count])).toEqual([
      ["company", 1],
      ["personal", 1],
    ]);
    expect(tree[0].children.map(({ path }) => path)).toEqual(["company/prod", "company/staging"]);
  });

  it("matches only the selected scope and its descendants", () => {
    const company = identity("work", ["company/prod"]);
    expect(identityMatchesScope(company, "company")).toBe(true);
    expect(identityMatchesScope(company, "company/prod")).toBe(true);
    expect(identityMatchesScope(company, "comp")).toBe(false);
    expect(identityMatchesScope(company, "personal")).toBe(false);
  });
});
