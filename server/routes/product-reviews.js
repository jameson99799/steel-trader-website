import { Router } from 'express'
import { getAll, getOne, run, transaction } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { createProductReviewStore, parseBulkReviewText } from '../services/productReviews.js'

export const MAX_REVIEW_BATCH_SIZE = 200

export function forceExternalReviewPolicy() {
  return { source: 'external_api', forcedStatus: 'pending' }
}

export const productReviewStore = createProductReviewStore({
  getAll,
  getOne,
  run,
  transaction
})

function safeDetails(error) {
  const message = String(error?.message || 'Invalid product review request')
  if (/\b(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b|SQL|constraint|database/i.test(message)) {
    return 'Invalid product review request'
  }
  return message
}

function badRequest(res, error) {
  return res.status(400).json({
    error: 'Invalid product review request',
    details: safeDetails(error)
  })
}

function notFound(res) {
  return res.status(404).json({ error: 'Product review not found' })
}

function execute(res, operation, { status = 200, missing = false } = {}) {
  try {
    const result = operation()
    if (missing && (result === null || result === false)) return notFound(res)
    return res.status(status).json(result)
  } catch (error) {
    return badRequest(res, error)
  }
}

function requireBatch(rows) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > MAX_REVIEW_BATCH_SIZE) {
    throw new Error(`rows must contain between 1 and ${MAX_REVIEW_BATCH_SIZE} entries`)
  }
}

export function createProductReviewHandlers({ store, parseImport = parseBulkReviewText }) {
  if (!store) throw new Error('product review handlers require a store')

  return {
    listPublic(req, res) {
      return execute(res, () => store.listPublic({
        productId: req.params.productId,
        lang: req.query.lang,
        page: req.query.page,
        limit: req.query.limit
      }))
    },

    listAdmin(req, res) {
      return execute(res, () => store.listAdmin(req.query))
    },

    getAdmin(req, res) {
      return execute(res, () => store.getById(req.params.id), { missing: true })
    },

    createAdmin(req, res) {
      const forcedStatus = req.body?.status ?? 'published'
      return execute(
        res,
        () => store.create(req.body, { source: 'admin', forcedStatus }),
        { status: 201 }
      )
    },

    parseImport(req, res) {
      return execute(res, () => parseImport(req.body?.text ?? req.body?.content ?? req.body))
    },

    bulkCreateAdmin(req, res) {
      return execute(res, () => {
        const rows = req.body?.rows
        requireBatch(rows)
        return store.bulkCreate(
          req.body?.productId,
          rows,
          { source: 'admin_import', forcedStatus: 'published' }
        )
      }, { status: 201 })
    },

    updateAdmin(req, res) {
      return execute(res, () => store.update(req.params.id, req.body), { missing: true })
    },

    removeAdmin(req, res) {
      return execute(res, () => {
        const removed = store.remove(req.params.id)
        return removed ? { success: true } : false
      }, { missing: true })
    },

    bulkStatus(req, res) {
      return execute(res, () => store.bulkStatus(req.body?.ids, req.body?.status))
    },

    publishAll(req, res) {
      return execute(res, () => store.publishAll(req.body || {}))
    }
  }
}

export function createProductReviewRouter({ store = productReviewStore, parseImport = parseBulkReviewText } = {}) {
  const router = Router()
  const handlers = createProductReviewHandlers({ store, parseImport })

  router.get('/product/:productId', handlers.listPublic)
  router.get('/admin', authMiddleware, handlers.listAdmin)
  router.get('/admin/:id', authMiddleware, handlers.getAdmin)
  router.post('/admin', authMiddleware, handlers.createAdmin)
  router.post('/admin/parse-import', authMiddleware, handlers.parseImport)
  router.post('/admin/bulk', authMiddleware, handlers.bulkCreateAdmin)
  router.put('/admin/:id', authMiddleware, handlers.updateAdmin)
  router.delete('/admin/:id', authMiddleware, handlers.removeAdmin)
  router.post('/admin/bulk-status', authMiddleware, handlers.bulkStatus)
  router.post('/admin/publish-all', authMiddleware, handlers.publishAll)

  return router
}

export function createExternalProductReviewHandlers({ store }) {
  if (!store) throw new Error('external product review handlers require a store')

  return {
    list(req, res) {
      return execute(res, () => store.listAdmin(req.query))
    },

    get(req, res) {
      return execute(res, () => store.getById(req.params.id), { missing: true })
    },

    create(req, res) {
      return execute(res, () => store.create(req.body, forceExternalReviewPolicy()), { status: 201 })
    },

    bulkCreate(req, res) {
      return execute(res, () => {
        const rows = req.body?.rows
        requireBatch(rows)
        return store.bulkCreate(req.body?.productId, rows, forceExternalReviewPolicy())
      }, { status: 201 })
    },

    update(req, res) {
      return execute(
        res,
        () => store.update(req.params.id, req.body, forceExternalReviewPolicy()),
        { missing: true }
      )
    },

    remove(req, res) {
      return execute(res, () => {
        const removed = store.remove(req.params.id)
        return removed ? { success: true } : false
      }, { missing: true })
    }
  }
}

export function registerExternalProductReviewRoutes(router, { store, middleware }) {
  if (!router || typeof middleware !== 'function') {
    throw new Error('external product review routes require a router and middleware')
  }
  const handlers = createExternalProductReviewHandlers({ store })
  router.get('/product-reviews', middleware, handlers.list)
  router.get('/product-reviews/:id', middleware, handlers.get)
  router.post('/product-reviews', middleware, handlers.create)
  router.post('/product-reviews/bulk', middleware, handlers.bulkCreate)
  router.put('/product-reviews/:id', middleware, handlers.update)
  router.delete('/product-reviews/:id', middleware, handlers.remove)
  return router
}

export function createExternalProductReviewRouter({ store = productReviewStore, middleware } = {}) {
  return registerExternalProductReviewRoutes(Router(), { store, middleware })
}

export function createLegacySeoReviewHandler({ store }) {
  if (!store) throw new Error('legacy SEO review handler requires a store')

  return (req, res) => {
    const input = req.body || {}
    if (String(input.target_type || '').toLowerCase() !== 'product') {
      return res.status(400).json({
        error: 'This deprecated endpoint only supports product reviews',
        deprecated: true,
        replacement: '/api/external/product-reviews'
      })
    }

    return execute(res, () => {
      const data = store.create({
        product_id: input.target_id,
        author_name: input.author_name,
        rating: input.rating,
        review_text: input.review_text
      }, forceExternalReviewPolicy())
      return {
        success: true,
        data,
        deprecated: true,
        replacement: '/api/external/product-reviews'
      }
    }, { status: 201 })
  }
}

const router = createProductReviewRouter()

export default router
