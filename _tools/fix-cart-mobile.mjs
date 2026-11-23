/**
 * 手机结账页：同样的 cart 契约修复（缩进不同，单独处理）
 */
import fs from 'node:fs';

const BLOCK = `<!-- 从购物车页带过来的真实商品，覆写骨架（否则会显示服务端兜底购物车） -->
<script>
(function(){
  try {
    // 契约 §5.1：数据到了原地 mutate，不换对象
    var b = window.__BP_CART__;
    if (!b) return;

    // 购物车页写的是 localStorage.momo_cart（sessionStorage 只在点「前往結帳」时才有）
    var list = [];
    try { list = JSON.parse(localStorage.getItem('momo_cart') || '[]'); } catch (e) { list = []; }
    if (!Array.isArray(list) || !list.length) {
      try { list = JSON.parse(sessionStorage.getItem('momo_checkout_cart') || '[]').items || []; } catch (e) { list = []; }
    }
    if (!list.length) return;

    var total = list.reduce(function (a, x) { return a + Number(x.price || 0) * Number(x.qty || 1); }, 0);
    b.items = list.map(function (x) { return { name: x.name, qty: x.qty || 1, price: Number(x.price) || 0 }; });
    b.total = total;                                       // 整数分（TWD 无小数）
    b.total_amount = '$' + total.toLocaleString('en-US');   // 必须与 #bp-total 文本一致
    b.currency = 'TWD';
    b.locale = document.documentElement.lang || 'zh-TW';

    if (!b.order_number) {
      var d = new Date();
      var pad = function (n) { return String(n).padStart(2, '0'); };
      var rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
      b.order_number = 'ORD-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + rnd;
    }
  } catch (e) {}
})();
</script>`;

for (const f of ['site/m/checkout/index.html', '_tools/build-mobile.mjs']) {
  if (!fs.existsSync(f)) { console.log('缺文件:', f); continue; }
  let s = fs.readFileSync(f, 'utf8');
  const start = s.indexOf('<!-- 从购物车页带过来的真实商品');
  if (start < 0) { console.log('未找到:', f); continue; }
  const end = s.indexOf('</script>', s.indexOf('})();', start)) + '</script>'.length;
  const old = s.slice(start, end);
  s = s.slice(0, start) + BLOCK + s.slice(end);
  fs.writeFileSync(f, s, 'utf8');
  console.log(`已修复 ${f}（${old.length} → ${BLOCK.length} 字符）`);
}
