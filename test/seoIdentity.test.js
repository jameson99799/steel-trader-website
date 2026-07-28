import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const server = fs.readFileSync(new URL('../server/index.js', import.meta.url), 'utf8')
const news = fs.readFileSync(new URL('../src/views/NewsDetail.vue', import.meta.url), 'utf8')
const product = fs.readFileSync(new URL('../src/views/ProductDetail.vue', import.meta.url), 'utf8')

test('organization schema does not publish unsupported founding or employee claims', () => {
  assert.doesNotMatch(server, /foundingDate:\s*'2010'/)
  assert.doesNotMatch(server, /numberOfEmployees:\s*\{/)
})

test('article schema uses a named person or falls back to the company organization', () => {
  assert.match(
    server,
    /const articleAuthor = seoSettings\.default_news_author[\s\S]*?'@type': 'Organization'[\s\S]*?author: articleAuthor/
  )
  assert.match(
    news,
    /const articleAuthor = seoRes\?\.default_news_author[\s\S]*?'@type': 'Organization'[\s\S]*?'author': articleAuthor/
  )
  assert.doesNotMatch(news, /'name': document\.title/)
})

test('client article and product schemas keep the current localized pathname', () => {
  assert.match(
    news,
    /const articleUrl = new URL\(window\.location\.pathname, siteUrl\)\.href/
  )
  assert.match(
    product,
    /const productUrl = new URL\(window\.location\.pathname, siteUrl\)\.href/
  )
})
