import io
import re

with io.open('server/db.js', 'r', encoding='utf-8') as f:
    text = f.read()

# We will completely replace findFuzzyBySlug
def find_block(text, start, end):
    s = text.find(start)
    e = text.find(end, s) + len(end)
    return text[s:e], s, e

start_str = "function basicSlugify(text) {"
end_str = "return null;\n}"

# Let's find where basicSlugify is, or fall back to findFuzzyBySlug
basic_idx = text.find("function basicSlugify")
if basic_idx == -1:
    old_target = text[text.find('function findFuzzyBySlug'):text.find('return null;\n}', text.find('function findFuzzyBySlug')) + 14]
else:
    old_target = text[basic_idx:text.find('return null;\n}', basic_idx) + 14]


new_target = '''function basicSlugify(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/[^\\w\\s-]/g, '').replace(/[\\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function sharedPrefixLength(a, b) {
  let len = 0;
  while (len < a.length && len < b.length && a[len] === b[len]) len++;
  return len;
}

function findFuzzyBySlug(tableName, requestedSlug) {
  if (!requestedSlug) return null;
  // 1. Exact match
  let item = getOne(`SELECT * FROM ${tableName} WHERE slug = ?`, [requestedSlug]);
  if (item) return item;

  // 2. ID match
  const idMatch = requestedSlug.match(/-(\\d+)$/);
  if (idMatch) {
    item = getOne(`SELECT * FROM ${tableName} WHERE id = ?`, [idMatch[1]]);
    if (item) return item;
  }

  const candidates = getAll(`SELECT * FROM ${tableName} WHERE status = 1`);

  // 3. Perfect Prefix Match against any URL forms (Requires at least 25 shared chars)
  let bestPrefixMatch = null;
  let maxPrefix = 0;

  for (const c of candidates) {
    const s_seo = basicSlugify(c.seo_title);
    const s_en = basicSlugify(c.title_en);
    const s_title = basicSlugify(c.title);
    const s_slug = c.slug || '';
    
    // Calculate how many letters match perfectly from the very beginning
    const p1 = sharedPrefixLength(requestedSlug, s_seo);
    const p2 = sharedPrefixLength(requestedSlug, s_en);
    const p3 = sharedPrefixLength(requestedSlug, s_title);
    const p4 = sharedPrefixLength(requestedSlug, s_slug);
    
    const bestP = Math.max(p1, p2, p3, p4);
    
    if (bestP > maxPrefix && bestP >= 22) { // 22 chars is extremely safe for exact match
      maxPrefix = bestP;
      bestPrefixMatch = c;
    }
  }
  
  if (bestPrefixMatch) return bestPrefixMatch;

  // 4. Jaccard Bag-of-Words Similarity Match (Only if Prefix didn't find anything)
  const reqWords = requestedSlug.split('-').filter(w => w.length > 2);
  if (reqWords.length > 0) {
    const reqSet = new Set(reqWords);
    let bestMatch = null;
    let maxScore = 0;

    for (const c of candidates) {
      if (!c.slug) continue;
      const cWords = c.slug.split('-').filter(w => w.length > 2);
      const cSet = new Set(cWords);
      
      let intersection = 0;
      for (const w of reqSet) {
        if (cSet.has(w)) intersection++;
      }
      
      const union = new Set([...reqWords, ...cWords]).size;
      let score = intersection / union;

      if (reqWords[0] && cWords[0] && reqWords[0] === cWords[0]) {
        score += 0.3;
      }
      
      // Strict threshold
      if (score > maxScore && score >= 0.45) {
        maxScore = score;
        bestMatch = c;
      }
    }
    
    if (bestMatch) return bestMatch;
  }
  
  return null;
}'''

text = text.replace(old_target, new_target)

with io.open('server/db.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated db.js with sharedPrefixLength logic!")
