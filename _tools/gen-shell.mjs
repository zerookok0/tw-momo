/**
 * 把 HTML 片段转成 JS 模块，供 Node 与 Cloudflare Workers 共用。
 * Workers 不能 fs 读文件、也不能直接 import .html，所以生成 .mjs 常量。
 *
 * 输入：site/_partials/header.html、site/_partials/footer.html、_tools/frag-utm.html
 * 输出：lib/shell.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');

const header = fs.readFileSync(path.join(PROJ, 'site', '_partials', 'header.html'), 'utf8');
const footer = fs.readFileSync(path.join(PROJ, 'site', '_partials', 'footer.html'), 'utf8');
const utm = fs.readFileSync(path.join(PROJ, '_tools', 'frag-utm.html'), 'utf8');

const out = `/* 自动生成，勿手改。来源：site/_partials/header.html、footer.html、_tools/frag-utm.html */
export const HEADER_HTML = ${JSON.stringify(header)};
export const FOOTER_HTML = ${JSON.stringify(footer)};
export const UTM_SCRIPT = ${JSON.stringify(utm)};
`;

fs.writeFileSync(path.join(PROJ, 'lib', 'shell.mjs'), out, 'utf8');
console.log('lib/shell.mjs 已生成：', (out.length / 1024).toFixed(1), 'KB');
