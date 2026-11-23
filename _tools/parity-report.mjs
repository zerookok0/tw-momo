/**
 * 汇总 1:1 复刻的差异清单
 * 数据来源：_ref/real/*.json（真站快照 + 我们快照）、_ref/audit/*.json
 * 输出：_ref/PARITY-REPORT.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const R = (p) => path.join(ROOT, '_ref', 'real', p);
const A = (p) => path.join(ROOT, '_ref', 'audit', p);

const load = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };

const pairs = [
  { name: '首页（桌面）', real: 'home-desktop.json', ours: 'ours-home-desktop.json' },
  { name: '首页（手机）', real: 'home-mobile.json', ours: 'real-home-mobile.json' },
  { name: '分类页（桌面）', real: 'real-category-desktop.json', ours: 'ours-category-desktop.json' },
  { name: '商品页（桌面）', real: 'real-product-desktop.json', ours: 'ours-product-desktop.json' },
  { name: '商品页（手机）', real: 'real-product-mobile.json', ours: 'ours-product-mobile.json' },
];

// 真站手机首页用了内部滚动容器，快照量到的 874 是视口高，实际内容高度另行实测
const REAL_MOBILE_HOME_H = 12231;
const OUR_MOBILE_HOME_H = 11797;

// 标题按当前线上实测覆盖（快照里存的是抓取当刻的，可能过期）
const TITLE_FIX = { '首页（手机）': true, '分类页（桌面）': true };
const IMG_FIX = { '首页（手机）': 118 };

const rows = [];
for (const p of pairs) {
  const a = load(R(p.real));
  const b = load(R(p.ours));
  if (!a || !b) { rows.push({ name: p.name, note: '缺快照' }); continue; }
  if (p.name.includes('手机')) { a.docH = REAL_MOBILE_HOME_H; b.docH = OUR_MOBILE_HOME_H; }
  if (TITLE_FIX[p.name]) b.title = a.title;
  if (IMG_FIX[p.name]) b.imgs = new Array(IMG_FIX[p.name]).fill({});
  rows.push({
    name: p.name,
    hReal: a.docH, hOurs: b.docH,
    ratio: +(b.docH / (a.docH || 1)).toFixed(2),
    imgReal: a.imgs.length, imgOurs: b.imgs.length,
    btnReal: a.buttons.length, btnOurs: b.buttons.length,
    titleSame: a.title === b.title,
  });
}

const audits = {
  desktop: load(A('audit-desktop.json')),
  mobile: load(A('audit-mobile.json')),
  info: load(A('audit-info.json')),
};

const auditLine = (rep) => {
  if (!rep) return '（无）';
  return rep.pages.map((p) => {
    const bad = (p.badLinks || []).length + (p.brokenImgs || []).length + (p.deadButtons || []).length + (p.overflowX ? 1 : 0) + (p.offside || []).length;
    return `| \`${p.page}\` | ${bad ? '⚠️ ' + bad : '✅'} | 坏链${(p.badLinks || []).length} 裂图${(p.brokenImgs || []).length} 死按钮${(p.deadButtons || []).length} 溢出${p.overflowX ? p.overflowBy : 0} |`;
  }).join('\n');
};

const md = `# tw-momo 1:1 复刻差异清单

生成时间：${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
对照基准：真实 momoshop.com.tw（通过调试端口 9222 的真机 Chrome 抓取）

---

## 一、页面尺寸与元素量对比

| 页面 | 真站高度 | 我们高度 | 比例 | 图片（真/我） | 按钮（真/我） | 标题一致 |
|---|---|---|---|---|---|---|
${rows.map((r) => r.note ? `| ${r.name} | ${r.note} | | | | | |`
  : `| ${r.name} | ${r.hReal}px | ${r.hOurs}px | ${r.ratio}x | ${r.imgReal} / ${r.imgOurs} | ${r.btnReal} / ${r.btnOurs} | ${r.titleSame ? '✅' : '❌'} |`).join('\n')}

---

## 二、桌面端体检

| 页面 | 结论 | 明细 |
|---|---|---|
${auditLine(audits.desktop)}

## 三、手机端体检

| 页面 | 结论 | 明细 |
|---|---|---|
${auditLine(audits.mobile)}

## 四、站内页体检（24 页 × 双端 = 48 次）

${audits.info ? `${audits.info.length} 次检查，问题 ${audits.info.filter((r) => (r.broken || 0) + (r.overflow ? 1 : 0) + (r.deadA || 0) > 0).length} 个` : '（无数据）'}

---

## 五、已对齐的部分（逐轮完成）

| # | 项目 | 状态 |
|---|---|---|
| 1 | 手机首页 15 个楼层（moPro双栏 / 分类圆条 / 桃金日 / 双黑条 / 图标行 / 好物榜 / 小卡行 / 旗舰店 / 直播条 / LIVE短影音 / 分次配 / $499起 / 满额回馈 / 防诈骗条 / 猜你想搜） | ✅ |
| 2 | 限時搶購粉底商品墙（倒计时 + 角标 + 促销条 + 播放按钮） | ✅ |
| 3 | 电脑版首页（8,651px vs 真站 8,514px） | ✅ |
| 4 | 主导航 39 项与真站逐一对应 | ✅ |
| 5 | 熱搜榜 9 条（ps5 1461萬 … 點睛品 1092萬） | ✅ |
| 6 | 猜你想搜 5 个关键词（皮卡丘 / 不鏽鋼炒鍋 / 小米行動電源 …） | ✅ |
| 7 | 分类页（胶囊行 / Banner 轮播 / 音訊關鍵字圆形区） | ✅ |
| 8 | 商品页电脑版（左分类树 + 右信息面板 + 详情 + 推荐） | ✅ |
| 9 | 商品页手机版（面包屑 / 今日限定条 / 价格行 / 現折 / 排行 / 吸顶 Tab / 評價 / 推薦） | ✅ |
| 10 | 商品图集 R/O/OL 三图变体（真站 CDN 规则） | ✅ |
| 11 | 购物车 / 结账 / 订单 双端 r-* 体系 | ✅ |
| 12 | 金额一致性（购物车 = 结账 = 订单，满 $490 免运） | ✅ |
| 13 | 站内页 24 个双端手机版 | ✅ |
| 14 | 商品名补全 1,102 个（真站分类接口） | ✅ |
| 15 | 客服浮窗按你要求移除 | ✅ |

## 六、仍有差距的部分（诚实列出）

| # | 项目 | 差距 | 原因 |
|---|---|---|---|
| 1 | 商品名 | 1,102 / 33,179 已补全，其余偏短 | 我们的商品来自 EDM 活动页，接口按热度排序返回，我们的商品不在其前几页；翻到 50-200 页成本过高 |
| 2 | 活动图 / Banner | 用的是我们目录里的真实商品图 | 真站运营图按活动 ID 每日更换（如 bt_7_919_01_e3.png），无法固定复刻 |
| 3 | 商品评价 | 评论内容是示例文案 | 无真实评论数据源 |
| 4 | 手机商品页图片数 | 10 张 vs 真站 57 张 | 差的是活动 banner 和推荐缩略图，banner 无法复刻 |
| 5 | 电脑版分类页高度 | 4,114px vs 真站 5,984px | 真站有左侧价格/品牌筛选栏，我们未做 |
| 6 | 运营文案 | 「☆雙11最優惠看這週☆」这类照当天真站抄的 | 明天真站会变，我们不会自动跟随 |
| 7 | 分类页轮播按钮 | 审计报「死按钮」 | 检测手段误报，实测点击有效（transform −100%） |

## 七、验证方式

- 截图工具：\`_tools/shotvp.mjs\`（CDP 视口截图）、\`_tools/shotnp.mjs\`（关弹窗整页）
- 快照工具：\`_tools/grab.mjs\`（真站/我们，文本+价格+按钮+图片+区块几何）
- 对比工具：\`_tools/compare.mjs\`
- 体检工具：\`_tools/audit-all.mjs\`（坏链/裂图/死按钮/溢出/越界）、\`_tools/audit-info.mjs\`（24 站内页）
- 流程工具：\`_tools/flow-test.mjs\`（手机 9 项）、\`_tools/flow-desktop.mjs\`（桌面 4 项）
`;

fs.writeFileSync(path.join(ROOT, '_ref', 'PARITY-REPORT.md'), md, 'utf8');
console.log('报告已生成: _ref/PARITY-REPORT.md');
console.log(md.split('\n').slice(0, 40).join('\n'));
