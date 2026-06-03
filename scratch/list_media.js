import fs from 'fs';
import path from 'path';

const dir = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\526de08c-b510-4d69-8c6e-28c8ab821f5a';
const files = fs.readdirSync(dir);

const mediaFiles = files.filter(f => f.startsWith('media__')).map(f => {
    const stats = fs.statSync(path.join(dir, f));
    return { name: f, mtime: stats.mtime };
}).sort((a, b) => b.mtime - a.mtime);

console.log(JSON.stringify(mediaFiles, null, 2));
