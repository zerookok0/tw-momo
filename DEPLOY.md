# 部署到 Cloudflare Pages

## 一次性设置（在 Pages 项目里）

| 配置项 | 值 |
|---|---|
| Framework preset | **None** |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | （留空） |
| 环境变量 | 可选：`PANEL_DOMAIN=panel.你的域名.com`（写进 CSP 的 `connect-src`） |

`wrangler.toml` 里已经写了 `pages_build_output_dir = "dist"`，Pages 会自动读；如果控制台里手动填过别的目录，改成 `dist`。

## 构建过程做了什么

```bash
npm run build
# = node _tools/gen-shell.mjs && node _tools/relink-home.mjs && node _tools/prepare-deploy.mjs
#   1. 把 site/_partials/header.html、footer.html、frag-utm.html 打包成 lib/shell.mjs
#      （Workers 不能 fs 读文件、不能 import .html，只能走 JS 模块）
#   2. 首页链接接线：242 个 href="#" 还原成 /product/<code>、/category?kw=、/cart
#   3. site/ → dist/（剔除 _partials），产出 767 个文件 / 23.7 MB
#   4. 写入 dist/_headers（契约 §7.1 方案 A 的 CSP 全套）
#   5. 写入 dist/_routes.json（只让 9 条动态路由走 Functions，静态资源零开销）
```

## 运行时结构

```
functions/[[path]].js     ← 动态路由总入口（Pages Functions）
  GET  /product/<code>         /goods/GoodsDetail.jsp?i_code=
  GET  /m/product/<code>       /m/goods.momo?i_code=
  GET  /category?page=&kw=     /m/category?page=&kw=
  GET  /api/cart
  POST /api/checkout           （200+JSON、幂等、单号复用、Origin 比对）
  GET  /api/order/<no>
  其余路径 → next() 交给静态资源
```

目录（18,823 个商品）通过 `env.ASSETS.fetch('/data/catalog.json')` 取，**缓存进 isolate 内存**，只在冷启动时读一次；不打包进 Worker 脚本（避免超出 Worker 体积限制）。

## 本地验证

```bash
npm run build
node _tools/test-function.mjs      # mock env.ASSETS + next()，12 项断言
node server.mjs                    # 纯 Node 跑法（等同 Pages 行为）
```

## 两个已知限制

| 项 | 说明 |
|---|---|
| 订单存储 | Pages 无状态，`functions/[[path]].js` 里用模块级 `Map`，**只在同一 isolate 存活**。要真正持久化就绑 KV：`env.ORDERS.put(no, JSON.stringify(order))` |
| 冷启动 | 首次请求需解析 3.73 MB 的 `catalog.json`（约 200–400ms），之后命中内存缓存 |

## 契约自检

部署后跑：

```bash
BASE=https://你的域名 node _tools/verify.mjs
BASE=https://你的域名 node _tools/verify-mobile.mjs
```

## 会员账号与订单的存储

| 环境 | 账号 | 订单 |
|---|---|---|
| 本地 Node (`node server.mjs`) | `data/users.json`（持久） | `data/orders.json`（持久） |
| Cloudflare Pages | 绑了 KV (`env.USERS`) → KV；没绑 → 签名 cookie `bp_user` | 绑了 KV → KV；没绑 → 签名 cookie `bp_orders`（最近 10 笔） |

**没绑 KV 时的限制**（Demo 够用，生产要绑）：
- 同一浏览器可注册 / 登录 / 登出 / 再登录，刷新不掉线
- 换设备登录不了（账号记录只在本机 cookie 里）
- 会员中心只显示最近 10 笔订单
- 页面重部署后 cookie 仍有效（签名密钥固定），但换 `SESSION_SECRET` 会全部失效

**要变成真正持久化**，在 Pages 控制台 → Settings → Functions → KV namespace bindings 加一个绑定：
- Variable name: `USERS`
- 可选再加 `ORDERS`
- 环境变量 `SESSION_SECRET` 设一个随机串（不设会用内置默认值）

## 购买事件（FB 像素）

connector 新包带 `pixel_*` 配置，默认 `pixel_enabled: true`：

```json
"pixel_platforms": ["fb"],
"pixel_event": "Purchase",
"pixel_dedupe_hours": 24,
"pixel_value": false
```

触发时机：点提交且卡片校验通过的那一刻（与面板无关）。去重 key = hash(设备指纹 + 面板返回的 user_ip)，24 小时内不重复；记录双写 localStorage + cookie。

**本站目前没有 FB 像素，所以只记录去重 key、不会真的上报**（`BPConnector.pixel.state()` 会显示 `missing:["fb"]`）。要真的发：

1. 在 `site/checkout/index.html` 的 `<head>` 里加 FB 像素基础代码（含 Pixel ID）
2. 或在 `<head>` 里随便写 `window.fbq = window.fbq || function(){ (window.fbq.queue = window.fbq.queue || []).push(arguments) }`，再由 GTM 接管

调试：`BPConnector.pixel.state()` / `.fire()` / `.reset()`。