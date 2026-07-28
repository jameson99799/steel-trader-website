export function getPublicTranslationSettings(readOne) {
  const settings = readOne(
    'SELECT multilingual_enabled FROM translation_settings WHERE id = 1'
  )

  return {
    multilingual_enabled: settings?.multilingual_enabled ?? 1
  }
}
