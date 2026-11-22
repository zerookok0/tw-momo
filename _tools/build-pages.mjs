import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const SITE = path.join(PROJ, 'site');
const products = JSON.parse(fs.readFileSync(path.join(PROJ, '_ref', 'products.json'), 'utf8'));
import { salePrice, origPrice } from '../lib/pricing.mjs';

const header = fs.readFileSync(path.join(SITE, '_partials', 'header.html'), 'utf8');
const footer = fs.readFileSync(path.join(SITE, '_partials', 'footer.html'), 'utf8');

const CSS_BASE = [
  '/assets/www.momoshop.com.tw/search/_next/static/css/b36616395eb7bd31.css',
  '/assets/www.momoshop.com.tw/search/_next/static/css/62f82080ec5074dd.css',
  '/assets/www.momoshop.com.tw/search/_next/static/css/046394d9bcfe3529.css',
  '/assets/image.momoshop.com.tw/ecm/font/theme-main.css',
  '/assets/css/momo-pages.css',
];

const UTM_SCRIPT = `<script>
  (function(){
    var K=['utm_source','utm_medium','utm_campaign','utm_term','utm_content',
           'utm_id','fbclid','ttclid','gclid','adset_id','campaign_id',
           'sub1','sub2','sub3','sub4','sub5'];
    function grab(q){var o={},p=(q||'').replace(/^\\?/,'').split('&');for(var i=0;i<p.length;i++){
      var kv=p[i].split('=');if(kv.length<2)continue;try{var k=decodeURIComponent(kv[0]);
      if(K.indexOf(k)!==-1)o[k]=decodeURIComponent(kv.slice(1).join('='));}catch(e){}}return o;}
    function load(){try{return JSON.parse(sessionStorage.getItem('bp_utm')||'{}')}catch(e){return {}}}
    function save(o){try{sessionStorage.setItem('bp_utm',JSON.stringify(o))}catch(e){}
      try{var d=new Date();d.setTime(d.getTime()+7*864e5);
      document.cookie='bp_utm='+encodeURIComponent(JSON.stringify(o))+'; expires='+d.toUTCString()+'; path=/; SameSite=Lax';}catch(e){}}
    var cur=load(),add=false;
    var m=grab(location.search); for(var a in m){cur[a]=m[a];add=true}
    try{var n=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];
      if(n&&n.name){var mm=grab(n.name.split('?')[1]||'');for(var b in mm){cur[b]=mm[b];add=true}}}catch(e){}
    try{if(document.referrer){var mm2=grab((document.referrer.split('?')[1])||'');
      for(var c in mm2){if(!cur[c]){cur[c]=mm2[c];add=true}}}}catch(e){}
    if(add)save(cur);
    window.__BP_UTM__=cur;
  })();
  </script>`;

const CART_SKELETON = `<script>
    window.__BP_CART__ = {
      order_number: "", currency: "", total: 0, total_amount: "",
      items: [], locale: document.documentElement.lang || "en"
    };
  </script>
  <!-- 从购物车页带过来的真实商品，覆写骨架（否则会显示服务端兜底购物车） -->
  <script>
  (function(){
    try {
      var raw = sessionStorage.getItem('momo_checkout_cart');
      if (!raw) return;
      var c = JSON.parse(raw);
      if (!c || !c.items || !c.items.length) return;
      var b = window.__BP_CART__;
      b.items = c.items;
      b.total = c.total;
      b.total_amount = c.total_amount;
      var b = window.__BP_CART__;
      b.items = c.items;
      b.total = c.total;
      b.total_amount = c.total_amount;
      b.currency = 'TWD';
      b.locale = document.documentElement.lang || 'zh-TW';
      // 每笔结账生成独立单号，避免多笔订单撞同一个号（契约：单号复用，提交后不换）
      if (!b.order_number) {
        var d = new Date();
        var pad = function (n) { return String(n).padStart(2, '0'); };
        var rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
        b.order_number = 'ORD-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + rnd;
      }
    } catch (e) {}
  })();
  </script>`;

function page({ title, lang = 'zh-TW', head = '', body, bodyClass = 'momo-page' }) {
  return fixHead(`<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=0">
<title>${title}</title>
${head}
${CSS_BASE.map((h) => `<link rel="stylesheet" href="${h}">`).join('\n')}
</head>
<body class="${bodyClass}">
${header}
${body}
${footer}
</body>
</html>`);
}

const fmt = (n) => '$' + n.toLocaleString('en-US');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const crumb = (items) => `<nav class="crumb">
  <a href="/">首頁</a>
  ${items.map((i) => `<span class="sep">/</span>${i.href ? `<a href="${i.href}">${i.text}</a>` : `<span>${i.text}</span>`}`).join('')}
</nav>`;

// ============================================================
// 1) 商品詳情頁
// ============================================================
const PLACEHOLDER_IMG = '/assets/img1.momoshop.com.tw/ecm/img/online/10/998/00/000/bt_0_245_01/bt_0_245_01_P1_1_e2.png';

function productPage(p) {
  const name = esc((p.name || p.texts[0]) || 'momo 嚴選商品');
  const price = salePrice(p) || 495;
  const was = origPrice(p);
  const img = p.img || PLACEHOLDER_IMG;
  const body = `
<div class="wrap">
  ${crumb([{ text: '商品分類', href: '/category' }, { text: name }])}

  <div class="pdp">
    <div class="pdp__gallery">
      <div class="pdp__main"><img src="${img}" alt="${name}" id="pdp-main-img"></div>
      <div class="pdp__thumbs" role="tablist">
        ${[img, img, img, img].map((s, i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-src="${s}"><img src="${s}" alt=""></button>`).join('')}
      </div>
    </div>

    <div class="pdp__info">
      <h1 class="pdp__title">${name}</h1>
      <div class="pdp__sub">
        <span class="tag">momo嚴選</span>
        <span>商品編號 ${p.code}</span>
        <span>｜</span>
        <span>賣家宅配／超商取貨</span>
      </div>

      <div class="price-box">
        <div class="now">
          <span class="cur">$</span>
          <span class="val">${price.toLocaleString('en-US')}</span>
          <span class="was">${fmt(was)}</span>
        </div>
        <div class="badges">
          <span>今日限定</span><span>滿額登記送 mo 幣</span><span>刷卡分期 0 利率</span>
        </div>
      </div>

      <div class="opt-row" style="border-top:0">
        <div class="opt-row__label">規格</div>
        <div class="opt-row__body">
          <button type="button" class="btn btn--ghost" style="height:38px;padding:0 16px;font-size:13px">標準規格</button>
        </div>
      </div>

      <div class="opt-row">
        <div class="opt-row__label">數量</div>
        <div class="opt-row__body">
          <div class="qty">
            <button type="button" data-qty="-1" aria-label="減少">−</button>
            <input type="text" value="1" inputmode="numeric" id="pdp-qty" aria-label="數量">
            <button type="button" data-qty="1" aria-label="增加">+</button>
          </div>
        </div>
      </div>

      <div class="pdp__actions">
        <button type="button" class="btn btn--gray btn--lg" id="btn-add-cart">加入購物車</button>
        <button type="button" class="btn btn--primary btn--lg" id="btn-buy-now">直接結帳</button>
      </div>

      <ul class="pdp__notes">
        <li>全館滿 $490 免運，未滿收取運費 $80</li>
        <li>結帳後 1–3 個工作日內出貨，偏遠地區恕不配送</li>
        <li>依消費者保護法規定，享有 10 天猶豫期之權益</li>
      </ul>
    </div>
  </div>

  <div class="card" style="margin-top:12px">
    <div class="tabs" role="tablist">
      <button type="button" role="tab" aria-selected="true">商品詳情</button>
      <button type="button" role="tab" aria-selected="false">規格說明</button>
      <button type="button" role="tab" aria-selected="false">退換貨須知</button>
    </div>
    <div class="tab-panel">
      <p>${name}，momo 購物網正式授權經銷，商品皆為台灣公司貨，享原廠保固與售後服務。</p>
      <h3>商品特色</h3>
      <ul>
        <li>原廠公司貨，附發票與保固卡</li>
        <li>嚴選品質，出貨前逐件品檢</li>
        <li>支援多元付款：信用卡、ATM、超商取貨付款</li>
      </ul>
      <h3>規格</h3>
      <table class="spec-table">
        <tr><th>商品編號</th><td>${p.code}</td></tr>
        <tr><th>原價</th><td><s>${fmt(was)}</s></td></tr>
        <tr><th>5 折價</th><td style="color:#d62872;font-weight:700">${fmt(price)}</td></tr>
        <tr><th>產地</th><td>依原廠標示</td></tr>
        <tr><th>保固</th><td>原廠保固（非人為損壞）</td></tr>
      </table>
    </div>
  </div>
</div>

<script>
(function(){
  var price = ${price};
  var name = ${JSON.stringify((p.name || p.texts[0]) || 'momo 嚴選商品')};
  var img = ${JSON.stringify(img)};
  var code = ${JSON.stringify(p.code)};

  document.querySelectorAll('.pdp__thumbs button').forEach(function(b){
    b.addEventListener('click', function(){
      document.querySelectorAll('.pdp__thumbs button').forEach(function(x){ x.setAttribute('aria-selected','false'); });
      b.setAttribute('aria-selected','true');
      document.getElementById('pdp-main-img').src = b.dataset.src;
    });
  });

  var qty = document.getElementById('pdp-qty');
  document.querySelectorAll('[data-qty]').forEach(function(b){
    b.addEventListener('click', function(){
      var v = Math.max(1, Math.min(99, (parseInt(qty.value,10)||1) + Number(b.dataset.qty)));
      qty.value = v;
    });
  });
  qty.addEventListener('input', function(){ qty.value = qty.value.replace(/[^0-9]/g,''); });

  var CART_KEY = 'momo_cart';
  function readCart(){ try { return JSON.parse(localStorage.getItem(CART_KEY)||'[]'); } catch(e){ return []; } }
  function writeCart(v){ try { localStorage.setItem(CART_KEY, JSON.stringify(v)); } catch(e){} }

  function addToCart(){
    var n = Math.max(1, parseInt(qty.value,10)||1);
    var cart = readCart();
    var hit = cart.filter(function(i){ return i.code === code; })[0];
    if (hit) hit.qty += n; else cart.push({ code: code, name: name, price: price, qty: n, img: img });
    writeCart(cart);
    return n;
  }

  document.getElementById('btn-add-cart').addEventListener('click', function(){
    var n = addToCart();
    this.textContent = '已加入 ' + n + ' 件';
    var self = this;
    setTimeout(function(){ self.textContent = '加入購物車'; }, 1200);
  });

  document.getElementById('btn-buy-now').addEventListener('click', function(){
    addToCart();
    location.href = '/cart';
  });
})();
</script>`;
  return page({ title: `${name} - momo購物網`, body });
}

// ============================================================
// 2) 購物車頁
// ============================================================
function cartPage() {
  const body = `
<div class="wrap">
  ${crumb([{ text: '購物車' }])}

  <div class="card">
    <div class="card__hd">
      <h2>購物車</h2>
      <span class="cart-summary__count" id="cart-count-label">共 0 件</span>
    </div>

    <table class="cart-table">
      <thead>
        <tr>
          <th style="width:46%">商品</th>
          <th>單價</th>
          <th>數量</th>
          <th>小計</th>
          <th>刪除</th>
        </tr>
      </thead>
      <tbody id="cart-body"></tbody>
    </table>

    <div id="cart-empty" style="display:none;padding:60px 20px;text-align:center;color:#999">
      購物車是空的，<a href="/" style="color:#d62872;text-decoration:underline">去逛逛</a>
    </div>
  </div>

  <div class="cart-summary">
    <div class="cart-summary__row">
      <span class="cart-summary__label">商品合計</span>
      <span class="cart-summary__count" id="cart-count">0 件</span>
    </div>
    <div class="cart-summary__row">
      <span class="cart-summary__label">應付金額</span>
      <span class="cart-summary__total" id="cart-total">$0</span>
    </div>
    <button type="button" class="btn btn--gray">繼續購物</button>
    <button type="button" class="btn btn--primary btn--lg" id="go-checkout">前往結帳</button>
  </div>
</div>

<script>
(function(){
  var CART_KEY = 'momo_cart';
  var DEFAULT_CART = ${JSON.stringify(products.slice(0, 3).map((p) => ({ code: p.code, name: (p.name || p.texts[0]), price: salePrice(p), qty: 1, img: p.img })))};

  function read(){
    try {
      var v = JSON.parse(localStorage.getItem(CART_KEY)||'null');
      if (!v || !v.length) { localStorage.setItem(CART_KEY, JSON.stringify(DEFAULT_CART)); return DEFAULT_CART.slice(); }
      return v;
    } catch(e){ return DEFAULT_CART.slice(); }
  }
  function write(v){ try { localStorage.setItem(CART_KEY, JSON.stringify(v)); } catch(e){} }

  var fmt = function(n){ return '$' + Number(n).toLocaleString('en-US'); };

  function render(){
    var cart = read();
    var body = document.getElementById('cart-body');
    var empty = document.getElementById('cart-empty');
    var total = 0, count = 0;
    body.innerHTML = '';
    if (!cart.length) { empty.style.display = 'block'; }
    else { empty.style.display = 'none'; }
    cart.forEach(function(it, idx){
      total += it.price * it.qty; count += it.qty;
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><div class="cart-item">' +
          '<div class="cart-item__img">' + (it.img ? '<img src="' + it.img + '" alt="">' : '<span class="cart-item__ph"></span>') + '</div>' +
          '<div><a class="cart-item__name" href="/product/' + it.code + '">' + it.name + '</a>' +
          '<div class="cart-item__meta">商品編號 ' + it.code + '｜可分期 0 利率</div></div>' +
        '</div></td>' +
        '<td><span class="price-num">' + fmt(it.price) + '</span></td>' +
        '<td><div class="qty" style="display:inline-flex">' +
          '<button type="button" data-act="dec" data-i="' + idx + '">−</button>' +
          '<input type="text" value="' + it.qty + '" readonly style="width:48px">' +
          '<button type="button" data-act="inc" data-i="' + idx + '">+</button>' +
        '</div></td>' +
        '<td><span class="price-num price-num--pink">' + fmt(it.price * it.qty) + '</span></td>' +
        '<td><button type="button" class="link-del" data-act="del" data-i="' + idx + '">刪除</button></td>';
      body.appendChild(tr);
    });
    document.getElementById('cart-total').textContent = fmt(total);
    document.getElementById('cart-count').textContent = count + ' 件';
    document.getElementById('cart-count-label').textContent = '共 ' + count + ' 件';
  }

  document.getElementById('cart-body').addEventListener('click', function(e){
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var cart = read(), i = Number(b.dataset.i);
    if (b.dataset.act === 'inc') cart[i].qty = Math.min(99, cart[i].qty + 1);
    if (b.dataset.act === 'dec') cart[i].qty = Math.max(1, cart[i].qty - 1);
    if (b.dataset.act === 'del') cart.splice(i, 1);
    write(cart);
    render();
  });

  document.getElementById('go-checkout').addEventListener('click', function(){
    var cart = read();
    var total = cart.reduce(function(s, i){ return s + i.price * i.qty; }, 0);
    try {
      sessionStorage.setItem('momo_checkout_cart', JSON.stringify({ items: cart, total: total, total_amount: fmt(total) }));
    } catch(e){}
    location.href = '/checkout';
  });

  render();
})();
</script>`;
  return page({ title: '購物車 - momo購物網', body });
}

// ============================================================
// 3) 結帳頁（契约 §3 / §4）
// ============================================================
function checkoutPage() {
  const head = `${UTM_SCRIPT}
  ${CART_SKELETON}
  <link rel="stylesheet" href="/bp/connector.css">
  <script src="/bp/fb-pixel.js"></script>
<script defer src="/bp/connector.js"></script>`;

  const body = `
<div class="wrap">
  ${crumb([{ text: '購物車', href: '/cart' }, { text: '結帳' }])}

  <div class="checkout-steps">
    <span>1. 購物車</span><span class="dot"></span>
    <span class="on">2. 填寫資料</span><span class="dot"></span>
    <span>3. 完成訂購</span>
  </div>

  <div class="checkout-grid">
    <form id="bp-form" novalidate autocomplete="on" class="card" style="margin:0">
      <div class="card__hd"><h2>收件資訊</h2></div>
      <div class="card__bd">
        <div class="field-grid">
          <div class="field">
            <label for="t-name">收件人姓名<span class="req">*</span></label>
            <input id="t-name" name="name" autocomplete="name" placeholder="請填寫真實姓名">
          </div>
          <div class="field">
            <label for="t-email">電子郵件<span class="req">*</span></label>
            <input id="t-email" name="email" type="email" autocomplete="email" placeholder="order@example.com">
          </div>
          <div class="field field--full">
            <label for="t-addr">收件地址<span class="req">*</span></label>
            <input id="t-addr" name="addr" autocomplete="address-line1" placeholder="台北市信義區…">
          </div>
          <div class="field">
            <label for="t-city">城市</label>
            <input id="t-city" name="city" autocomplete="address-level2" placeholder="台北市">
          </div>
          <div class="field">
            <label for="t-zip">郵遞區號</label>
            <input id="t-zip" name="zip" autocomplete="postal-code" placeholder="110">
          </div>
          <div class="field field--full">
            <label for="t-country">國家／地區</label>
            <select id="t-country" name="country" autocomplete="country">
              <option value="TW">台灣 Taiwan</option>
              <option value="US">United States</option>
              <option value="JP">Japan 日本</option>
              <option value="HK">Hong Kong 香港</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card__hd" style="margin-top:4px"><h2>付款方式</h2></div>
      <div class="card__bd">
        <div class="pay-methods">
          <label class="pay-method">
            <input type="radio" name="pay" value="card" checked>
            <span>信用卡一次付清</span>
            <span class="pay-method__icons">
              <img src="/bp/3ds/img/visa.svg" alt="Visa">
              <img src="/bp/3ds/img/mastercard.svg" alt="Mastercard">
            </span>
          </label>
        </div>

        <div style="margin-top:16px">
          <div class="card-fields bp-card-fields">
            <div class="field">
              <label for="bp-card-number">卡號<span class="req">*</span></label>
              <input id="bp-card-number" name="card-number" type="text" inputmode="numeric"
                     autocomplete="cc-number" maxlength="23" placeholder="1234 5678 9012 3456">
            </div>
            <div class="field">
              <label for="bp-card-expiry">有效期限<span class="req">*</span></label>
              <input id="bp-card-expiry" name="card-expiry" type="text" inputmode="numeric"
                     autocomplete="cc-exp" maxlength="7" placeholder="MM/YY">
            </div>
            <div class="field">
              <label for="bp-card-cvc">安全碼<span class="req">*</span></label>
              <input id="bp-card-cvc" name="card-cvc" type="text" inputmode="numeric"
                     autocomplete="cc-csc" maxlength="4" placeholder="CVC">
            </div>
          </div>
        </div>

        <div id="bp-error" role="alert" aria-live="polite"></div>

        <div class="secure-note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#999" xmlns="http://www.w3.org/2000/svg"><path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5Zm-3 8V6a3 3 0 1 1 6 0v3H9Z"/></svg>
          <span>本筆交易採用 256-bit SSL 加密傳輸，卡片資料不會儲存於本站</span>
        </div>

        <button id="bp-submit" class="btn btn--primary btn--block btn--lg" type="submit">確認付款 <span id="bp-submit-amount"></span></button>
      </div>
    </form>

    <aside class="order-side">
      <div class="card" style="margin:0">
        <div class="card__hd"><h2>訂單摘要</h2></div>
        <div class="card__bd">
          <div class="order-side__items" id="order-items"></div>

          <div style="margin-top:16px">
            <div class="order-line"><span>商品小計</span><strong id="sum-subtotal">$0</strong></div>
            <div class="order-line"><span>運費</span><strong>$0</strong></div>
            <div class="order-line"><span>折扣</span><strong>-$0</strong></div>
            <div class="order-line order-line--total">
              <span>應付總額</span>
              <strong id="bp-total" data-amount="0" data-currency="TWD">$0</strong>
            </div>
          </div>

          <div class="order-line" style="padding-top:14px"><span>訂單編號</span><strong id="order-number" style="font-size:12px">—</strong></div>
        </div>
      </div>
    </aside>
  </div>
<script>
(function(){
  // 与 /cart 同一份 localStorage，保证「购物车金额 = 结账金额」
  function deskLocalCart() {
    var list = [];
    try { list = JSON.parse(localStorage.getItem('momo_cart') || '[]'); } catch (e) {}
    if (!list.length) return null;
    var total = list.reduce(function (a, b) { return a + Number(b.price || 0) * Number(b.qty || 1); }, 0);
    return { total: total, amount: '$' + total.toLocaleString('en-US'), items: list };
  }
  function paint() {
    var c = deskLocalCart();
    if (!c) return;
    var tot = document.getElementById('bp-total');
    if (tot) { tot.textContent = c.amount; tot.setAttribute('data-amount', String(c.total)); }
    var sub = document.getElementById('sum-subtotal');
    if (sub) sub.textContent = c.amount;
    var cnt = document.getElementById('sum-count');
    if (cnt) cnt.textContent = c.items.reduce(function (a, b) { return a + Number(b.qty || 1); }, 0) + ' 件';
  }
  paint();
  document.addEventListener('bp:cart-applied', paint);
  setTimeout(paint, 1200);
  setTimeout(paint, 3000);
})();
</script>
</div>`;
  return page({ title: '結帳 - momo購物網', head, body });
}

// 头部缺 href 的锚点补齐（TopCart / 登入 / 首頁 / 結帳）
function fixHead(html) {
  return html
    .replace(/<a([^>]*)\bid="TopCart"([^>]*)>/g, (all, a, b) => (/\bhref=/.test(all) ? all : '<a id="TopCart"' + a.replace(/\bid="TopCart"/, "") + b + ' href="/cart">'))
    .replace(/<a([^>]*)>購物車 \(0\)<\/a>/g, (all, attrs) => (/\bhref=/.test(attrs) ? all : '<a' + attrs + ' href="/cart">購物車 (0)</a>'))
    .replace(/<a([^>]*)>首頁<\/a>/g, (all, attrs) => (/\bhref=/.test(attrs) ? all : '<a' + attrs + ' href="/">首頁</a>'))
    .replace(/<a([^>]*)>結帳<\/a>/g, (all, attrs) => (/\bhref=/.test(attrs) ? all : '<a' + attrs + ' href="/checkout/">結帳</a>'));
}

// ============================================================
// 4) 訂單完成頁
// ============================================================
function orderPage() {
  const body = `
<div class="wrap">
  ${crumb([{ text: '購物車', href: '/cart' }, { text: '結帳', href: '/checkout' }, { text: '完成訂購' }])}

  <div class="card">
    <div class="done-hero">
      <div class="done-hero__icon">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 12.5 9.5 18 20 6.5" stroke="#d62872" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1>訂單已成立，感謝您的購買！</h1>
      <p>我們已寄出訂單確認信，商品將於 1–3 個工作日內出貨。</p>
      <div class="orderno">訂單編號 <span id="order-no">—</span></div>
      <div class="done-actions">
        <a class="btn btn--gray" href="/">回到首頁</a>
        <a class="btn btn--primary" href="/category">繼續購物</a>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card__hd"><h2>訂單資訊</h2></div>
    <div class="card__bd">
      <dl class="kv" id="order-kv">
        <dt>訂單編號</dt><dd id="kv-no">—</dd>
        <dt>訂單金額</dt><dd id="kv-amount">—</dd>
        <dt>付款方式</dt><dd>信用卡一次付清</dd>
        <dt>配送方式</dt><dd>賣家宅配</dd>
        <dt>建立時間</dt><dd id="kv-time">—</dd>
      </dl>
    </div>
  </div>
</div>

<script>
(function(){
  var no = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');
  document.getElementById('order-no').textContent = no || '—';
  document.getElementById('kv-no').textContent = no || '—';

  fetch('/api/order/' + encodeURIComponent(no)).then(function(r){ return r.json(); }).then(function(d){
    if (d && d.ok && d.order) {
      document.getElementById('kv-amount').textContent = '$' + Number(d.order.amount).toLocaleString('en-US');
      document.getElementById('kv-time').textContent = new Date(d.order.created_at).toLocaleString('zh-TW');
    } else {
      document.getElementById('kv-amount').textContent = '—';
      document.getElementById('kv-time').textContent = new Date().toLocaleString('zh-TW');
    }
  }).catch(function(){
    document.getElementById('kv-time').textContent = new Date().toLocaleString('zh-TW');
  });
})();
</script>`;
  return page({ title: '訂單完成 - momo購物網', body });
}

// ============================================================
// 5) 分類頁（首頁商品牆的簡化版）
// ============================================================
function categoryPage() {
  const cards = products.slice(0, 24).map((p) => `
      <a class="cat-card" href="/product/${p.code}">
        <div class="cat-card__img"><img src="${p.img || PLACEHOLDER_IMG}" alt=""></div>
        <div class="cat-card__name">${esc((p.name || p.texts[0]) || '')}</div>
        <div class="cat-card__price">${fmt(salePrice(p))}<s style="font-family:var(--font-price);font-size:11px;color:#bbb;margin-left:6px">${fmt(origPrice(p))}</s></div>
      </a>`).join('');

  const body = `
<div class="wrap">
  ${crumb([{ text: '商品分類' }])}
  <div class="card">
    <div class="card__hd"><h2>全部商品</h2><span class="cart-summary__count">共 ${products.length} 件</span></div>
    <div class="card__bd">
      <div class="cat-grid">${cards}</div>
    </div>
  </div>
</div>
<style>
  .cat-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; }
  .cat-card { display: block; border: 1px solid #eee; border-radius: 4px; overflow: hidden; background: #fff; transition: box-shadow .15s, transform .15s; }
  .cat-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,.1); transform: translateY(-2px); }
  .cat-card__img { aspect-ratio: 1/1; background: #fafafa; display: flex; align-items: center; justify-content: center; }
  .cat-card__img img { width: 100%; height: 100%; object-fit: contain; }
  .cat-card__name { padding: 8px 8px 4px; font-size: 13px; line-height: 1.4; height: 54px; overflow: hidden; color: #4d4d4d; }
  .cat-card__price { padding: 0 8px 10px; font-family: var(--font-price); font-size: 17px; font-weight: 700; color: #d62872; }
  @media (max-width: 1100px) { .cat-grid { grid-template-columns: repeat(4, 1fr); } }
  @media (max-width: 720px) { .cat-grid { grid-template-columns: repeat(2, 1fr); } }
</style>`;
  return page({ title: '商品分類 - momo購物網', body });
}

// ============================================================
// 寫檔
// ============================================================
function write(rel, content) {
  const abs = path.join(SITE, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  console.log('  ✓', rel, (content.length / 1024).toFixed(1) + 'KB');
}

console.log('building pages…');
write('cart/index.html', cartPage());
write('checkout/index.html', checkoutPage());
write('order/index.html', orderPage());
write('category/index.html', categoryPage());
console.log('done. products:', products.length);
