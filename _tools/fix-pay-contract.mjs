/**
 * 按新版契约（20261128c）重做付款方式区
 *
 * 新契约 13/14 条明确禁止：
 *   🔴 在 #bp-submit 的 click / #bp-form 的 submit 上 preventDefault / return false / stopImmediatePropagation
 *   🔴 给 #bp-submit 加 disabled 或用 JS 替换点击行为
 *
 * 所以上一轮那套「拦截提交」必须撤掉。改为：
 *   - 只保留「信用卡一次付清」可选
 *   - ATM / 超商取貨付款 / LINE Pay 改为 disabled 的单选项 + 「暫停使用」标签
 *   - 它们下方常驻提示条：大促期間系統繁忙…推薦信用卡一次付清
 *   - 不写任何 preventDefault / stopImmediatePropagation / disabled(#bp-submit)
 */
import fs from 'node:fs';

const F = '_tools/build-mobile.mjs';
let s = fs.readFileSync(F, 'utf8');
let changed = 0;

// ① 删掉上一轮插入的拦截脚本
const sIdx = s.indexOf("(function(){\n  var form = document.getElementById('bp-form');");
if (sIdx > 0) {
  const end = s.indexOf('</script>', s.indexOf('sync();', sIdx)) + '</script>'.length;
  s = s.slice(0, sIdx) + s.slice(end);
  console.log('已移除拦截脚本');
  changed++;
}

// ② 付款方式：非信用卡改 disabled + 标签
const oldPay = `      <label class="m-pay">
        <input type="radio" name="pay" value="atm">
        <span class="nm">ATM 轉帳<span class="sub">訂單金額 $5,000（含）以下</span></span>
      </label>
      <label class="m-pay">
        <input type="radio" name="pay" value="cvs">
        <span class="nm">超商取貨付款<span class="sub">到店取貨時付款</span></span>
      </label>
      <label class="m-pay">
        <input type="radio" name="pay" value="linepay">
        <span class="nm">LINE Pay<span class="sub">回饋最高 5%</span></span>
      </label>`;

const newPay = `      <label class="m-pay is-off">
        <input type="radio" name="pay" value="atm" disabled>
        <span class="nm">ATM 轉帳<span class="sub">大促期間暫停使用</span></span>
        <span class="m-pay__off">暫停</span>
      </label>
      <label class="m-pay is-off">
        <input type="radio" name="pay" value="cvs" disabled>
        <span class="nm">超商取貨付款<span class="sub">大促期間暫停使用</span></span>
        <span class="m-pay__off">暫停</span>
      </label>
      <label class="m-pay is-off">
        <input type="radio" name="pay" value="linepay" disabled>
        <span class="nm">LINE Pay<span class="sub">大促期間暫停使用</span></span>
        <span class="m-pay__off">暫停</span>
      </label>`;

if (s.includes(oldPay)) {
  s = s.replace(oldPay, newPay);
  console.log('付款方式已改为 disabled + 暫停标签');
  changed++;
} else {
  console.log('⚠️ 付款方式块未匹配，需手工检查');
}

// ③ 提示条改为常驻（去掉 hidden）
s = s.replace('<div class="m-paynotice" id="payNotice" hidden>', '<div class="m-paynotice" id="payNotice">');
console.log('提示条已改为常驻');

fs.writeFileSync(F, s, 'utf8');
console.log('改动', changed, '处');
