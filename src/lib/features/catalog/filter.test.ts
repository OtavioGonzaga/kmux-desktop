import { describe, expect, it } from "vitest";
import { filterIdentities } from "./filter";
import type { IdentityDto } from "$lib/types/catalog";

const identities: IdentityDto[] = [
  {
    alias: "github-personal",
    fingerprint: "SHA256:abcdef",
    agent: "bitwarden",
    scopes: ["personal/github"],
    tags: { team: "platform" },
    comment: "Personal GitHub key",
  },
  {
    alias: "aws-prod",
    fingerprint: "SHA256:xyz",
    agent: "openssh",
    scopes: ["company/production"],
    tags: {},
    comment: null,
  },
];

describe("filterIdentities", () => {
  it("filters case-insensitively across alias, agent, scopes and metadata", () => {
    expect(filterIdentities(identities, "GITHUB")).toEqual([identities[0]]);
    expect(filterIdentities(identities, "PLATFORM")).toEqual([identities[0]]);
    expect(filterIdentities(identities, "production")).toEqual([identities[1]]);
  });

  it("returns all identities for an empty query", () => {
    expect(filterIdentities(identities, "  ")).toEqual(identities);
  });
});
