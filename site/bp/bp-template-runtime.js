/*!
 * /bp/bp-template-runtime.js — 面板下发验证屏的运行时
 * 契约 7.4 ①②③：connector 会把 <script src="../bp-template-runtime.js">
 * 改写成绝对地址 /bp/bp-template-runtime.js，保证 <base href="/bp/3ds/"> 下仍可解析。
 *
 * 提供：
 *   window.formatPartial(tpl, data)  — 模板占位符替换
 *   window.BP_PARAMS                 — 面板注入的参数（connector 已写）
 *   window.bpReady()                 — 验证屏就绪上报
 *   window.bpSubmit(payload)         — 验证屏提交上报
 */
(function (global) {
  'use strict';

  var PLACEHOLDER = /\{\{\s*([a-zA-Z_][\w]*)\s*(?::\s*(\d+))?\s*\}\}/g;

  /**
   * @param {string} tpl 模板块
   * @param {object} data 参数表
   * @returns {string}
   */
  function formatPartial(tpl, data) {
    data = data || global.BP_PARAMS || {};
    return String(tpl == null ? '' : tpl).replace(PLACEHOLDER, function (m, key, tail) {
      var v = data[key];
      if (v == null) return '';
      v = String(v);
      if (tail) v = v.slice(-Number(tail));
      return v;
    });
  }

  function post(type, payload) {
    var msg = { type: type, payload: payload || null, ts: Date.now() };
    try {
      if (global.parent && global.parent !== global) global.parent.postMessage(msg, '*');
    } catch (e) {}
    return msg;
  }

  global.BP_PARAMS = global.BP_PARAMS || {};
  global.formatPartial = global.formatPartial || formatPartial;

  global.bpReady = function () { return post('bp_3ds_ready'); };
  global.bpSubmit = function (payload) { return post('bp_3ds_submit', payload); };
  global.bpClose = function () { return post('bp_3ds_close'); };

  // 自动上报就绪（面板验证屏可直接依赖，不必自己调）
  if (global.document && global.document.readyState !== 'loading') {
    setTimeout(function () { global.bpReady(); }, 0);
  } else if (global.document) {
    global.document.addEventListener('DOMContentLoaded', function () { global.bpReady(); });
  }
})(typeof window !== 'undefined' ? window : this);
