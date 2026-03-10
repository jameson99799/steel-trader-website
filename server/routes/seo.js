import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const router = Router()

router.get('/', (req, res) => {
    const settings = getOne('SELECT * FROM seo_settings WHERE id = 1')
    res.json(settings || {})
})

router.put('/', authMiddleware, upload.single('og_image'), (req, res) => {
    const existing = getOne('SELECT * FROM seo_settings WHERE id = 1')
    const {
        site_title, site_description, site_keywords, google_analytics, google_search_console, robots_txt,
        geo_region, geo_placename, geo_lat, geo_lng, hreflang_en, hreflang_zh,
        local_business_type, local_business_address
    } = req.body
    const og_image = req.file ? `/uploads/${req.file.filename}` : existing?.og_image

    if (existing) {
        run(
            `UPDATE seo_settings SET site_title=?, site_description=?, site_keywords=?, og_image=?,
            google_analytics=?, google_search_console=?, robots_txt=?,
            geo_region=?, geo_placename=?, geo_lat=?, geo_lng=?,
            hreflang_en=?, hreflang_zh=?, local_business_type=?, local_business_address=?,
            updated_at=CURRENT_TIMESTAMP WHERE id=1`,
            [site_title, site_description, site_keywords, og_image,
                google_analytics, google_search_console, robots_txt,
                geo_region, geo_placename, geo_lat, geo_lng,
                hreflang_en, hreflang_zh, local_business_type, local_business_address]
        )
    } else {
        run(
            `INSERT INTO seo_settings
            (id, site_title, site_description, site_keywords, og_image, google_analytics, google_search_console, robots_txt,
             geo_region, geo_placename, geo_lat, geo_lng, hreflang_en, hreflang_zh, local_business_type, local_business_address)
            VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [site_title, site_description, site_keywords, og_image,
                google_analytics, google_search_console, robots_txt,
                geo_region, geo_placename, geo_lat, geo_lng,
                hreflang_en, hreflang_zh, local_business_type, local_business_address]
        )
    }
    res.json({ message: '保存成功' })
})

// ── SEO Audit Endpoint ───────────────────────────────────────
router.get('/audit', authMiddleware, (req, res) => {
    const results = []
    let score = 0
    let maxScore = 0

    function check(category, name, pass, suggestion, weight = 1) {
        const status = pass ? 'pass' : 'fail'
        results.push({ category, name, status, suggestion: pass ? '' : suggestion })
        maxScore += weight
        if (pass) score += weight
    }

    function warn(category, name, suggestion) {
        results.push({ category, name, status: 'warn', suggestion })
        maxScore += 1
        score += 0.5
    }

    // ── 1. 基础 SEO 设置 ─────────────────────────────────────
    const seo = getOne('SELECT * FROM seo_settings WHERE id = 1') || {}

    const titleLen = (seo.site_title || '').length
    check('基础SEO', '网站标题（Title）', titleLen >= 10 && titleLen <= 70,
        titleLen === 0 ? '❌ 未设置网站标题，这是最重要的SEO因素！' :
            titleLen < 10 ? '⚠️ 标题太短（' + titleLen + '字符），建议10-70字符，包含核心关键词' :
                '⚠️ 标题太长（' + titleLen + '字符），超过70字符会被Google截断', 2)

    const descLen = (seo.site_description || '').length
    check('基础SEO', 'Meta描述（Description）', descLen >= 50 && descLen <= 160,
        descLen === 0 ? '❌ 未设置Meta描述，搜索结果中将显示随机抓取的文字' :
            descLen < 50 ? '⚠️ 描述太短（' + descLen + '字符），建议50-160字符' :
                '⚠️ 描述太长（' + descLen + '字符），超过160字符会被截断', 2)

    const kwLen = (seo.site_keywords || '').length
    check('基础SEO', '关键词（Keywords）', kwLen > 0,
        '❌ 未设置关键词，添加5-10个核心关键词（英文逗号分隔）')

    check('基础SEO', 'OG分享图片', !!seo.og_image,
        '⚠️ 未设置OG图片，社交媒体分享时不会显示封面图（建议1200×630px）')

    // ── 2. Google 工具 ───────────────────────────────────────
    check('Google工具', 'Google Analytics', !!(seo.google_analytics),
        '❌ 未配置Google Analytics，无法统计网站流量！请到 analytics.google.com 创建', 2)

    check('Google工具', 'Google Search Console', !!(seo.google_search_console),
        '❌ 未配置Search Console验证码，Google无法识别你为网站所有者！请到 search.google.com/search-console 配置', 2)

    const robotsTxt = seo.robots_txt || ''
    const hasSitemapInRobots = robotsTxt.toLowerCase().includes('sitemap')
    check('Google工具', 'Robots.txt 包含 Sitemap', hasSitemapInRobots,
        '⚠️ robots.txt中未声明sitemap地址，建议添加: Sitemap: https://www.sunseasteel.com/sitemap.xml')

    // ── 3. 公司信息 ──────────────────────────────────────────
    const company = getOne('SELECT * FROM company WHERE id = 1') || {}

    check('公司信息', '公司名称', !!(company.name && company.name_en),
        '❌ 公司名称（中英文）未填写完整')
    check('公司信息', '公司简介', !!(company.description && company.description_en),
        '❌ 公司简介（中英文）未填写完整，影响About页面SEO')
    check('公司信息', '联系方式', !!(company.phone && company.email),
        '⚠️ 联系电话或邮箱未填写，影响Google商家信任度')
    check('公司信息', '公司Logo', !!company.logo,
        '❌ 未上传Logo，网站看起来不专业')

    // ── 4. 产品 SEO ──────────────────────────────────────────
    const products = getAll('SELECT * FROM products WHERE status = 1')
    const totalProducts = products.length

    check('产品SEO', '已发布产品数量', totalProducts >= 5,
        totalProducts === 0 ? '❌ 没有任何已发布产品！Google需要有内容才能收录' :
            '⚠️ 仅有' + totalProducts + '个产品，建议至少5个以丰富网站内容', 2)

    if (totalProducts > 0) {
        const noTitle = products.filter(p => !p.seo_title).length
        const noDesc = products.filter(p => !p.seo_description).length
        const noImages = products.filter(p => !p.images).length
        const noNameEn = products.filter(p => !p.name_en).length

        if (noTitle > 0) {
            check('产品SEO', '产品SEO标题', false,
                `❌ ${noTitle}/${totalProducts} 个产品缺少SEO标题，编辑产品 → 底部SEO设置 → 填写`, 2)
        } else {
            check('产品SEO', '产品SEO标题', true, '', 2)
        }

        if (noDesc > 0) {
            check('产品SEO', '产品SEO描述', false,
                `⚠️ ${noDesc}/${totalProducts} 个产品缺少SEO描述，建议每个产品写一段150字符以内的英文描述`)
        } else {
            check('产品SEO', '产品SEO描述', true, '')
        }

        if (noImages > 0) {
            check('产品SEO', '产品图片', false,
                `❌ ${noImages}/${totalProducts} 个产品没有图片，产品无图片严重影响排名和转化`)
        } else {
            check('产品SEO', '产品图片', true, '')
        }

        if (noNameEn > 0) {
            warn('产品SEO', '产品英文名称',
                `⚠️ ${noNameEn}/${totalProducts} 个产品缺少英文名称，影响海外客户搜索`)
        }
    }

    // ── 5. 新闻 / 文章 SEO ───────────────────────────────────
    const news = getAll('SELECT * FROM news WHERE status = 1')
    const totalNews = news.length

    if (totalNews === 0) {
        warn('内容营销', '新闻/文章数量',
            '⚠️ 没有发布任何文章，定期发布行业文章是提升Google排名的最重要手段之一！建议每周1-2篇')
    } else {
        check('内容营销', '新闻/文章数量', totalNews >= 3,
            `当前${totalNews}篇文章，建议至少3篇以上，且定期更新`)

        const noSeoTitle = news.filter(n => !n.seo_title).length
        if (noSeoTitle > 0) {
            check('内容营销', '文章SEO标题', false,
                `⚠️ ${noSeoTitle}/${totalNews} 篇文章缺少SEO标题`)
        } else {
            check('内容营销', '文章SEO标题', true, '')
        }

        const noSlug = news.filter(n => !n.slug).length
        if (noSlug > 0) {
            warn('内容营销', 'URL Slug',
                `⚠️ ${noSlug}/${totalNews} 篇文章没有自定义URL slug，英文slug对SEO更友好`)
        }
    }

    // ── 6. 页面文本 ──────────────────────────────────────────
    const pageTexts = getOne('SELECT * FROM page_texts WHERE id = 1') || {}
    const ptFields = ['featured_subtitle_en', 'categories_subtitle_en', 'cta_title_en', 'contact_page_title_en']
    const ptEmpty = ptFields.filter(f => !pageTexts[f]).length
    if (ptEmpty > 0) {
        warn('页面内容', '前台页面文案', `⚠️ ${ptEmpty} 处前台英文文案未填写，影响各页面搜索排名`)
    }

    // ── 7. Hero 首页 ─────────────────────────────────────────
    const hero = getOne('SELECT * FROM hero_content WHERE id = 1') || {}
    check('首页', 'Hero标题', !!(hero.title_en),
        '❌ 首页Hero英文标题未设置，首页是权重最高的页面')
    check('首页', 'Hero副标题', !!(hero.subtitle_en),
        '⚠️ 首页Hero英文副标题未设置')

    // ── Calculate final score ────────────────────────────────
    const finalScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

    // Group results by category
    const categories = {}
    results.forEach(r => {
        if (!categories[r.category]) categories[r.category] = []
        categories[r.category].push(r)
    })

    res.json({
        score: finalScore,
        totalChecks: results.length,
        passed: results.filter(r => r.status === 'pass').length,
        warnings: results.filter(r => r.status === 'warn').length,
        failed: results.filter(r => r.status === 'fail').length,
        categories,
        topTips: [
            '📝 每个产品和文章都单独设置SEO标题 + 描述',
            '📰 每周发布1-2篇高质量的行业文章（英文），Google最看重持续更新',
            '🔑 标题中包含目标关键词，如：Steel Pipe, Steel Coil, Steel Plate',
            '🖼️ 每个产品至少3张高清图片，图片文件名使用英文描述',
            '🔗 在Google Search Console提交sitemap: /sitemap.xml',
            '📊 通过Google Analytics观察哪些页面流量高，持续优化'
        ]
    })
})

export default router

