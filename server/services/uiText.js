export function resolveUiText(translations, key, fallback = '') {
  if (!key) return fallback || ''
  return translations?.ui_text_static?.[key]
    || translations?.futures_static?.[key]
    || translations?.chat_ui_text_static?.[key]
    || fallback
    || ''
}
