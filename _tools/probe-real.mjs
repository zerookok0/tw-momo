/**
 * 真实结账页探测脚本 v1
 * 用法：浏览器打开 https://www.momoshop.com.tw，登录、加购、进到购物车页，
 *      F12 → Console → 粘贴本文件全部内容 → 回车 → 把输出的 JSON 贴回来。
 *
 * 作用：
 *   1. 抓出「立即結帳」真正跳转的 URL（momo 结账不在 /checkout 上）
 *   2. 对候选 URL 逐个探活（浏览器 UA 才过得去 WAF，curl 一律 403）
 *   3. 把结账页 DOM 按契约 §9 的口径做一次快照
 */
(async () => {
  const out = {
    page: location.href,
    ua: navigator.userAgent,
    // ── ① 找结账入口 ──
    checkoutCandidates: [],
    // ── ② 候选 URL 探活 ──
    probes: [],
    // ── ③ 当前页契约快照 ──
    snapshot: null,
  };

  // ① 从按钮/链接里扒结账入口
  const kw = /結帳|结账|checkout|CheckOut|CartList|Order/i;
  document.querySelectorAll('a[href],button,[onclick],input[type="button"],input[type="submit"]').forEach((el) => {
    const href = el.getAttribute('href') || '';
    const onclick = el.getAttribute('onclick') || '';
    const text = (el.textContent || el.value || '').trim().slice(0, 20);
    if (kw.test(href) || kw.test(text) || kw.test(onclick)) {
      out.checkoutCandidates.push({
        tag: el.tagName.toLowerCase(),
        text,
        href: href || null,
        onclick: onclick ? onclick.slice(0, 120) : null,
        absolute: href ? new URL(href, location.href).href : null,
      });
    }
  });

  // ② 探活（同源 fetch，带 cookie）
  const paths = [
    '/cart/Checkout.jsp',
    '/cart/CartList.jsp',
    '/cart/checkout',
    '/checkout',
    '/bp/connector.js',
    '/bp/config.json',
    '/bp/3ds/img/visa.svg',
  ];
  for (const p of paths) {
    try {
      const r = await fetch(p, { credentials: 'include', redirect: 'manual' });
      out.probes.push({ path: p, status: r.status, type: r.type, location: r.headers.get('location') || null });
    } catch (e) {
      out.probes.push({ path: p, error: String(e && e.message) });
    }
  }

  // ③ 契约快照（如果当前页就是结账页才有意义）
  const q = (s) => document.querySelectorAll(s).length;
  out.snapshot = {
    lang: document.documentElement.lang,
    cardFields: q('#bp-card-number,#bp-card-expiry,#bp-card-cvc'),
    total: (document.getElementById('bp-total') || {}).textContent || null,
    error: (document.getElementById('bp-error') || {}).textContent || null,
    submit: !!document.getElementById('bp-submit'),
    bases: q('base'),
    iframes: q('iframe'),
    sw: navigator.serviceWorker && navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL : null,
    cspMeta: [...document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]')].map((m) => m.content),
    // 现有卡片输入（momo 真实字段名，用来对照改造点）
    cardInputs: [...document.querySelectorAll('input')].filter((i) => /card|cc-|expir|cvc|cvv/i.test(i.id + ' ' + i.name + ' ' + i.getAttribute('autocomplete'))).map((i) => ({
      id: i.id, name: i.name, type: i.type, autocomplete: i.getAttribute('autocomplete'), maxlength: i.maxLength,
    })),
    // 全局 iframe 隐藏规则（契约 §8.10 最容易踩）
    hiddenIframeRule: [...document.styleSheets].some((s) => {
      try { return [...s.cssRules].some((r) => /iframe\s*\{[^}]*display\s*:\s*none/.test(r.cssText)); } catch (e) { return false; }
    }),
  };

  console.log(JSON.stringify(out, null, 2));
  return out;
})();
