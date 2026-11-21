/**
 * 按目标站点（m.momoshop.com.tw）手机版首页结构重排首页
 *
 * 结构来自用户提供的真机截图：
 *   1. 头部：☰ + 「新品」标 + 搜索框 + 消息
 *   2. 导航：首頁 / 限時搶購 / 直播 / mo店+ / 看看買 / 家▾
 *   3. 双栏活动位：左 moPro 會員專屬價，右 品牌聯盟（2×2）
 *   4. 22 限定價 圆形横滑条
 *   5. 桃金日 整宽横幅
 *   6. 訂閱moPro / 滿額送 两卡
 *   7. 图标行：領券 秒殺 簽到 限搶 看更多
 *   8. 商品楼层
 *   9. 底部 tabbar：首頁 逛逛 追蹤清單 購物車 會員中心
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const F = path.join(PROJ, '_tools', 'build-mobile.mjs');
let s = fs.readFileSync(F, 'utf8');

// ── 1. 定位并替换 homePage ──
const a = s.indexOf('function homePage()');
let i = a + 10, depth = 0, end = -1;
for (; i < s.length; i++) {
  if (s[i] === '{') depth++;
  else if (s[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
if (a < 0 || end < 0) { console.error('找不到 homePage'); process.exit(1); }

const NEW_HOME = String.raw`function homePage() {
  const img = (u) => u;
  const P = (code) => '/m/product/' + code;
  const plat = (n) => '/m/category?cat=' + encodeURIComponent(n);
  const cat = JSON.parse(fs.readFileSync(path.join(PROJ, 'site/data/catalog.json'), 'utf8'));

  // 取几个商品做图（保证图片真实存在）
  const pick = (n, k) => cat.items.filter((x) => x.cat === n && x.img).slice(0, k);
  const hot = pick('3C週邊', 4);

  const body = ${'`'}${'$'}{header({ navCurrent: '首頁', cartCount: 3 })}

<section class="m-duo">
  <a class="m-duo__left" href="${'$'}{plat('保健/醫療')}">
    <div class="m-duo__brand">moPro</div>
    <div class="m-duo__title">會員專屬價</div>
    <div class="m-duo__sub">BRITA 濾芯 10 入</div>
    <img src="${'$'}{hot[0] ? hot[0].img : '/assets/img/logo.svg'}" alt="">
    <span class="m-duo__stamp">專屬價</span>
    <div class="m-duo__price"><b>$1,799</b><s>$3,558</s></div>
  </a>
  <div class="m-duo__right">
    <div class="m-duo__rhd">品牌聯盟</div>
    <div class="m-duo__grid">
      <a href="${'$'}{plat('手機/相機')}"><img src="${'$'}{hot[1] ? hot[1].img : ''}" alt=""><span>iPhone<br>登記抽999</span></a>
      <a href="${'$'}{plat('個人清潔')}"><img src="${'$'}{hot[2] ? hot[2].img : ''}" alt=""><span>高露潔<br>7折起</span></a>
      <a href="${'$'}{plat('保健/醫療')}"><img src="${'$'}{hot[3] ? hot[3].img : ''}" alt=""><span>好好生醫<br>滿額多重送</span></a>
      <a href="${'$'}{plat('戶外')}"><img src="${'$'}{hot[0] ? hot[0].img : ''}" alt=""><span>TNF北面<br>全館5折up</span></a>
    </div>
  </div>
</section>

<section class="m-limit">
  <div class="m-limit__hd"><b>22</b><span>限定價</span></div>
  <div class="m-limit__row">
    <a href="${'$'}{plat('家具收納')}"><i><img src="${'$'}{pick('家具收納', 1)[0] ? pick('家具收納', 1)[0].img : ''}" alt=""></i><b>家居生活</b><span>抽iPhone</span></a>
    <a href="${'$'}{plat('旅遊/票券')}"><i><img src="${'$'}{pick('旅遊/票券', 1)[0] ? pick('旅遊/票券', 1)[0].img : ''}" alt=""></i><b>休閒旅遊</b><span>銅板價</span></a>
    <a href="${'$'}{plat('母嬰/玩具')}"><i><img src="${'$'}{pick('母嬰/玩具', 1)[0] ? pick('母嬰/玩具', 1)[0].img : ''}" alt=""></i><b>日用婦幼</b><span>抽iPhone</span></a>
    <a href="${'$'}{plat('食品/飲料')}"><i><img src="${'$'}{pick('食品/飲料', 1)[0] ? pick('食品/飲料', 1)[0].img : ''}" alt=""></i><b>熱銷爆品</b><span>抽年菜</span></a>
    <a href="/m/category"><i><img src="${'$'}{pick('家電', 1)[0] ? pick('家電', 1)[0].img : ''}" alt=""></i><b>新品上市</b><span>搶先看</span></a>
  </div>
</section>

<a class="m-taojin" href="${'$'}{plat('家電')}">
  <div class="m-taojin__l"><b>moPro</b><span>專屬價48折</span></div>
  <div class="m-taojin__c"><b>加碼送$1000</b><i>最後一天600</i></div>
  <div class="m-taojin__r"><b>家電特賣</b><span>加碼送3150</span></div>
</a>

<section class="m-two">
  <a href="/info/member-center"><b>訂閱moPro</b><span>直領<em>$1080</em></span></a>
  <a href="${'$'}{plat('食品/飲料')}"><b>滿額送</b><span>限量電子雞</span></a>
</section>

<nav class="m-ico-row">
  <a href="/info/coupons"><span class="gi" style="color:#FF5A5F"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5v1a2.5 2.5 0 0 0 0 5v1a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 15.5v-1a2.5 2.5 0 0 0 0-5v-1Z"/></svg></span>領券</a>
  <a href="/m/category"><span class="gi" style="color:#4C8DFF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg></span>秒殺</a>
  <a href="/info/member-center"><span class="gi" style="color:#FF8A3D"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="m9 15 2 2 4-4"/></svg></span>簽到</a>
  <a href="${'$'}{plat('家電')}"><span class="gi" style="color:#FFC53D"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/></svg></span>限搶</a>
  <a href="/m/category"><span class="gi" style="color:#8A8A8A"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></span>看更多</a>
</nav>

${'$'}{pick('家電', 6).length ? `
<section class="m-sec">
  <div class="m-sec__hd">
    <h2>限時搶購<span class="m-sec__count">02:07:03</span></h2>
    <a class="more" href="${'$'}{plat('家電')}">看更多 ${'$'}{ICO.chev}</a>
  </div>
  <div class="m-goods">${'$'}{pick('家電', 6).map((p, k) => mCard(p, k)).join('')}</div>
</section>` : ''}

${'$'}{pick('食品/飲料', 6).length ? `
<section class="m-sec">
  <div class="m-sec__hd">
    <h2>11.11 降價好貨</h2>
    <a class="more" href="${'$'}{plat('食品/飲料')}">看更多 ${'$'}{ICO.chev}</a>
  </div>
  <div class="m-goods">${'$'}{pick('食品/飲料', 6).map((p, k) => mCard(p, k)).join('')}</div>
</section>` : ''}

<section class="m-sec">
  <div class="m-sec__hd"><h2>momo熱搜榜</h2><a class="more" href="/m/category">看全部 ${'$'}{ICO.chev}</a></div>
  <ol class="m-rank">
    ${'$'}{['iphone 17', '衛生紙', '行動電源', '除濕機', '面膜', '洗衣精', '空氣清淨機', '藍牙耳機'].map((k, k2) => `<li><span class="num">${'$'}{k2 + 1}</span><a href="/m/category?kw=${'$'}{encodeURIComponent(k)}">${'$'}{k}</a><span class="hot">熱度${'$'}{(2736 - k2 * 397).toLocaleString('en-US')}萬</span></li>`).join('')}
  </ol>
</section>

<div class="m-safe"></div>
${'$'}{tabbar('首頁')}`;
  return shell({ title: 'momo購物網 - 好評推薦 - 手機版', head: UTM_SCRIPT, body });
}`;

s = s.slice(0, a) + NEW_HOME + s.slice(end);
fs.writeFileSync(F, s, 'utf8');
console.log('homePage 已重写');
