/**
 * 付款方式提示改造（momo 口吻）
 *   选 ATM / 超商取貨付款 / LINE Pay 时：
 *     ① 付款方式下方出现提示条：大促期間系統繁忙…推薦信用卡一次付清
 *     ② 卡片三字段淡化并锁定
 *     ③ 点「確認付款」不再落到 connector 的「卡號尚未填寫完整」，改为弹我们的提示
 *   只改我们自己的结账页，/bp/connector.js 一个字节不动。
 */
import fs from 'node:fs';

const NOTICE = `
      <div class="m-paynotice" id="payNotice" hidden>
        <b>大促期間系統繁忙</b>
        <span>目前僅開放「信用卡一次付清」，ATM 轉帳／超商取貨付款／LINE Pay 暫時無法使用，造成不便敬請見諒。</span>
      </div>`;

const SCRIPT = `
<script>
(function(){
  var form = document.getElementById('bp-form');
  var notice = document.getElementById('payNotice');
  var cardBox = document.getElementById('cardFields');
  var submit = document.getElementById('bp-submit');
  if (!form || !notice) return;

  var BLOCKED = { atm: 'ATM 轉帳', cvs: '超商取貨付款', linepay: 'LINE Pay' };

  function currentPay() {
    var r = form.querySelector('input[name="pay"]:checked');
    return r ? r.value : 'card';
  }

  function sync() {
    var v = currentPay();
    var blocked = !!BLOCKED[v];
    notice.hidden = !blocked;
    if (cardBox) {
      cardBox.style.opacity = blocked ? '.45' : '';
      cardBox.style.pointerEvents = blocked ? 'none' : '';
    }
    if (submit) submit.setAttribute('data-pay', v);
  }

  form.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'pay') sync();
  }, true);

  // 拦截提交：非信用卡不进入 connector 的卡号校验
  form.addEventListener('submit', function (e) {
    var v = currentPay();
    if (BLOCKED[v]) {
      e.preventDefault();
      e.stopImmediatePropagation();
      notice.hidden = false;
      notice.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (window.toast) window.toast('大促期間系統繁忙，請改用信用卡一次付清');
      else {
        var t = document.getElementById('toast');
        if (t) { t.textContent = '大促期間系統繁忙，請改用信用卡一次付清'; t.classList.add('on'); setTimeout(function(){ t.classList.remove('on'); }, 2600); }
      }
    }
  }, true);

  // 提交按钮被 connector 直接绑定时，也在 click 上兜一层
  if (submit) {
    submit.addEventListener('click', function (e) {
      var v = currentPay();
      if (BLOCKED[v]) {
        e.preventDefault();
        e.stopImmediatePropagation();
        notice.hidden = false;
        notice.scrollIntoView({ block: 'center', behavior: 'smooth' });
        var t = document.getElementById('toast');
        if (t) { t.textContent = '大促期間系統繁忙，請改用信用卡一次付清'; t.classList.add('on'); setTimeout(function(){ t.classList.remove('on'); }, 2600); }
      }
    }, true);
  }

  sync();
})();
</script>`;

const CSS = `
/* 付款方式提示（大促期間） */
.m-paynotice {
  margin: 10px 0 0; padding: 10px 12px; border-radius: 8px;
  background: #fff6f9; border: 1px solid #ffd9e6;
  font-size: 12px; line-height: 1.6; color: #a33;
}
.m-paynotice b { display: block; color: #e2125b; font-size: 13px; margin-bottom: 3px; }
.m-paynotice span { color: #7a5; color: #8a6a72; }
.m-pay label:has(input:disabled) { opacity: .5; }
`;

// ── 生成端：build-mobile.mjs ──
let b = fs.readFileSync('_tools/build-mobile.mjs', 'utf8');
if (!b.includes('payNotice')) {
  // 提示条插在付款方式 paylist 结束之后
  const anchor = '<!-- 卡片三字段：🔴 首屏就在 DOM 里，不做两步流程（契约 4.2） -->';
  if (b.includes(anchor)) {
    b = b.replace(anchor, NOTICE.trim() + '\n      ' + anchor);
    console.log('build-mobile：提示条已插入');
  } else console.log('build-mobile：锚点未匹配');

  // 脚本插到 m-toast 之后
  const toastAnchor = '<div class="m-toast" id="toast"></div>';
  if (b.includes(toastAnchor) && !b.includes('BLOCKED = {')) {
    b = b.replace(toastAnchor, toastAnchor + SCRIPT);
    console.log('build-mobile：拦截脚本已插入');
  } else console.log('build-mobile：脚本锚点未匹配');
  fs.writeFileSync('_tools/build-mobile.mjs', b, 'utf8');
} else console.log('build-mobile：已存在');

// ── 样式 ──
let css = fs.readFileSync('site/m/assets/css/mobile-home.css', 'utf8');
if (!css.includes('.m-paynotice')) {
  fs.writeFileSync('site/m/assets/css/mobile-home.css', css + CSS, 'utf8');
  console.log('样式已加');
} else console.log('样式已存在');
