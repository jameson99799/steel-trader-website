import { initDb, getAll } from './db.js';
import sitemapRoutes from './routes/sitemap.js';
await initDb();
const req = { method: 'GET', url: '/products', headers: {} };
const res = { 
    setHeader: (k,v) => console.log('HEADER', k, v), 
    send: (d) => console.log('SEND', d), 
    status: (s) => ({ send: (d) => console.log('STATUS', s, 'SEND', d) }) 
};
sitemapRoutes.handle(req, res, () => console.log('NEXT'));
