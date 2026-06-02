<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useLang } from './composables/useLang'
import api from './api'

const { initLang, localizedValue } = useLang()

const updateFavicon = (faviconUrl) => {
  const existingFavicon = document.querySelector('link[rel="icon"]')
  if (existingFavicon) existingFavicon.remove()
  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/x-icon'
  link.href = faviconUrl
  document.head.appendChild(link)
}

// Inject a <meta> tag (removes existing with same name first)
function setMeta(name, content, attr = 'name') {
  if (!content) return
  const sel = `meta[${attr}="${name}"]`
  document.querySelector(sel)?.remove()
  const m = document.createElement('meta')
  m.setAttribute(attr, name)
  m.setAttribute('content', content)
  document.head.appendChild(m)
}

// Inject hreflang link tags
function setHreflang(lang, href) {
  if (!lang || !href) return
  const sel = `link[rel="alternate"][hreflang="${lang}"]`
  document.querySelector(sel)?.remove()
  const l = document.createElement('link')
  l.rel = 'alternate'
  l.hreflang = lang
  l.href = href
  document.head.appendChild(l)
}

// Inject / update a JSON-LD script block
function setJsonLd(id, data) {
  document.getElementById(id)?.remove()
  const s = document.createElement('script')
  s.id = id
  s.type = 'application/ld+json'
  s.textContent = JSON.stringify(data, null, 2)
  document.head.appendChild(s)
}

onMounted(async () => {
  initLang()
  try {
    const [company, seo] = await Promise.all([api.getCompany(), api.getSeoSettings()])

    // ── Company / Title ───────────────────────────────────────
    if (company) {
      document.title = localizedValue(company, 'name') || 'SunSea Steel'
      if (company.favicon) updateFavicon(company.favicon)
    }

    // ── GEO Meta Tags ─────────────────────────────────────────
    if (seo) {
      const { geo_region, geo_placename, geo_lat, geo_lng,
              hreflang_en, hreflang_zh,
              local_business_type, local_business_address,
              site_title, site_description } = seo

      if (geo_region)    setMeta('geo.region',    geo_region)
      if (geo_placename) setMeta('geo.placename',  geo_placename)
      if (geo_lat && geo_lng) {
        setMeta('geo.position', `${geo_lat};${geo_lng}`)
        setMeta('ICBM',         `${geo_lat}, ${geo_lng}`)
      }

      // ── hreflang link tags ─────────────────────────────────
      const siteUrl = window.location.origin
      if (hreflang_en) setHreflang(hreflang_en, siteUrl)
      if (hreflang_zh) setHreflang(hreflang_zh, siteUrl)
      setHreflang('x-default', siteUrl)

      // ── LocalBusiness JSON-LD ──────────────────────────────
      if (geo_lat && geo_lng && company) {
        const bizType = local_business_type || 'Manufacturer'
        const bizName = company.name_en || company.name || ''
        const bizEmail = company.email || ''
        const bizPhone = company.phone || ''
        const bizAddr  = local_business_address || company.address_en || company.address || ''

        const jsonLd = {
          '@context': 'https://schema.org',
          '@type': bizType,
          'name': bizName,
          'description': site_description || company.description_en || company.description || '',
          'url': siteUrl,
          ...(bizEmail && { 'email': bizEmail }),
          ...(bizPhone && { 'telephone': bizPhone }),
          ...(bizAddr && {
            'address': {
              '@type': 'PostalAddress',
              'streetAddress': bizAddr,
              'addressCountry': geo_region?.split('-')[0] || 'CN'
            }
          }),
          'geo': {
            '@type': 'GeoCoordinates',
            'latitude': parseFloat(geo_lat),
            'longitude': parseFloat(geo_lng)
          },
          ...(company.logo && { 'logo': company.logo })
        }
        setJsonLd('local-business-jsonld', jsonLd)
      }
    }
  } catch (e) { console.error('App init error:', e) }
})
</script>
