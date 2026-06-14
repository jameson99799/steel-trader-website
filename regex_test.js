import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distIndexPath = join(__dirname, 'dist', 'index.html');
let indexHtmlTemplate = readFileSync(distIndexPath, 'utf8');

const reg = /<link[^>]*rel="stylesheet"[^>]*>/gi;
const result = indexHtmlTemplate.replace(reg, '');

console.log('Original Links:', indexHtmlTemplate.match(reg));
console.log('Result Links:', result.match(reg));

writeFileSync('test_output.html', result);
