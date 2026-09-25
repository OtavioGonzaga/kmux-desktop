import type { IdentityDto } from "$lib/types/catalog";

export function filterIdentities(
  identities: IdentityDto[],
  search: string,
): IdentityDto[] {
  const query = search.trim().toLocaleLowerCase();
  if (!query) return identities;

  return identities.filter((identity) =>
    [
      identity.alias,
      identity.agent,
      identity.fingerprint,
      identity.comment ?? "",
      ...identity.scopes,
      ...Object.entries(identity.tags).flat(),
    ].some((value) => value.toLocaleLowerCase().includes(query)),
  );
}
