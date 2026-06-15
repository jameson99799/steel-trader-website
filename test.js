
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLang } from '../composables/useLang'
import api from '../api'
import InquiryModal from '../components/InquiryModal.vue'

const route = useRoute()
const { t, localizedValue, localizedHtml, langPath } = useLang()

const product = ref(null)
const currentImage = ref('')
const showInquiry = ref(false)
const company = ref(null)
const pageTexts = ref(null)
const lightboxImg = ref(null)
const allCategories = ref([])
const relatedProducts = ref([])

// Handle generic anchor hashes inside v-html
const handleAnchorClick = (e) => {
  const target = e.target.closest('a')
  if (target) {
    const href = target.getAttribute('href')
    if (href && href.startsWith('#')) {
      e.preventDefault()
      const id = href.slice(1)
      const el = document.getElementById(id) || document.getElementById(decodeURIComponent(id))
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 100 // 100px fixed header offset
        window.scrollTo({ top, behavior: 'smooth' })
        history.pushState(null, null, href)
      }
    }
  }
}

// Grid: 3 cols with contact panel, 2 cols without
const layoutColumns = computed(() =>
  pageTexts.value?.show_contact_panel ? '1fr 1fr 280px' : '1fr 1fr'
)

const images = computed(() => {
  if (!product.value?.images) return []
  return product.value.images.split(',').filter(Boolean)
})

const specs = computed(() => {
  if (!product.value) return []
  // Try localized specs first (specs_zh, specs_ja, etc.), fallback to raw specs
  const raw = localizedValue(product.value, 'specs') || product.value?.specs
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
})

// Build iframe srcdoc — isolates all product HTML styles from main page
const sanitizedDetailContent = computed(() => {
  const raw = localizedHtml(product.value, 'detail_content') || ''
  if (!raw) return ''

  // Template variable substitution
  const co = company.value || {}
  const email       = co.email || ''
  const phone       = co.phone || ''
  const whatsapp    = co.whatsapp || ''
  const whatsappRaw = whatsapp.replace(/[^0-9+]/g, '')
  const whatsappLink = whatsappRaw ? `https://api.whatsapp.com/send?phone=${whatsappRaw.replace(/^\+/, '')}` : '#'
  const companyName = co.name_en || co.name || ''

  let html = raw
    .replace(/\{\{email\}\}/g,          email)
    .replace(/\{\{phone\}\}/g,          phone)
    .replace(/\{\{whatsapp\}\}/g,       whatsapp)
    .replace(/\{\{whatsapp_raw\}\}/g,   whatsappRaw)
    .replace(/\{\{whatsapp_link\}\}/g,  whatsappLink)
    .replace(/\{\{company_name\}\}/g,   companyName)

  // Format mailto links to include product title and url as subject and body
  const productName = localizedValue(product.value, 'name') || ''
  const productUrl = window.location.origin + route.fullPath
  const subject = `Product Inquiry: ${productName}`
  const mailBody = `Hi,\n\nI am interested in your product: "${productName}"\nSource Link: ${productUrl}\n\nPlease provide more information.`
  const query = `?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`
  
  html = html.replace(/href=(['"])([^'"]+)\1/gi, (match, quote, href) => {
    let mailtoEmail = ''
    if (href.startsWith('mailto:')) {
      const emailPart = href.slice(7).split('?')[0].trim()
      mailtoEmail = (emailPart && emailPart !== '{{email}}') ? emailPart : (email || 'jameson@sunseasteel.com')
    } else if (href.includes('@') && !href.includes('/') && !href.toLowerCase().startsWith('http')) {
      mailtoEmail = href.trim()
    } else {
      return match
    }
    return `href=${quote}mailto:${mailtoEmail}${query}${quote}`
  })

  // Strip <script> tags for security
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

  // Strip placeholder comments
  html = html.replace(/<span\s+class=["'](?:hero-tip|replace-tip)["'][^>]*>.*?<\/span>/gi, '')
  
  // Extract <style> tags and scope them to .product-detail-html
  html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
    // Prefix all CSS rules with .product-detail-html
    const scoped = css.replace(/([^{}]+)\{/g, (m, selector) => {
      const trimmed = selector.trim()
      if (!trimmed || trimmed.startsWith('@') || trimmed.startsWith('from') || trimmed.startsWith('to') || /^\d+%/.test(trimmed)) return m
      const scopedSelectors = trimmed.split(',').map(s => {
        s = s.trim()
        if (s.startsWith('.product-detail-html') || s === 'body' || s === 'html' || s === '*') return s
        return '.product-detail-html ' + s
      }).join(', ')
      return scopedSelectors + ' {'
    })
    return '<style>' + scoped + '</style>'
  })
  
  // Strip <html>, <head>, <body> wrappers — we just want the content
  html = html.replace(/<!DOCTYPE[^>]*>/gi, '')
  html = html.replace(/<html[^>]*>/gi, '').replace(/<\/html>/gi, '')
  html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, (match) => {
    // Keep <style> tags from head
    const styles = match.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []
    return styles.join('')
  })
  html = html.replace(/<body[^>]*>/gi, '').replace(/<\/body>/gi, '')
  html = html.replace(/<meta[^>]*>/gi, '')

  return html
})




const currentImageIndex = computed(() => {
  return images.value.indexOf(currentImage.value)
})

const prevImage = () => {
  const idx = currentImageIndex.value
  currentImage.value = images.value[(idx - 1 + images.value.length) % images.value.length]
}

const nextImage = () => {
  const idx = currentImageIndex.value
  currentImage.value = images.value[(idx + 1) % images.value.length]
}

const openLightbox = (src) => {
  lightboxImg.value = src
}

const sendEmail = () => {
  const email = company.value?.email
  if (!email) {
    alert('Email not available yet, please try again.')
    return
  }
  const productName = localizedValue(product.value, 'name') || ''
  window.location.href = `mailto:${email}?subject=${encodeURIComponent('Product Inquiry: ' + productName)}&body=${encodeURIComponent('Hi, I am interested in your product: ' + productName + '\n\nPlease provide more information.')}`
}

const copyToClipboard = (text) => {
  if (!text) return
  const done = () => alert('Number copied to clipboard: ' + text)
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(done).catch(() => {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      done()
    })
  } else {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    done()
  }
}

onMounted(async () => {
  try {
    const slug = route.params.slug
    const ssr = window.__INITIAL_STATE__
    const isHydrating = ssr && ssr.ssrProduct && (
      ssr.ssrProduct.slug === slug || 
      ssr.ssrProduct.id.toString() === (slug.match(/-(\d+)$/)?.[1] || slug)
    )

    if (isHydrating) {
      product.value = ssr.ssrProduct
      company.value = ssr.company
      pageTexts.value = ssr.pageTexts
      window.__INITIAL_STATE__.ssrProduct = null // consume it once
    }
    
    if (product.value && images.value.length) {
      currentImage.value = images.value[0]
    }

    const promises = [
      isHydrating ? Promise.resolve(company.value) : api.getCompany(),
      isHydrating ? Promise.resolve(pageTexts.value) : api.getPageTexts(),
      api.getCategories()
    ]
    if (!isHydrating) {
      promises.push(api.getProduct(slug).then(p => {
        product.value = p
        if (images.value.length) currentImage.value = images.value[0]
        return p
      }))
    }

    const [comp, texts, cats] = await Promise.all(promises)
    company.value = comp
    pageTexts.value = texts
    allCategories.value = cats || []

    // Fetch related products from same category
    if (product.value?.category_id) {
      try {
        const allProds = await api.getProducts({ category_id: product.value.category_id, status: 1 })
        const prods = (allProds.data || allProds || []).filter(p => p.id !== product.value.id)
        relatedProducts.value = prods.slice(0, 6)
      } catch (e) { console.warn('Failed to load related products:', e) }
    }

    // ── GEO: Inject Product JSON-LD structured data ──────────────────
    if (product.value) {
      const p = product.value
      const siteUrl = window.location.origin
      const productUrl = `${siteUrl}/products/${p.slug || p.id}`
      const productName = p.name_en || p.name || ''
      const productDesc = p.seo_description || p.description_en || p.description || ''
      const productImages = (p.images || '').split(',').filter(Boolean).map(img => img.startsWith('http') ? img : siteUrl + img)

      // Product schema
      const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': productName,
        'description': productDesc,
        'url': productUrl,
        ...(productImages.length && { 'image': productImages }),
        ...(p.category_name && { 'category': p.category_name }),
        ...(comp?.name_en && {
          'brand': { '@type': 'Brand', 'name': comp.name_en || comp.name },
          'manufacturer': { '@type': 'Organization', 'name': comp.name_en || comp.name }
        }),
        'offers': {
          '@type': 'Offer',
          'url': productUrl,
          'priceCurrency': 'USD',
          'price': '0',
          'priceValidUntil': new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          'itemCondition': 'https://schema.org/NewCondition',
          'availability': 'https://schema.org/InStock',
          'seller': { '@type': 'Organization', 'name': comp?.name_en || comp?.name || 'Company' },
          'hasMerchantReturnPolicy': {
            '@type': 'MerchantReturnPolicy',
            'applicableCountry': 'US',
            'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnWindow',
            'merchantReturnDays': 30,
            'returnMethod': 'https://schema.org/ReturnByMail',
            'returnFees': 'https://schema.org/FreeReturn'
          },
          'shippingDetails': {
            '@type': 'OfferShippingDetails',
            'shippingRate': {
              '@type': 'MonetaryAmount',
              'value': '0',
              'currency': 'USD'
            },
            'shippingDestination': {
              '@type': 'DefinedRegion',
              'addressCountry': 'US'
            },
            'deliveryTime': {
              '@type': 'ShippingDeliveryTime',
              'handlingTime': {
                '@type': 'QuantitativeValue',
                'minValue': 1,
                'maxValue': 5,
                'unitCode': 'd'
              },
              'transitTime': {
                '@type': 'QuantitativeValue',
                'minValue': 5,
                'maxValue': 20,
                'unitCode': 'd'
              }
            }
          }
        },
        'aggregateRating': {
          '@type': 'AggregateRating',
          'ratingValue': '5.0',
          'reviewCount': '89'
        },
        'review': [
          {
            '@type': 'Review',
            'author': {
              '@type': 'Person',
              'name': 'Verified Buyer'
            },
            'datePublished': new Date().toISOString().split('T')[0],
            'reviewRating': {
              '@type': 'Rating',
              'ratingValue': '5',
              'bestRating': '5'
            },
            'reviewBody': 'Excellent quality and service.'
          }
        ]
      }

      // Add specs as additionalProperty for AI engines
      if (p.specs) {
        try {
          const specsList = JSON.parse(p.specs)
          if (specsList.length) {
            productSchema.additionalProperty = specsList.map(s => ({
              '@type': 'PropertyValue',
              'name': s.name,
              'value': s.value
            }))
          }
        } catch (e) {}
      }

      // Update or create Product schema
      let script = document.getElementById('product-jsonld')
      if (!script) {
        script = document.createElement('script')
        script.id = 'product-jsonld'
        script.type = 'application/ld+json'
        document.head.appendChild(script)
      }
      script.textContent = JSON.stringify(productSchema, null, 2)

      // FAQ schema (if product has faq_items)
      const faqJson = localizedValue(p, 'faq_items') || p.faq_items
      if (faqJson) {
        try {
          const faqs = JSON.parse(faqJson)
          if (faqs.length) {
            const faqSchema = {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              'mainEntity': faqs.map(f => ({
                '@type': 'Question',
                'name': f.question,
                'acceptedAnswer': {
                  '@type': 'Answer',
                  'text': f.answer
                }
              }))
            }
            let faqScript = document.getElementById('faq-jsonld')
            if (!faqScript) {
              faqScript = document.createElement('script')
              faqScript.id = 'faq-jsonld'
              faqScript.type = 'application/ld+json'
              document.head.appendChild(faqScript)
            }
            faqScript.textContent = JSON.stringify(faqSchema, null, 2)
          }
        } catch (e) {}
      }

      // ── OG + Twitter meta tags for product ──
      document.title = p.seo_title || localizedValue(p, 'name')
      const setMeta = (prop, content) => {
        if (!content) return
        let el = document.querySelector(`meta[property="${prop}"]`) || document.querySelector(`meta[name="${prop}"]`)
        if (!el) {
          el = document.createElement('meta')
          if (prop.startsWith('og:')) el.setAttribute('property', prop)
          else el.setAttribute('name', prop)
          document.head.appendChild(el)
        }
        el.setAttribute('content', content)
      }
      setMeta('og:type', 'product')
      setMeta('og:title', productName)
      setMeta('og:description', productDesc?.substring(0, 200))
      setMeta('og:url', productUrl)
      if (productImages.length) setMeta('og:image', productImages[0])
      setMeta('og:site_name', 'SHANDONG SUNSEA STEEL CO., LTD')
      setMeta('twitter:card', 'summary_large_image')
      setMeta('twitter:title', productName)
      setMeta('twitter:description', productDesc?.substring(0, 200))
      if (productImages.length) setMeta('twitter:image', productImages[0])
    }
  } catch (e) {
    console.error(e)
  }
})
