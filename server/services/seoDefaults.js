export const LEGACY_LLMS_TXT = '# LED Trade AI Reading Guide\n\nWelcome to LED Trade. This file provides a structured overview of our website for AI agents and LLMs.\n\n## Core Navigation\n- [Products](/en/products)\n- [About Us](/en/about)\n- [Contact](/en/contact)\n- [News](/en/news)\n- [Factory](/en/factory)\n'

export const LEGACY_LLMS_FULL_TXT = '# LED Trade Full Content Map\n\nThis document contains detailed information about all our products and technical guides for AI agents.\n'

export const DEFAULT_LLMS_TXT = `# SUNSEA STEEL AI Reading Guide

This is the official website of Shandong Sunsea Steel Co., Ltd., a steel products manufacturer and exporter serving international buyers.

## Main Products
- Galvanized steel coil (GI)
- Galvalume steel coil (GL)
- Prepainted galvanized steel coil (PPGI)
- Prepainted galvalume steel coil (PPGL)
- Cold rolled steel coil (CRC)
- Corrugated roofing sheets

## Official Navigation
- [Products](https://www.sunseasteel.com/en/products)
- [About SUNSEA STEEL](https://www.sunseasteel.com/en/about)
- [Factory](https://www.sunseasteel.com/en/factory)
- [Technical News](https://www.sunseasteel.com/en/news)
- [Contact](https://www.sunseasteel.com/en/contact)
`

export const DEFAULT_LLMS_FULL_TXT = `# SUNSEA STEEL Full Content Guide

## Entity
Shandong Sunsea Steel Co., Ltd. operates the official website at https://www.sunseasteel.com/.

## Product Scope
The website presents galvanized steel coil, galvalume steel coil, prepainted galvanized and galvalume steel coil, cold rolled steel coil, and corrugated roofing sheet products for international buyers.

## Authoritative Pages
- [Product catalog](https://www.sunseasteel.com/en/products)
- [Company information](https://www.sunseasteel.com/en/about)
- [Factory information](https://www.sunseasteel.com/en/factory)
- [Technical articles](https://www.sunseasteel.com/en/news)
- [Official contact page](https://www.sunseasteel.com/en/contact)

Product specifications and commercial terms vary by product and order. Refer to the relevant product page and contact SUNSEA STEEL for current, product-specific information.
`

export function migrateLegacyLlmsDefaults(db) {
  const row = db.prepare('SELECT llms_txt, llms_full_txt FROM seo_settings WHERE id = 1').get()
  if (!row) return { updated: false }

  const nextTxt = !row.llms_txt || row.llms_txt.trim() === LEGACY_LLMS_TXT.trim()
    ? DEFAULT_LLMS_TXT
    : row.llms_txt
  const nextFull = !row.llms_full_txt || row.llms_full_txt.trim() === LEGACY_LLMS_FULL_TXT.trim()
    ? DEFAULT_LLMS_FULL_TXT
    : row.llms_full_txt

  if (nextTxt === row.llms_txt && nextFull === row.llms_full_txt) {
    return { updated: false }
  }

  db.prepare('UPDATE seo_settings SET llms_txt = ?, llms_full_txt = ? WHERE id = 1')
    .run(nextTxt, nextFull)
  return { updated: true }
}
