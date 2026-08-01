function seoReviewsTableExists(db) {
  return Boolean(db.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table' AND name = 'seo_reviews'
  `).get())
}

function migrateLegacyProductReviews(db) {
  if (!seoReviewsTableExists(db)) return

  db.prepare(`
    INSERT OR IGNORE INTO product_reviews (
      product_id,
      author_name,
      review_date,
      rating,
      review_text,
      status,
      source,
      external_id,
      created_at,
      updated_at
    )
    SELECT
      legacy.target_id,
      TRIM(legacy.author_name),
      DATE(legacy.created_at),
      legacy.rating,
      TRIM(legacy.review_text),
      'pending',
      'migration',
      'seo_reviews:' || legacy.id,
      legacy.created_at,
      legacy.created_at
    FROM seo_reviews AS legacy
    INNER JOIN products AS product ON product.id = legacy.target_id
    WHERE legacy.target_type = 'product'
      AND legacy.created_at IS NOT NULL
      AND DATE(legacy.created_at) IS NOT NULL
      AND LENGTH(TRIM(COALESCE(legacy.author_name, ''))) BETWEEN 1 AND 100
      AND LENGTH(TRIM(COALESCE(legacy.review_text, ''))) > 0
      AND typeof(legacy.rating) IN ('integer', 'real')
      AND legacy.rating BETWEEN 1 AND 5
      AND ABS((legacy.rating * 10) - ROUND(legacy.rating * 10)) < 0.00000001
  `).run()
}

export function initializeProductReviewSchema(db) {
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      author_name TEXT NOT NULL CHECK (LENGTH(TRIM(author_name)) BETWEEN 1 AND 100),
      review_title TEXT,
      review_date DATE NOT NULL,
      rating REAL NOT NULL CHECK (rating BETWEEN 1 AND 5),
      review_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'hidden')),
      source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'admin_import', 'external_api', 'migration')),
      external_id TEXT,
      verified_purchase INTEGER NOT NULL DEFAULT 0 CHECK (verified_purchase IN (0, 1)),
      is_incentivized INTEGER NOT NULL DEFAULT 0 CHECK (is_incentivized IN (0, 1)),
      incentive_disclosure TEXT,
      import_batch_id TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_product_reviews_source_external_id
      ON product_reviews(source, external_id)
      WHERE external_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_product_reviews_product_status_date
      ON product_reviews(product_id, status, review_date DESC);

    CREATE INDEX IF NOT EXISTS idx_product_reviews_status
      ON product_reviews(status);

    CREATE INDEX IF NOT EXISTS idx_product_reviews_import_batch
      ON product_reviews(import_batch_id);

    CREATE TABLE IF NOT EXISTS product_review_translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL,
      language_code TEXT NOT NULL CHECK (language_code <> 'en'),
      review_title TEXT,
      review_text TEXT NOT NULL,
      incentive_disclosure TEXT,
      source_hash TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (review_id) REFERENCES product_reviews(id) ON DELETE CASCADE,
      UNIQUE (review_id, language_code)
    );
  `)

  migrateLegacyProductReviews(db)
}
