import io

with io.open('server/db.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''function findFuzzyBySlug(tableName, requestedSlug) {
  if (!requestedSlug) return null;
  // 1. Exact match
  let item = getOne(`SELECT * FROM ${tableName} WHERE slug = ?`, [requestedSlug]);
  if (item) return item;

  // 2. ID fallback match
  const idMatch = requestedSlug.match(/-(\d+)$/);
  if (idMatch) {
    item = getOne(`SELECT * FROM ${tableName} WHERE id = ?`, [idMatch[1]]);
    if (item) return item;
  }

  // 3. Advanced Jaccard Bag-of-Words Similarity Match'''

insert = '''function basicSlugify(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/[^\\w\\s-]/g, '').replace(/[\\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function findFuzzyBySlug(tableName, requestedSlug) {
  if (!requestedSlug) return null;
  // 1. Exact match
  let item = getOne(`SELECT * FROM ${tableName} WHERE slug = ?`, [requestedSlug]);
  if (item) return item;

  // 2. ID fallback match
  const idMatch = requestedSlug.match(/-(\\d+)$/);
  if (idMatch) {
    item = getOne(`SELECT * FROM ${tableName} WHERE id = ?`, [idMatch[1]]);
    if (item) return item;
  }

  // Fetch all active once
  const candidates = getAll(`SELECT * FROM ${tableName} WHERE status = 1`);

  // 2.5 Strict SEO match across English translations and SEO logic
  for (const c of candidates) {
    if (c.seo_title && basicSlugify(c.seo_title).startsWith(requestedSlug)) return c;
    if (c.title_en && basicSlugify(c.title_en).startsWith(requestedSlug)) return c;
    if (c.title && basicSlugify(c.title).startsWith(requestedSlug)) return c;
  }

  // 2.8 High-confidence strict prefix matching for hard-truncated Legacy URLs (first 25 characters)
  if (requestedSlug.length >= 25) {
    const prefix = requestedSlug.substring(0, 25);
    const prefixMatches = candidates.filter(c => c.slug && c.slug.startsWith(prefix));
    if (prefixMatches.length === 1) return prefixMatches[0];
    if (prefixMatches.length > 1) {
      prefixMatches.sort((a,b) => Math.abs(a.slug.length - requestedSlug.length) - Math.abs(b.slug.length - requestedSlug.length));
      return prefixMatches[0];
    }
  }

  // 3. Advanced Jaccard Bag-of-Words Similarity Match'''

text = text.replace(target, insert)

# Update threshold to 0.45 inside db.js
text = text.replace('score >= 0.30)', 'score >= 0.45)')

with io.open('server/db.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated db.js with Ultimate Match Logic')
