type ResourceMap = Record<string, unknown>;

export interface LocaleLike {
  languageCode?: string | null;
  languageTag?: string | null;
}

export function resolveLanguageFromLocales(
  locales: LocaleLike[],
  availableResources: ResourceMap,
): string {
  for (const locale of locales) {
    const normalizedLanguageCode = locale.languageCode?.toLowerCase();
    const normalizedLanguageTag = locale.languageTag?.toLowerCase();
    const fromLanguageTag = normalizedLanguageTag?.split('-')[0];

    const candidates = [normalizedLanguageCode, fromLanguageTag];
    for (const candidate of candidates) {
      if (candidate && availableResources[candidate]) {
        return candidate;
      }
    }
  }

  return 'en';
}
