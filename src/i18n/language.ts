export const supportedLanguages = ["pt-BR", "en-US", "es", "de"] as const;
export type AppLanguage = (typeof supportedLanguages)[number];

export function resolveLanguage(language: string | undefined): AppLanguage {
  if (!language) return "en-US";
  const exact = supportedLanguages.find(
    (candidate) => candidate.toLowerCase() === language.toLowerCase(),
  );
  if (exact) return exact;
  const base = language.toLowerCase().split("-")[0];
  return (
    supportedLanguages.find((candidate) => candidate.toLowerCase().split("-")[0] === base) ??
    "en-US"
  );
}

export function detectSystemLanguage(
  languages: readonly string[] = navigator.languages,
): AppLanguage {
  for (const language of languages) {
    const resolved = resolveLanguage(language);
    if (resolved !== "en-US" || language.toLowerCase().startsWith("en")) return resolved;
  }
  return "en-US";
}
