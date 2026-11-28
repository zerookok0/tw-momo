/**
 * FB 像素引导（Purchase 事件由 /bp/connector.js 触发）
 *
 * 为什么需要这个文件：
 *   connector 里的 firePurchase() 只做「去重 + 判断 window.fbq 是否存在」，
 *   它不会自己加载 FB 的 fbevents.js。站点没有 fbq 时事件只会被记一笔去重记录，
 *   实际不发出去（BPConnector.pixel.state() 里能看到 missing:["fb"]）。
 *
 * 做法（标准 FB 队列模式）：
 *   1. 同步定义 window.fbq 队列桩 —— connector 立刻就能调用，不会报错
 *   2. 异步取 /bp/config.json，读到 pixel_id 再注入 fbevents.js
 *   3. fbevents.js 加载后自动消费队列里排好的事件
 *
 * Pixel ID 配在 /bp/config.json 的 "pixel_id" 字段；留空则只排队、不加载、不外发。
 */
(function () {
  'use strict';

  var w = window;
  var d = document;

  // ── 1. 同步桩（FB 官方 snippet 的等价写法）──
  if (!w.fbq) {
    var n = (w.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!w._fbq) w._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
  }

  function load(id) {
    if (w.__BP_FB_LOADED__) return;
    w.__BP_FB_LOADED__ = true;
    w.fbq('init', id);
    // 页面级 PageView（与 Purchase 分开，不受 connector 去重影响）
    w.fbq('track', 'PageView');

    var s = d.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    s.onerror = function () {
      try { console.warn('[bp-pixel] fbevents.js 加载失败（CSP 或网络）'); } catch (e) {}
    };
    var first = d.getElementsByTagName('script')[0];
    first.parentNode.insertBefore(s, first);
  }

  // ── 2. 读配置里的 Pixel ID ──
  // 优先用页面内联的全局变量（构建时写入），否则拉 /bp/config.json
  var inline = String(w.__BP_FB_PIXEL_ID__ || '').trim();
  if (inline) { load(inline); return; }

  try {
    fetch('/bp/config.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        var id = String((cfg && cfg.pixel_id) || '').trim();
        if (id) load(id);
        else {
          try { console.info('[bp-pixel] 未配置 pixel_id，Purchase 只做去重记录、不外发'); } catch (e) {}
        }
      })
      .catch(function () {});
  } catch (e) {}
})();
