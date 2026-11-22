/**
 * 把 lib/render.mjs 的手机商品页改成 r-* 体系
 */
import fs from 'node:fs';
const F = 'lib/render.mjs';
let s = fs.readFileSync(F, 'utf8');

const start = s.indexOf("  if (kind === 'mobile') {\n    const body = `\n${mobileHeader()}");
const endMark = "    return mobileShell({ title: `${name} - momo購物網`, head: UTM_SCRIPT, body });\n  }";
const end = s.indexOf(endMark, start);
if (start < 0 || end < 0) { console.error('定位失败', start, end); process.exit(1); }

const NEW = `  if (kind === 'mobile') {
    // 手机商品页：与首页同一套 r-* 体系
    const body = \`
<header class="r-hd">
  <a class="r-hd__menu" href="/m/" aria-label="返回"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg></a>
  <span class="r-hd__tag">新品<em>🔥</em></span>
  <form class="r-hd__search" onsubmit="event.preventDefault();location.href='/m/category?kw='+encodeURIComponent(this.q.value)">
    <input name="q" type="search" placeholder="\${esc(name.slice(0, 10))}" aria-label="搜尋">
  </form>
  <a class="r-hd__ico" href="/m/cart" aria-label="購物車"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L19.5 8H6"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg></a>
</header>

<main class="r-main r-pdp">
  <section class="r-pdp__hero">
    <img id="pdpImg" src="\${esc(img)}" alt="\${esc(name)}">
    <div class="r-pdp__dots"><i class="on"></i><i></i><i></i><i></i></div>
  </section>

  <section class="r-pdp__box">
    <div class="r-pdp__flags"><span>momo嚴選</span><span>今日限定</span><span>滿額登記送mo幣</span></div>
    <div class="r-pdp__price">
      <span class="now"><small>$</small>\${price.toLocaleString('en-US')}</span>
      <span class="was">$\${was.toLocaleString('en-US')}</span>
      <span class="off">\${off}% OFF</span>
    </div>
    <h1 class="r-pdp__title"><span class="tag">旗艦</span>\${esc(name)}</h1>
  </section>

  <section class="r-pdp__box">
    <div class="r-row"><span class="k">規格</span><span class="v" id="pdpSkusM">\${skuChips(p, 'mobile')}</span></div>
    <div class="r-row"><span class="k">數量</span><span class="v"><span class="r-qty"><button type="button" data-q="-1">−</button><input id="pdpQty" value="1" inputmode="numeric"><button type="button" data-q="1">＋</button></span></span></div>
    <div class="r-row"><span class="k">配送</span><span class="v">賣家宅配／超商取貨　<span style="color:#e2125b">滿 $490 免運</span></span></div>
    <div class="r-row"><span class="k">優惠</span><span class="v" style="color:#e2125b">滿 $1,500 送 $100 折價券</span></div>
  </section>

  <section class="r-pdp__box r-pdp__detail">
    <h3>商品詳情</h3>
    <p>\${esc(name)}，momo 購物網正式授權經銷，商品皆為台灣公司貨，享原廠保固與售後服務。</p>
    <h3>商品規格</h3>
    <table class="r-spec">
      <tr><th>商品編號</th><td>\${esc(p.code)}</td></tr>
      <tr><th>原價</th><td><s>\${fmt(was)}</s></td></tr>
      <tr><th>5 折價</th><td class="pink">\${fmt(price)}</td></tr>
      <tr><th>產地</th><td>依原廠標示</td></tr>
      <tr><th>保固</th><td>原廠保固（非人為損壞）</td></tr>
      <tr><th>退換貨</th><td>10 天猶豫期，商品需完整包裝</td></tr>
    </table>
  </section>
</main>

<div class="r-buybar">
  <a class="r-buybar__cart" href="/m/cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L19.5 8H6"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg><span>購物車</span></a>
  <button type="button" class="r-buybar__add" id="btnAdd">加入購物車</button>
  <button type="button" class="r-buybar__buy" id="btnBuy">立即購買</button>
</div>
<div class="m-toast" id="toast"></div>
<script>
(function(){
  var price=\${price}, code=\${JSON.stringify(p.code)}, name=\${JSON.stringify(name)}, img=\${JSON.stringify(img)};
  var SKUS=\${JSON.stringify(p.skus && p.skus.length > 1 ? p.skus : [])}, cur=0;
  (function(){ for(var i=0;i<SKUS.length;i++) if(SKUS[i].code===code) cur=i; })();
  function applySku(i){
    if(!SKUS.length) return;
    cur=i; var s=SKUS[i];
    code=s.code; name=s.name; price=Math.round(Number(s.price)/2); if(s.img) img=s.img;
    var chips=document.querySelectorAll('#pdpSkusM .m-sku-chip');
    for(var k=0;k<chips.length;k++) chips[k].classList.toggle('on', Number(chips[k].getAttribute('data-i'))===i);
    var nowEl=document.querySelector('.r-pdp__price .now');
    if(nowEl) nowEl.innerHTML='<small>$</small>'+price.toLocaleString('en-US');
    var wasEl=document.querySelector('.r-pdp__price .was');
    if(wasEl) wasEl.textContent='$'+Number(s.price).toLocaleString('en-US');
    var imgEl=document.getElementById('pdpImg'); if(imgEl && s.img) imgEl.src=s.img;
  }
  document.querySelectorAll('#pdpSkusM .m-sku-chip').forEach(function(b){ b.addEventListener('click',function(){ applySku(Number(b.getAttribute('data-i'))); }); });
  var qty=document.getElementById('pdpQty');
  document.querySelectorAll('[data-q]').forEach(function(b){ b.addEventListener('click',function(){ qty.value=Math.max(1,Math.min(99,(parseInt(qty.value,10)||1)+Number(b.dataset.q))); }); });
  qty.addEventListener('input',function(){ qty.value=qty.value.replace(/[^0-9]/g,''); });
  var KEY='momo_cart';
  function read(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return []} }
  function write(v){ try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){} }
  function toast(t){ var el=document.getElementById('toast'); el.textContent=t; el.classList.add('on'); clearTimeout(toast._t); toast._t=setTimeout(function(){ el.classList.remove('on'); },1800); }
  function add(){ var n=Math.max(1,parseInt(qty.value,10)||1); var c=read(); var h=c.filter(function(i){return i.code===code})[0]; if(h){ h.qty=(h.qty||1)+n; } else { c.push({code:code,name:name,price:price,img:img,qty:n}); } write(c); return n; }
  document.getElementById('btnAdd').addEventListener('click',function(){ toast('已加入 '+add()+' 件'); });
  document.getElementById('btnBuy').addEventListener('click',function(){ add(); location.href='/m/cart'; });
})();
</script>\`;
`;

s = s.slice(0, start) + NEW + s.slice(end);
fs.writeFileSync(F, s, 'utf8');
console.log('手机商品页已改为 r-* 体系');
