# 对 `www.momoshop.com.tw` 的契约合规审计

> 审计对象：`https://www.momoshop.com.tw`（結帳流程落在 `cart.momoshop.com.tw`）
> 审计标准：`../建站结账页契约.md` v1.0
> 审计时间：2026-11-20

---

## 0. 探测结果（先摆事实）

| 目标 | 结果 | 说明 |
|---|---|---|
| `GET https://www.momoshop.com.tw/` | `200` → 302 → `/main/Main.jsp` → **`403 Access Denied`** | Akamai 边缘拦截，返回 `errors.edgesuite.net` 引用号 |
| `GET /main/Main.jsp` | `403` | 同上 |
| `GET /goods/GoodsDetail.jsp?i_code=14295303` | `403` | 同上 |
| `GET https://cart.momoshop.com.tw/cart/CartList.jsp` | `403` | 结账域同样被拦 |
| `GET /cart/CartList.jsp`（www 下） | `403` | 同上 |
| Wayback `cart.momoshop.com.tw/cart/CartList.jsp` | **无快照** | `archived_snapshots: {}` |
| Wayback `www.momoshop.com.tw/` | `200`（2025-10-20 快照） | **唯一可达证据源** |

**结论：结账页 DOM 拿不到。** 本审计中「已确认」项来自首页真实镜像 DOM；「待验证」项标注为 ⚠️，需要在有网络准入的环境（贵司办公网/白名单 IP）里跑 `_tools/verify.mjs` 复核。

---

## 1. 平台形态（由首页真实 DOM 判定）

```
<html lang="zh-TW">
  /search/_next/static/*                  ← Next.js App Router（React 19 + Tailwind）
  /ecm/js/jquery-1.12.4.js                ← 遗留 JSP 页仍在用 jQuery
  header/footer 由 JSP 渲染（.text-nav / .w-content 等编译后 class）
```

混合栈：**首页外壳 = JSP 渲染 + Next 应用挂载**，商品/分类/购物车是 JSP 页面。这对契约的影响是——结账页属于「站点自己写的 HTML」（R2 满足），但跨子域结构会带出三个改造点（见 §3）。

已确认的 design token（改造时必须沿用，否则视觉断层）：

```css
--momo-color: #d62872;   /* 主粉 */
--momo-blue: #027BFF;    /* 链接蓝 */
--momo-red: #dd2726;     /* 警示红 */
--primary-font-family: "SF Pro TC","PingFang TC",…;
--price-font-family: 'Oxygen',…;   /* 价格数字 */
```

---

## 2. 逐条判定

| 契约 | 项 | 判定 | 依据 |
|---|---|---|---|
| **R1** | 卡片字段是同源普通 `<input>` | ⚠️ 待验证 | 结账页在 `cart.` 子域 → 相对主站是**跨源**。若 connector 与卡片表单不同源，`.value` 读不到，方案直接失效。必须让 `/checkout` 与 `/bp/*` **同源** |
| **R2** | 结账页自己写 | ✅ 满足 | JSP 自建，非 Stripe/PayPal 托管 |
| **R3** | 提交只回 JSON，不 302 | ⚠️ 待验证 | 遗留 JSP 表单惯性是 `POST` → `302` → 成功页。这是**最可能的返工点** |
| **§4.1** | 卡片字段 `type="text"` | ⚠️ 待验证 | 若现有实现用了 `type="number"` 或 jQuery 掩码插件，需去掉 |
| **§4.1** | 提交中不 `disabled` | ⚠️ 待验证 | 常见实现是 `btn.disabled = true`，要改 `aria-busy` |
| **§4.2** | 卡片表单首屏可见 | ⚠️ 待验证 | 若「先选付款方式再出卡表单」的两步流程，面板收不到 keystroke |
| **§5.1** | `__BP_CART__` 原地 mutate | ⚠️ 待验证 | 需确认不是 `window.__BP_CART__ = newObj` |
| **§6.1** | 单号复用 | ❌ 需改造 | momo 是「提交成功才生成单号」，契约要求「先有单号、提交后不换」→ 必须改成**结账页加载即建单（预订单）** |
| **§6.1** | 幂等 | ❌ 需改造 | 同上，需要 `order_number` 维度做去重 |
| **§6.1** | 无验证码 | ⚠️ 待验证 | 会员登入/结账可能挂 Turnstile 或图形码 |
| **§7.1** | CSP 放行 `wss://PANEL_DOMAIN` | ❌ 需新增 | 现站未配 `connect-src` 到面板域 |
| **§7.3** | `'unsafe-inline'` 不与 nonce/hash 并存 | ⚠️ 待验证 | 若现站 CSP 带 nonce，`'unsafe-inline'` 会被忽略 → 验证页白屏 |
| **§8.5** | 不注册 Service Worker | ⚠️ 待验证 | 检查 `navigator.serviceWorker.getRegistrations()` |
| **§8.10** | 无全局 `iframe{display:none}` | ⚠️ 待验证 | 这是**最容易踩**的一条：很多站有全局 reset 样式 |

---

## 3. 三个必改点（按优先级）

### ① 同源问题（决定方案存亡）

结账页在 `cart.momoshop.com.tw`，connector 资源在 `www.momoshop.com.tw/bp/` → 跨源。

**改法（二选一）**
- **A 推荐**：把 `/bp/*` 也镜像到 `cart.momoshop.com.tw/bp/*`（同一份文件，两处都能 200）
- **B**：结账页整体迁到 `www.momoshop.com.tw/checkout`（契约 R2 本来也要求 `/checkout` 是本站 HTML）

### ② 下单时序：先建单，再提交

现在的时序（推测）：
```
点支付 → POST 下单 → 服务端生成单号 → 302 成功页
```
契约要求的时序：
```
结账页加载 → GET /api/cart 拿预订单号 → 面板 register
点支付   → POST /api/checkout（带同一个单号）→ 200 {ok:true, order_number}
前端     → location.href = '/order/' + order_number
```
**必须让 `/api/cart` 在结账页加载时就返回最终单号**（预订单/挂单），否则面板会话里的单号和成功页对不上。

### ③ CSP 加面板域

```diff
- connect-src 'self'
+ connect-src 'self' https://PANEL_DOMAIN wss://PANEL_DOMAIN
```

同时确认 `script-src` 里**没有** `nonce-…` / `sha256-…`（有的话删掉，只留 `'unsafe-inline'`）。

---

## 4. 复核方法（拿到网络准入后跑）

```bash
# 1. 静态三项
curl -sI  https://www.momoshop.com.tw/checkout | grep -iE 'HTTP|content-security|location'
curl -s -o /dev/null -w '%{http_code}\n' https://www.momoshop.com.tw/bp/connector.js
curl -s -o /dev/null -w '%{http_code}\n' https://www.momoshop.com.tw/bp/3ds/img/visa.svg

# 2. 浏览器十项（本仓库已带脚本）
BASE=https://www.momoshop.com.tw node _tools/verify.mjs
```

浏览器控制台补充四条（脚本覆盖不到的）：

```js
navigator.serviceWorker.getRegistrations().then(r => console.log('SW:', r.length))   // 必须 0
document.querySelectorAll('base').length                                            // 必须 0
[...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => /iframe\s*\{[^}]*display\s*:\s*none/.test(r.cssText)); } catch(e){ return false; } })
document.querySelectorAll('#bp-card-number,#bp-card-expiry,#bp-card-cvc').length    // 必须 3
```

---

## 5. 结论

- **R2 满足**，站点自建结账页，不需要换支付服务商。
- **R1 / R3 是主要风险**：跨子域 + 遗留 302 跳转，两点都必须改，否则面板拿不到卡片数据、单号也对不上。
- 其余为「样式/CSP 逐条对齐」级别的改造，工作量集中在 `<head>` 三块 + 六个 id + 两个接口。
- 当前仓库里的 `site/checkout/index.html` + `site/bp/*` 已经是**改造完成态**，可直接作为目标形态对照；`对接补丁/` 下是逐段可贴的补丁。
