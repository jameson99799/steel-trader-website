// Homepage FAQ pairs, shared by the SSR schema, the visible home page and the
// public /api/pagetexts/home-faq endpoint so all three always match.
//
// English/Chinese are built in. Other languages read AI translations from the
// translations table (content_type='home_faq', fields faq_q_N / faq_a_N); when
// at least one entry is actually translated the whole list is switched over,
// otherwise the English defaults are kept.

export const DEFAULT_HOME_FAQS = Object.freeze({
  zh: Object.freeze([
    ['你们是工厂还是贸易公司？', '我们是位于山东的源头工厂，集冷轧、镀锌、镀铝锌和彩涂生产线于一体，支持厂家直供与定制规格。'],
    ['可以邮寄样品或进行打样吗？', '可以。您可以提供目标规格（厚度、宽度、锌层、颜色、数量），我们支持小批量试单与样品确认。'],
    ['最小起订量（MOQ）是多少？', '常规产品 MOQ 灵活，可按集装箱整柜出货；首次合作可协商试单数量。'],
    ['如何获得 FOB / CIF 报价？', '请提供规格、材质、涂层、尺寸与目标港口，我们将在工作日内发送正式报价单。'],
    ['有哪些认证与质检？', '产品符合 ASTM / JIS / EN 等标准，出厂前经过全流程质检，可提供材质单与第三方可选检验。']
  ]),
  en: Object.freeze([
    ['Are you a manufacturer or a trading company?', 'We are an origin factory in Shandong with cold rolling, galvanizing, galvalume and color coating lines, supporting factory-direct supply and custom specifications.'],
    ['Can I get samples or a trial order?', 'Yes. Provide your target specification (thickness, width, coating, color, quantity); we support small-batch trial orders and sample confirmation.'],
    ['What is the minimum order quantity (MOQ)?', 'For standard products the MOQ is flexible, usually a full container; first-time cooperation can be negotiated with a trial quantity.'],
    ['How do I get an FOB or CIF quote?', 'Send your specification, material, coating, dimensions and target port, and we will issue a formal quotation within one working day.'],
    ['What certifications and quality control do you have?', 'Products comply with ASTM / JIS / EN standards, pass full-process QC before shipment, and material certificates plus third-party inspection are available on request.']
  ])
})

export function resolveHomeFaqs(readOne, lang = 'en') {
  const defaults = DEFAULT_HOME_FAQS[lang] || DEFAULT_HOME_FAQS.en
  if (lang === 'en' || lang === 'zh') return defaults.map(pair => [...pair])

  try {
    const translatedFaqs = defaults.map(([fallbackQ, fallbackA], i) => {
      const qRow = readOne('SELECT translated_text FROM translations WHERE content_type=? AND content_id=1 AND content_field=? AND language_code=?', ['home_faq', `faq_q_${i}`, lang])
      const aRow = readOne('SELECT translated_text FROM translations WHERE content_type=? AND content_id=1 AND content_field=? AND language_code=?', ['home_faq', `faq_a_${i}`, lang])
      return [qRow?.translated_text || fallbackQ, aRow?.translated_text || fallbackA]
    })
    if (translatedFaqs.some(([q], i) => q && q !== defaults[i][0])) {
      return translatedFaqs
    }
  } catch (e) { /* fall back to English defaults */ }

  return defaults.map(pair => [...pair])
}
