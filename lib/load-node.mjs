/**
 * Node 侧加载器：从磁盘读 catalog.json 注入渲染器。
 * Workers 不走这里（那边用 env.ASSETS.fetch 拿 JSON）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setCatalog, catalogCount } from './render.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(path.resolve(__dirname, '..'), 'site');

export function loadCatalogFromDisk() {
  const f = path.join(SITE, 'data', 'catalog.json');
  if (!fs.existsSync(f)) {
    console.warn('[catalog] 未找到 site/data/catalog.json');
    return { items: [], count: 0 };
  }
  const json = JSON.parse(fs.readFileSync(f, 'utf8'));
  setCatalog(json);
  console.log(`[catalog] 已載入 ${catalogCount()} 個商品`);
  return json;
}
