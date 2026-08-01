import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import Database from 'better-sqlite3'
import { reviewSourceHash } from '../server/services/productReviews.js'
import {
  collectProductReviews,
  syncProductReviewTranslation
} from '../server/services/productReviewTranslation.js'

function createFixture() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE product_reviews (
      id INTEGER PRIMARY KEY,
      product_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      review_title TEXT,
      review_text TEXT NOT NULL,
      incentive_disclosure TEXT,
      status TEXT NOT NULL
    );
    CREATE TABLE translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      language_code TEXT NOT NULL,
      content_type TEXT NOT NULL,
      content_id INTEGER,
      content_field TEXT NOT NULL,
      original_text TEXT,
      translated_text TEXT
    );
    CREATE TABLE product_review_translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL,
      language_code TEXT NOT NULL,
      review_title TEXT,
      review_text TEXT NOT NULL,
      incentive_disclosure TEXT,
      source_hash TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (review_id, language_code)
    );
  `)

  const operations = []
  const adapters = {
    getOne(sql, params = []) {
      operations.push({ type: 'getOne', sql, params })
      return db.prepare(sql).get(...params) || null
    },
    getAll(sql, params = []) {
      operations.push({ type: 'getAll', sql, params })
      return db.prepare(sql).all(...params)
    },
    run(sql, params = []) {
      operations.push({ type: 'run', sql, params })
      const result = db.prepare(sql).run(...params)
      return { changes: result.changes, lastInsertRowid: result.lastInsertRowid }
    }
  }
  return { db, operations, ...adapters }
}

function insertReview(db, overrides = {}) {
  const review = {
    id: 1,
    product_id: 11,
    author_name: 'Verified Buyer',
    review_title: 'Bright and reliable',
    review_text: 'The lights have worked every night.',
    incentive_disclosure: null,
    status: 'published',
    ...overrides
  }
  db.prepare(`
    INSERT INTO product_reviews
      (id, product_id, author_name, review_title, review_text, incentive_disclosure, status)
    VALUES
      (@id, @product_id, @author_name, @review_title, @review_text, @incentive_disclosure, @status)
  `).run(review)
  return review
}

function insertGenericTranslation(db, reviewId, field, original, translated, lang = 'es') {
  db.prepare(`
    INSERT INTO translations
      (language_code, content_type, content_id, content_field, original_text, translated_text)
    VALUES (?, 'product_review', ?, ?, ?, ?)
  `).run(lang, reviewId, field, original, translated)
}

function syncFixture(fixture, reviewId = 1, lang = 'es') {
  return syncProductReviewTranslation({
    reviewId,
    lang,
    getOne: fixture.getOne,
    getAll: fixture.getAll,
    run: fixture.run
  })
}

test('collects only published review title, text, and non-empty disclosure in id order', () => {
  const fixture = createFixture()
  insertReview(fixture.db, { id: 4, review_title: null })
  insertReview(fixture.db, {
    id: 2,
    author_name: 'Project Owner',
    product_id: 9,
    incentive_disclosure: 'Sample supplied for testing.'
  })
  insertReview(fixture.db, { id: 1, status: 'pending' })
  insertReview(fixture.db, { id: 3, status: 'hidden' })

  const items = collectProductReviews(fixture.getAll)

  assert.deepEqual(items.map(({ type, content_type, id, field, text, itemName }) => ({
    type, content_type, id, field, text, itemName
  })), [
    {
      type: 'product_review', content_type: 'product_review', id: 2,
      field: 'review_title', text: 'Bright and reliable',
      itemName: 'Project Owner / Product #9'
    },
    {
      type: 'product_review', content_type: 'product_review', id: 2,
      field: 'review_text', text: 'The lights have worked every night.',
      itemName: 'Project Owner / Product #9'
    },
    {
      type: 'product_review', content_type: 'product_review', id: 2,
      field: 'incentive_disclosure', text: 'Sample supplied for testing.',
      itemName: 'Project Owner / Product #9'
    },
    {
      type: 'product_review', content_type: 'product_review', id: 4,
      field: 'review_text', text: 'The lights have worked every night.',
      itemName: 'Verified Buyer / Product #11'
    }
  ])
  const select = fixture.operations.find(operation => operation.type === 'getAll')
  assert.match(select.sql, /FROM\s+product_reviews/i)
  assert.match(select.sql, /status\s*=\s*'published'/i)
  assert.match(select.sql, /ORDER BY\s+id/i)
})

test('skips an empty or English target without reading or writing the database', () => {
  for (const lang of ['', 'en']) {
    let calls = 0
    const result = syncProductReviewTranslation({
      reviewId: 1,
      lang,
      getOne() { calls++; throw new Error('must not read') },
      getAll() { calls++; throw new Error('must not read') },
      run() { calls++; throw new Error('must not write') }
    })
    assert.deepEqual(result, { synced: false, reason: 'english-source' })
    assert.equal(calls, 0)
  }
})

test('publishes exactly one complete current translation with the task 2 source hash', () => {
  const fixture = createFixture()
  const review = insertReview(fixture.db, { incentive_disclosure: 'A sample was supplied.' })
  insertGenericTranslation(fixture.db, review.id, 'review_title', review.review_title, 'Brillante y fiable')
  insertGenericTranslation(fixture.db, review.id, 'review_text', review.review_text, 'Las luces funcionan cada noche.')
  insertGenericTranslation(fixture.db, review.id, 'incentive_disclosure', review.incentive_disclosure, 'Se suministró una muestra.')

  const result = syncFixture(fixture)

  assert.deepEqual(result, { synced: true })
  assert.deepEqual(fixture.db.prepare(`
    SELECT review_id, language_code, review_title, review_text, incentive_disclosure, source_hash
    FROM product_review_translations
  `).get(), {
    review_id: review.id,
    language_code: 'es',
    review_title: 'Brillante y fiable',
    review_text: 'Las luces funcionan cada noche.',
    incentive_disclosure: 'Se suministró una muestra.',
    source_hash: reviewSourceHash(review)
  })
  const upserts = fixture.operations.filter(operation =>
    operation.type === 'run' && /INSERT INTO\s+product_review_translations/i.test(operation.sql)
  )
  assert.equal(upserts.length, 1)
})

test('deletes a published translation when title or body original_text is stale', () => {
  for (const staleField of ['review_title', 'review_text']) {
    const fixture = createFixture()
    const review = insertReview(fixture.db)
    insertGenericTranslation(fixture.db, review.id, 'review_title', review.review_title, 'Titulo')
    insertGenericTranslation(fixture.db, review.id, 'review_text', review.review_text, 'Texto')
    fixture.db.prepare(`
      UPDATE translations SET original_text = 'previous source'
      WHERE content_field = ?
    `).run(staleField)
    fixture.db.prepare(`
      INSERT INTO product_review_translations
        (review_id, language_code, review_title, review_text, source_hash)
      VALUES (?, 'es', 'Old title', 'Old body', 'old-hash')
    `).run(review.id)

    assert.deepEqual(syncFixture(fixture), { synced: false, reason: 'translation-incomplete' })
    assert.equal(fixture.db.prepare('SELECT COUNT(*) AS count FROM product_review_translations').get().count, 0)
    assert.equal(fixture.operations.some(operation =>
      operation.type === 'run' && /INSERT INTO\s+product_review_translations/i.test(operation.sql)
    ), false)
  }
})

test('requires a current non-empty disclosure translation before publication', () => {
  for (const translated of [null, '   ']) {
    const fixture = createFixture()
    const review = insertReview(fixture.db, { incentive_disclosure: 'Free sample received.' })
    insertGenericTranslation(fixture.db, review.id, 'review_title', review.review_title, 'Titulo')
    insertGenericTranslation(fixture.db, review.id, 'review_text', review.review_text, 'Texto')
    if (translated !== null) {
      insertGenericTranslation(fixture.db, review.id, 'incentive_disclosure', review.incentive_disclosure, translated)
    }
    fixture.db.prepare(`
      INSERT INTO product_review_translations
        (review_id, language_code, review_title, review_text, incentive_disclosure, source_hash)
      VALUES (?, 'es', 'Old title', 'Old body', 'Old disclosure', 'old-hash')
    `).run(review.id)

    assert.deepEqual(syncFixture(fixture), { synced: false, reason: 'translation-incomplete' })
    assert.equal(fixture.db.prepare('SELECT COUNT(*) AS count FROM product_review_translations').get().count, 0)
  }
})

test('clears optional public fields that are now empty instead of retaining old translations', () => {
  const fixture = createFixture()
  const review = insertReview(fixture.db, { review_title: null, incentive_disclosure: null })
  insertGenericTranslation(fixture.db, review.id, 'review_title', 'Former title', 'Titulo antiguo')
  insertGenericTranslation(fixture.db, review.id, 'review_text', review.review_text, 'Texto actual')
  insertGenericTranslation(fixture.db, review.id, 'incentive_disclosure', 'Former disclosure', 'Divulgación antigua')
  fixture.db.prepare(`
    INSERT INTO product_review_translations
      (review_id, language_code, review_title, review_text, incentive_disclosure, source_hash)
    VALUES (?, 'es', 'Old title', 'Old body', 'Old disclosure', 'old-hash')
  `).run(review.id)

  assert.deepEqual(syncFixture(fixture), { synced: true })
  assert.deepEqual(fixture.db.prepare(`
    SELECT review_title, review_text, incentive_disclosure, source_hash
    FROM product_review_translations
  `).get(), {
    review_title: null,
    review_text: 'Texto actual',
    incentive_disclosure: null,
    source_hash: reviewSourceHash(review)
  })
})

test('rejects pending, hidden, and missing reviews and removes their public translations', () => {
  const fixture = createFixture()
  insertReview(fixture.db, { id: 1, status: 'pending' })
  insertReview(fixture.db, { id: 2, status: 'hidden' })
  fixture.db.prepare(`
    INSERT INTO product_review_translations
      (review_id, language_code, review_text, source_hash)
    VALUES (1, 'es', 'Pending old', 'old'),
           (2, 'es', 'Hidden old', 'old'),
           (3, 'es', 'Missing old', 'old')
  `).run()

  for (const reviewId of [1, 2, 3]) {
    assert.deepEqual(syncFixture(fixture, reviewId), { synced: false, reason: 'review-unavailable' })
  }
  assert.equal(fixture.db.prepare('SELECT COUNT(*) AS count FROM product_review_translations').get().count, 0)
  const deletes = fixture.operations.filter(operation =>
    operation.type === 'run' && /DELETE FROM\s+product_review_translations/i.test(operation.sql)
  )
  assert.deepEqual(deletes.map(operation => operation.params), [[1, 'es'], [2, 'es'], [3, 'es']])
})

test('translation route wires reviews through every type mapping and every generic mutation path', () => {
  const source = readFileSync(new URL('../server/routes/translation.js', import.meta.url), 'utf8')

  assert.match(source, /import\s*\{[^}]*collectProductReviews[^}]*syncProductReviewTranslation[^}]*\}\s*from\s*['"]\.\.\/services\/productReviewTranslation\.js['"]/s)
  assert.match(source, /reviews\s*:\s*\(\)\s*=>\s*collectProductReviews\(getAll\)/)
  assert.ok((source.match(/product_review\s*:\s*['"]reviews['"]/g) || []).length >= 4)
  assert.match(source, /UPDATE translations SET original_text=\?, translated_text=\?/)
  assert.match(source, /\['product',\s*'product_review',\s*'news'\]\.includes\(type\)/)

  const upsertSection = source.slice(source.indexOf('function upsertTranslation'), source.indexOf('// ─── List items'))
  assert.match(upsertSection, /syncProductReviewTranslation\s*\(/)
  assert.match(upsertSection, /reviewId\s*:\s*id/)

  const replaceSection = source.slice(source.indexOf("router.post('/replace-translation'"), source.indexOf("router.post('/batch-replace'"))
  assert.match(replaceSection, /syncProductReviewTranslation\s*\(/)
  const batchReplaceSection = source.slice(source.indexOf("router.post('/batch-replace'"), source.indexOf('// ─── Translation status'))
  assert.match(batchReplaceSection, /SELECT[^`'\n]*content_type[^`'\n]*content_id[^`'\n]*language_code/is)
  assert.match(batchReplaceSection, /syncProductReviewTranslation\s*\(/)
})

test('background translation jobs map product reviews to the reviews collector without a separate write path', () => {
  const source = readFileSync(new URL('../server/routes/translation-jobs.js', import.meta.url), 'utf8')

  assert.ok((source.match(/product_review\s*:\s*['"]reviews['"]/g) || []).length >= 2)
  assert.match(source, /import\s*\{[^}]*translateBatch[^}]*\}\s*from\s*['"]\.\/translation\.js['"]/s)
  assert.doesNotMatch(source, /INSERT INTO\s+translations/i)
})

test('deleting a language also deletes its public product review translations', () => {
  const source = readFileSync(new URL('../server/routes/languages.js', import.meta.url), 'utf8')
  const deleteRoute = source.slice(source.indexOf("router.delete('/:id'"))

  assert.match(deleteRoute, /DELETE FROM translations WHERE language_code = \?/)
  assert.match(deleteRoute, /DELETE FROM product_review_translations WHERE language_code = \?/)
  assert.ok(deleteRoute.indexOf('DELETE FROM product_review_translations') > deleteRoute.indexOf('DELETE FROM translations'))
  assert.ok((deleteRoute.match(/\[lang\.code\]/g) || []).length >= 2)
})

test('translation admin exposes a reviews scope with a Chinese label', () => {
  const source = readFileSync(new URL('../src/views/admin/Translations.vue', import.meta.url), 'utf8')

  assert.match(source, /const allPages\s*=\s*\[['"]products['"],\s*['"]reviews['"]/)
  assert.match(source, /reviews\s*:\s*['"][^'"]*产品评价['"]/) // label is user-facing Chinese
})
