import io

with io.open('server/db.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''  // 3. Fuzzy prefix match
  if (requestedSlug.length >= 30) {
    const prefix = requestedSlug.substring(0, 30);
    const candidates = getAll(`SELECT * FROM ${tableName} WHERE slug LIKE ? LIMIT 50`, [`${prefix}%`]);

    if (candidates.length === 1) {
      return candidates[0];
    } else if (candidates.length > 1) {
      // Disambiguate if multiple match
      let bestMatch = candidates[0];
      let maxScore = -1;

      for (const c of candidates) {
        let score = 0;
        const minLen = Math.min(requestedSlug.length, c.slug.length);
        for (let i = 0; i < minLen; i++) {
          if (requestedSlug[i] === c.slug[i]) score++;
          else break;
        }
        score -= Math.abs(requestedSlug.length - c.slug.length) * 0.1;

        if (score > maxScore) {
          maxScore = score;
          bestMatch = c;
        }
      }
      return bestMatch;
    }
  }
  return null;'''

insert = '''  // 3. Advanced Jaccard Bag-of-Words Similarity Match
  // This allows finding the article even if the user heavily edited the title or shuffled words.
  const reqWords = requestedSlug.split('-').filter(w => w.length > 2);
  if (reqWords.length > 0) {
    const reqSet = new Set(reqWords);
    // Fetch active candidates to find best semantic match
    const candidates = getAll(`SELECT * FROM ${tableName} WHERE status = 1`);
    
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
      let score = intersection / union; // Jaccard Similarity

      // Bonus if the very first important word matches
      if (reqWords[0] && cWords[0] && reqWords[0] === cWords[0]) {
        score += 0.3;
      }

      // We require at least ~30% similarity to avoid false positives (e.g. matching "coil")
      if (score > maxScore && score >= 0.30) {
        maxScore = score;
        bestMatch = c;
      }
    }
    
    if (bestMatch) {
      return bestMatch;
    }
  }
  
  return null;'''

text = text.replace(target, insert)

with io.open('server/db.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated db.js with Jaccard algorithm')
