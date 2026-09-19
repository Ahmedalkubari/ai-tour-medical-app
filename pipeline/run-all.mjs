import { gather } from './yemen-scraper.mjs';
import { fetchRefs } from './references-fetcher.mjs';
await gather();
await fetchRefs();
console.log('Run: npm run build:db  →  npm run validate');
