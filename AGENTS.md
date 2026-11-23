# 项目规则（对任何在本仓库工作的 AI 生效）

## 一、Cloudflare 改动必须先审批

**任何触及 Cloudflare 的操作，必须先在对话里拿到用户的明确批准，才能执行。**

### 需要审批

| 类别 | 命令 / 动作 |
|---|---|
| 部署 | `wrangler pages deploy`、`wrangler deploy`、`wrangler versions upload`、`wrangler rollback` |
| 删除 | `wrangler delete`、删 Pages 项目 / Worker / KV / R2 |
| 项目配置 | 建项目、改名、切生产分支、绑自定义域、改 `wrangler.toml` |
| 运行时 | 环境变量、KV 绑定、Secrets、`compatibility_date`、路由 |
| 缓存与规则 | Purge Cache、Transform Rules、Redirect Rules、Page Rules、WAF |
| 边缘代码上线 | `_headers`、`_redirects`、`_routes.json`、`functions/**` |
| DNS / 域名 | 记录增删改、SSL 模式、证书 |

### 不需要审批

- 本地 `npm run build`
- 本地 `node server.mjs` 预览（127.0.0.1）
- 改源码 / 样式 / 数据文件（只要不部署）
- 跑本地自检（audit / flow-test / final-check）
- `git commit`、`git push`（推的是 GitHub 仓库，不是 Cloudflare）

### 流程

1. 改完 + 本地验证通过 → **停下**
2. 报告：改动摘要 / 影响路由 / 本地验证结果 / 回滚方式
3. 等用户明确说「可以部署」「批准」
4. 再执行部署命令

**「顺手部署」「先上线看看」都算违规。**
用户问「是不是可以删除」是询问，不是批准——必须等明确的执行指令。

---

## 二、部署命令（本项目现行）

```bash
npm run build
wrangler pages deploy dist --project-name=tw-momo --branch=main --commit-dirty=true
```

Worker 已于 2026-11-23 删除，只有 Pages 一条部署线。
`wrangler.toml` 里的 Worker 段已注释，不要取消注释重建。

---

## 三、目标站约定

- 目标站：`momoshop.com.tw`（电脑版 + 手机版）
- **已下架商品不用管**：真站返回「商品目前無展售」的商品，不必补评价 / SKU / 推荐
- 实测下架率约 55%，抽查到再单独处理即可

---

## 四、本地自检脚本

| 脚本 | 覆盖 |
|---|---|
| `_tools/final-check.mjs` | 全项验收 37 项（双端） |
| `_tools/audit-all.mjs` | 逐页体检：坏链 / 裂图 / 死按钮 / 溢出 / 越界 |
| `_tools/audit-info.mjs` | 24 个站内页 × 双端 |
| `_tools/flow-test.mjs` | 手机全链路 9 项 |
| `_tools/flow-desktop.mjs` | 桌面全链路 4 项 |
| `_tools/verify7.mjs` | 7 类历史缺陷回归 |

改完任何东西，至少跑 `final-check` + `audit-all` 双端。

---

## 五、数据管线

```
site/data/catalog.json   33,179 商品
site/data/reviews.json   真站评价（JSON API）
site/data/recommend.json 真站推荐（JSON API）
site/data/specs.json     真站规格 + SKU 变体（JSON-LD hasVariant）
site/data/categories.json 26 个顶级分类
```

抓取脚本在 `_tools/harvest-*.mjs`，合并脚本在 `_tools/merge-*.mjs`。
抓取要用调试端口 9222 的真实 Chrome（WAF 按 TLS 指纹拦 curl/Node）。

---

## 六、构建顺序不可乱

`build-pages` 与 `build-mobile` 必须在 `gen-shell` 之后、`prepare-deploy` 之前。
`restore-home` 会从 `_ref/index-priced.html` 重建首页，
对 `site/index.html` 的任何定制都要写进 `_tools/align-desktop-copy.mjs`，否则下次 build 被冲掉。
