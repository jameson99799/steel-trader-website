import { Router } from 'express'
import { getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/', (req, res) => {
  const texts = getOne('SELECT * FROM page_texts WHERE id = 1')
  res.json(texts || {})
})

router.put('/', authMiddleware, (req, res) => {
  const texts = getOne('SELECT * FROM page_texts WHERE id = 1')
  const {
    logo_subtitle,
    featured_subtitle, featured_subtitle_en,
    categories_subtitle, categories_subtitle_en,
    advantages_subtitle, advantages_subtitle_en,
    cta_title, cta_title_en,
    cta_subtitle, cta_subtitle_en,
    products_page_subtitle, products_page_subtitle_en,
    contact_page_title, contact_page_title_en,
    contact_page_subtitle, contact_page_subtitle_en,
    contact_form_desc, contact_form_desc_en,
    inquiry_panel_title, inquiry_panel_title_en,
    contact_tagline, contact_tagline_en,
    about_overlay_text, about_overlay_text_en,
    about_tagline, about_tagline_en,
    about_cta_subtitle, about_cta_subtitle_en,
    about_iso, about_iso_en,
    about_global, about_global_en,
    about_innovation, about_innovation_en,
    inquiry_subtitle, inquiry_subtitle_en
  } = req.body

  const params = [
    logo_subtitle,
    featured_subtitle, featured_subtitle_en,
    categories_subtitle, categories_subtitle_en,
    advantages_subtitle, advantages_subtitle_en,
    cta_title, cta_title_en,
    cta_subtitle, cta_subtitle_en,
    products_page_subtitle, products_page_subtitle_en,
    contact_page_title, contact_page_title_en,
    contact_page_subtitle, contact_page_subtitle_en,
    contact_form_desc, contact_form_desc_en,
    inquiry_panel_title, inquiry_panel_title_en,
    contact_tagline, contact_tagline_en,
    about_overlay_text, about_overlay_text_en,
    about_tagline, about_tagline_en,
    about_cta_subtitle, about_cta_subtitle_en,
    about_iso, about_iso_en,
    about_global, about_global_en,
    about_innovation, about_innovation_en,
    inquiry_subtitle, inquiry_subtitle_en
  ]

  if (texts) {
    run(`UPDATE page_texts SET
      logo_subtitle=?,
      featured_subtitle=?, featured_subtitle_en=?,
      categories_subtitle=?, categories_subtitle_en=?,
      advantages_subtitle=?, advantages_subtitle_en=?,
      cta_title=?, cta_title_en=?,
      cta_subtitle=?, cta_subtitle_en=?,
      products_page_subtitle=?, products_page_subtitle_en=?,
      contact_page_title=?, contact_page_title_en=?,
      contact_page_subtitle=?, contact_page_subtitle_en=?,
      contact_form_desc=?, contact_form_desc_en=?,
      inquiry_panel_title=?, inquiry_panel_title_en=?,
      contact_tagline=?, contact_tagline_en=?,
      about_overlay_text=?, about_overlay_text_en=?,
      about_tagline=?, about_tagline_en=?,
      about_cta_subtitle=?, about_cta_subtitle_en=?,
      about_iso=?, about_iso_en=?,
      about_global=?, about_global_en=?,
      about_innovation=?, about_innovation_en=?,
      inquiry_subtitle=?, inquiry_subtitle_en=?,
      updated_at=CURRENT_TIMESTAMP
      WHERE id=1`, params)
  } else {
    run(`INSERT INTO page_texts (
      logo_subtitle,
      featured_subtitle, featured_subtitle_en,
      categories_subtitle, categories_subtitle_en,
      advantages_subtitle, advantages_subtitle_en,
      cta_title, cta_title_en,
      cta_subtitle, cta_subtitle_en,
      products_page_subtitle, products_page_subtitle_en,
      contact_page_title, contact_page_title_en,
      contact_page_subtitle, contact_page_subtitle_en,
      contact_form_desc, contact_form_desc_en,
      inquiry_panel_title, inquiry_panel_title_en,
      contact_tagline, contact_tagline_en,
      about_overlay_text, about_overlay_text_en,
      about_tagline, about_tagline_en,
      about_cta_subtitle, about_cta_subtitle_en,
      about_iso, about_iso_en,
      about_global, about_global_en,
      about_innovation, about_innovation_en,
      inquiry_subtitle, inquiry_subtitle_en
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, params)
  }

  res.json({ message: '更新成功' })
})

export default router
