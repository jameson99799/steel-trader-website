import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const futuresSource = readFileSync('src/views/FuturesPrice.vue', 'utf8')
const newsSource = readFileSync('src/views/News.vue', 'utf8')
const viteSource = readFileSync('vite.config.js', 'utf8')

test('futures page uses ECharts core modules instead of the full package', () => {
  assert.doesNotMatch(futuresSource, /import \* as echarts from ['"]echarts['"]/)
  for (const token of [
    "from 'echarts/core'",
    "from 'echarts/charts'",
    "from 'echarts/components'",
    "from 'echarts/renderers'",
    'LineChart',
    'CandlestickChart',
    'GridComponent',
    'TooltipComponent',
    'AxisPointerComponent',
    'MarkLineComponent',
    'DataZoomComponent',
    'CanvasRenderer',
    'echarts.use('
  ]) {
    assert.ok(futuresSource.includes(token), `missing ECharts module token: ${token}`)
  }
})

test('vite does not force the complete echarts package into vendor-chart', () => {
  assert.doesNotMatch(viteSource, /['"]vendor-chart['"]\s*:\s*\[['"]echarts['"]\]/)
})

test('vite manual chunks do not reference removed editor plugins', () => {
  assert.doesNotMatch(viteSource, /quill-image-resize-module-react|quill-resize-image/)
})

test('news loads the futures chart only for the futures route', () => {
  assert.doesNotMatch(newsSource, /import FuturesPrice from ['"]\.\/FuturesPrice\.vue['"]/)
  assert.match(newsSource, /defineAsyncComponent\(\(\) => import\(['"]\.\/FuturesPrice\.vue['"]\)\)/)
})
