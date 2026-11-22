/**
 * 生成站内实体页：/info/<slug>、/member、/member/login
 *
 * 背景：页脚与顶部导航原本全是 href="#"（抓取时把 momo 的绝对链接改写了），
 * 点不动。这里为每个链接目标做真实页面，风格沿用站点 header/footer。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(__dirname, '..');
const SITE = path.join(PROJ, 'site');

const header = fs.readFileSync(path.join(SITE, '_partials', 'header.html'), 'utf8');
const footer = fs.readFileSync(path.join(SITE, '_partials', 'footer.html'), 'utf8');
const UTM = fs.readFileSync(path.join(PROJ, '_tools', 'frag-utm.html'), 'utf8');

const CSS = [
  '/assets/www.momoshop.com.tw/search/_next/static/css/b36616395eb7bd31.css',
  '/assets/www.momoshop.com.tw/search/_next/static/css/62f82080ec5074dd.css',
  '/assets/www.momoshop.com.tw/search/_next/static/css/046394d9bcfe3529.css',
  '/assets/image.momoshop.com.tw/ecm/font/theme-main.css',
  '/assets/css/momo-pages.css',
  '/assets/css/momo-info.css',
];

// ── 页面内容 ──
const PAGES = {
  about: {
    title: '關於我們',
    intro: 'momo 購物網（富邦媒，momo.com Inc.）成立於 2004 年，是台灣線上零售龍頭，提供 3C、家電、美妝、服飾、食品、保健、生活用品等數百萬件商品。',
    sections: [
      { h: '公司沿革', p: ['2004 年成立，2005 年 momo 購物網正式上線。', '2014 年於台灣證券交易所掛牌上市（股票代號 8454）。', '2017 年推出 momo 購物台與行動購物 APP，深耕行動商務。', '2020 年起連續多年營收突破千億元。'] },
      { h: '我們的堅持', ul: ['全館商品皆為公司貨，附發票與保固', '24 小時快速到貨，雙北地區最快 6 小時', '10 天猶豫期，退換貨免運費', '客服全年無休'] },
      { h: '聯絡資訊', p: ['客服專線：0800-777-616', '服務時間：每日 09:00–18:00', '公司地址：台北市內湖區洲子街 96 號 4 樓'] },
    ],
  },
  privacy: {
    title: '客戶隱私權政策',
    intro: 'momo 購物網重視您的個人資料保護，依《個人資料保護法》規範蒐集、處理與利用您的個人資料。',
    sections: [
      { h: '一、蒐集目的', p: ['商品配送、售後服務、會員管理、行銷活動通知、消費爭議處理。'] },
      { h: '二、蒐集類別', ul: ['辨識個人者：姓名、電話、地址、電子郵件', '辨識財務者：信用卡末四碼、付款方式', '政府資料中之辨識者：統一編號（開立發票用）'] },
      { h: '三、利用期間與地區', p: ['期間：自您成為會員起至帳號刪除或契約終止後一年。', '地區：台灣地區及商品配送所需之境外地區。'] },
      { h: '四、您的權利', ul: ['查詢或請求閱覽', '請求製給複製本', '請求補充或更正', '請求停止蒐集、處理或利用', '請求刪除'] },
    ],
  },
  terms: {
    title: '客戶權利義務',
    intro: '使用 momo 購物網服務前，請詳閱以下權利義務說明；完成註冊或交易即視為同意。',
    sections: [
      { h: '交易成立', p: ['本站商品頁面之標示僅為要約之引誘，您送出訂單後，本站以電子郵件或簡訊確認出貨時，契約始成立。'] },
      { h: '價格與標示', p: ['若因系統錯誤導致標價明顯不合理，本站得於出貨前通知取消訂單並全額退款。'] },
      { h: '會員義務', ul: ['提供真實且完整的資料', '妥善保管帳號密碼，不得轉讓他人使用', '不得利用本站從事違法行為'] },
      { h: '智慧財產權', p: ['本站所有內容（含圖片、文字、商標）均受著作權法保護，未經授權不得重製或轉載。'] },
    ],
  },
  returns: {
    title: '取消訂單／退貨',
    intro: '依《消費者保護法》第 19 條，您享有商品到貨後 10 天猶豫期之權益。',
    sections: [
      { h: '申請方式', ul: ['登入會員 → 訂單查詢 → 選擇訂單 → 申請退貨', '或聯絡客服 0800-777-616 由專人協助'] },
      { h: '退貨條件', p: ['商品需保持全新狀態、完整包裝（含贈品、配件、說明書）。', '以下商品不適用猶豫期：已拆封之食品、個人衛生用品、客製化商品、數位內容。'] },
      { h: '退款時程', p: ['本站收到退貨商品並驗收完成後，7 個工作日內完成退款。', '信用卡退款依發卡行作業，約需 7–14 個工作日入帳。'] },
    ],
  },
  orders: {
    title: '訂單／配送進度查詢',
    intro: '輸入訂單編號即可查詢目前配送狀態。',
    form: 'order',
    sections: [
      { h: '配送時程', ul: ['一般宅配：出貨後 1–3 個工作日到貨', '快速到貨：指定區域最快 6 小時', '超商取貨：出貨後 2–4 日到店，請於 7 日內取貨'] },
      { h: '常見狀態', p: ['待出貨 → 已出貨 → 配送中 → 已送達。若超過 3 個工作日仍未更新，請聯絡客服。'] },
    ],
  },
  wishlist: {
    title: '追蹤清單',
    intro: '點擊商品頁的「加入追蹤」，降價或缺貨補貨時會通知您。',
    sections: [
      { h: '使用說明', ul: ['追蹤商品降價 5% 以上時發送通知', '補貨時優先通知', '最多可追蹤 100 件商品'] },
    ],
  },
  coupons: {
    title: '折價券說明',
    intro: '折價券可於結帳時折抵商品金額，詳細規則如下。',
    sections: [
      { h: '使用規則', ul: ['每筆訂單限用一張折價券', '折價券不可折抵運費', '不得與其他折扣碼併用', '逾期自動失效，不另行通知'] },
      { h: '取得方式', ul: ['活動頁領取', '滿額登記活動', '會員生日禮', 'APP 限定活動'] },
    ],
  },
  'fast-delivery': {
    title: '快速到貨服務',
    intro: '台北市、新北市部分區域提供「當日配」與「6 小時到貨」服務。',
    sections: [
      { h: '適用範圍', ul: ['台北市全區、新北市板橋／中和／永和／新莊／三重／淡水', '週一至週日 08:00–20:00 下單均可當日配送'] },
      { h: '注意事項', p: ['遇颱風、天災或物流爆量時，配送時程可能調整。', '快速到貨商品不適用超商取貨。'] },
    ],
  },
  address: {
    title: '更改配送地址',
    intro: '訂單出貨前可自行修改配送地址；已出貨訂單請聯絡客服協助。',
    sections: [
      { h: '修改方式', ul: ['登入會員 → 訂單查詢 → 選擇「待出貨」訂單 → 修改地址', '或於客服時間來電 0800-777-616'] },
    ],
  },
  faq: {
    title: 'FAQ 常見問題',
    intro: '以下是會員最常詢問的問題。',
    sections: [
      { h: '訂購相關', ul: ['Q：如何查詢訂單？ A：登入會員 → 訂單查詢，或使用「訂單/配送進度查詢」。', 'Q：可以指定到貨時間嗎？ A：宅配可於備註欄填寫偏好時段，實際依物流安排。', 'Q：發票什麼時候開立？ A：出貨後自動開立電子發票並寄送至您的信箱。'] },
      { h: '付款相關', ul: ['Q：支援哪些付款方式？ A：信用卡、ATM 轉帳、超商取貨付款、LINE Pay。', 'Q：ATM 有金額限制嗎？ A：單筆上限 5,000 元。'] },
      { h: '退換貨', ul: ['Q：多久可以退貨？ A：到貨後 10 天內。', 'Q：退貨運費誰負擔？ A：商品瑕疵由本站負擔，個人因素退貨酌收運費。'] },
    ],
  },
  contact: {
    title: '聯絡我們',
    intro: '客服團隊全年無休，平均回覆時間 2 小時。',
    sections: [
      { h: '客服管道', ul: ['客服專線：0800-777-616（每日 09:00–18:00）', '線上客服：登入會員後點右下角「客服」', '電子郵件：service@momoshop.com.tw'] },
      { h: '企業合作', p: ['大宗採購、異業合作請來信，或參閱「招商專區」。'] },
    ],
  },
  security: {
    title: '網路安全標章',
    intro: '本站通過 ISO/IEC 27001 資訊安全管理系統認證，全站採用 TLS 1.3 加密傳輸。',
    sections: [
      { h: '安全措施', ul: ['全站 HTTPS，信用卡資料不落地', '定期滲透測試與弱點掃描', '異地備援與 24 小時監控'] },
      { h: '防詐提醒', p: ['本站不會以電話要求您操作 ATM 或提供信用卡安全碼。'] },
    ],
  },
  packaging: {
    title: '包裝減量標章',
    intro: '為降低網購包裝廢棄物，本站推行「原箱出貨」與「循環包裝」。',
    sections: [
      { h: '具體作法', ul: ['優先使用原廠外箱，減少二次包裝', '填充材改用 100% 回收紙材', '雙北地區試辦循環箱回收'] },
    ],
  },
  carbon: {
    title: '碳足跡標籤',
    intro: '本站部分商品已取得環境部「碳足跡標籤」，標示產品從原料到配送的碳排放量。',
    sections: [
      { h: '怎麼看', p: ['商品頁若出現碳足跡標籤，代表該商品已完成第三方查證，標示數值為每件產品之二氧化碳當量（kgCO2e）。'] },
    ],
  },
  'anti-fraud': {
    title: '防詐騙宣導',
    intro: 'momo 絕不會以電話或簡訊通知訂單／分期出錯、或變更付款方式，更不會要您前往 ATM 進行任何操作！',
    sections: [
      { h: '常見詐騙手法', ul: ['假冒客服來電稱「誤設分期」', '簡訊連結要求重新填寫信用卡', '假冒物流通知要求付款'] },
      { h: '遇到怎麼辦', ul: ['立即掛斷，撥打 165 反詐騙專線', '不要點擊任何不明連結', '登入本站訂單查詢確認真實狀態'] },
    ],
  },
  app: {
    title: '行動購物 APP',
    intro: 'momo 購物 APP 提供個人化推薦、APP 限定優惠與快速結帳。',
    sections: [
      { h: 'APP 限定', ul: ['APP 首購折 $100', '天天簽到領 mo 幣', 'APP 獨家秒殺商品'] },
      { h: '下載方式', p: ['iOS：App Store 搜尋「momo購物網」', 'Android：Google Play 搜尋「momo購物網」'] },
    ],
  },
  recruitment: {
    title: '人才招募',
    intro: 'momo 持續招募電子商務、物流、數據、工程等領域人才。',
    sections: [
      { h: '為什麼加入我們', ul: ['台灣線上零售龍頭，成長動能強', '扁平組織、快速決策', '完整教育訓練與輪調制度'] },
      { h: '應徵方式', p: ['請於 104 人力銀行搜尋「富邦媒」投遞履歷。'] },
    ],
  },
  supplier: {
    title: '招商專區',
    intro: '歡迎品牌商、代理商加入 momo 平台，共創銷售成長。',
    sections: [
      { h: '合作流程', ul: ['線上填寫招商表單', '商品與公司資料審核（約 5 個工作日）', '簽約與系統開通', '商品上架與活動規劃'] },
      { h: '我們需要', p: ['公司登記證明、商品檢驗文件、品牌授權書。'] },
    ],
  },
  bulk: {
    title: '大宗採購方案',
    intro: '企業、學校、機關團體大量採購可享專屬報價與統一出貨。',
    sections: [
      { h: '適用對象', ul: ['公司行號員工福利品', '學校／補習班教材與設備', '政府機關共同供應契約'] },
      { h: '聯絡窗口', p: ['請來信 bulk@momoshop.com.tw，附上品項、數量與期望交期。'] },
    ],
  },
  cooperation: {
    title: '異業合作',
    intro: '歡迎媒體、品牌、通路、金融機構洽談聯名活動與流量合作。',
    sections: [
      { h: '合作形式', ul: ['聯名商品開發', '點數／回饋互換', '內容與直播導購', '線下門市導流'] },
    ],
  },
  enterprise: {
    title: 'momo 幫企業採購',
    intro: '為企業客戶打造的採購平台，支援多部門請購、統編發票與月結。',
    sections: [
      { h: '功能', ul: ['企業專屬價', '月結 30 天帳期', '多層級簽核', '採購報表匯出'] },
    ],
  },
  insurance: {
    title: 'momo 富立保險',
    intro: 'momo 與富立保險合作，提供旅遊平安險、旅不便險等線上投保服務。',
    sections: [
      { h: '服務項目', ul: ['旅平險（國內外）', '旅不便險', '定期壽險'] },
      { h: '提醒', p: ['投保前請詳閱保單條款與除外責任。'] },
    ],
  },
  'member-center': {
    title: '會員中心',
    intro: '這裡可以管理您的帳號、訂單、折價券與收件地址。',
    custom: 'member',
  },
  login: {
    title: '登入 / 註冊',
    intro: '使用手機號碼與密碼登入；沒有帳號可直接註冊（本站為示範站，帳號僅存於本站）。',
    custom: 'login',
  },
};

// ── 渲染 ──
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const LOGIN_HTML = `
<div class="auth">
  <div class="auth__tabs">
    <button type="button" data-tab="login" class="on">登入</button>
    <button type="button" data-tab="register">註冊新帳號</button>
  </div>

  <div class="auth__pane" data-pane="login">
    <label>手機號碼</label>
    <input id="loginPhone" inputmode="numeric" maxlength="10" placeholder="09xxxxxxxx" autocomplete="username">
    <label>密碼</label>
    <input id="loginPwd" type="password" placeholder="請輸入密碼" autocomplete="current-password">
    <button type="button" class="auth__btn" id="doLogin">登入</button>
  </div>

  <div class="auth__pane" data-pane="register" hidden>
    <label>手機號碼 <i>*</i></label>
    <input id="regPhone" inputmode="numeric" maxlength="10" placeholder="09xxxxxxxx" autocomplete="username">
    <label>密碼 <i>*</i>（至少 6 碼）</label>
    <input id="regPwd" type="password" placeholder="設定密碼" autocomplete="new-password">
    <label>姓名</label>
    <input id="regName" placeholder="選填" autocomplete="name">
    <label>電子郵件</label>
    <input id="regEmail" type="email" placeholder="選填" autocomplete="email">
    <button type="button" class="auth__btn" id="doRegister">註冊並登入</button>
  </div>

  <div id="authMsg" class="auth__msg"></div>

  <p class="auth__hint">本站為 momo 復刻示範站，帳號資料僅儲存於本站，不會外傳。</p>
</div>
`;

const MEMBER_HTML = `
<div class="member" id="memberBox" hidden>
  <div class="member__hd">
    <div class="member__avatar" id="mAvatar">m</div>
    <div class="member__who">
      <strong id="mName">—</strong>
      <span id="mPhone">—</span>
    </div>
    <button type="button" class="member__logout" id="doLogout">登出</button>
  </div>

  <div class="info-cards">
    <a class="info-card" href="/info/orders"><strong>訂單查詢</strong><span>用單號查配送進度</span></a>
    <a class="info-card" href="/info/wishlist"><strong>追蹤清單</strong><span>降價與補貨通知</span></a>
    <a class="info-card" href="/info/coupons"><strong>折價券</strong><span>查看可用折價券</span></a>
    <a class="info-card" href="/info/address"><strong>更改配送地址</strong><span>修改收件資訊</span></a>
    <a class="info-card" href="/info/returns"><strong>取消／退貨</strong><span>申請退換貨</span></a>
    <a class="info-card" href="/info/contact"><strong>聯絡客服</strong><span>0800-777-616</span></a>
  </div>

  <section class="info-sec">
    <h2>我的訂單</h2>
    <div id="myOrders" class="member__orders">載入中…</div>
  </section>
</div>

<div class="member member--guest" id="guestBox" hidden>
  <p class="member__guestline">您尚未登入，登入後即可查看訂單與會員資料。</p>
  <a class="auth__btn" href="/info/login">前往登入 / 註冊</a>
</div>
`;

function renderCustom(kind) {
  return kind === 'login' ? LOGIN_HTML : MEMBER_HTML;
}

function renderSections(pg) {
  let out = '';
  if (pg.custom) out += renderCustom(pg.custom);   // 登录 / 会员中心：真表单
  if (pg.form === 'order') {
    out += `
    <div class="info-form">
      <label for="orderNo">訂單編號</label>
      <div class="info-form__row">
        <input id="orderNo" placeholder="例：ORD-20261121-ABC123" autocomplete="off">
        <button type="button" id="orderQuery">查詢</button>
      </div>
      <div id="orderResult" class="info-form__result"></div>
    </div>`;
  }
  if (pg.cards) {
    out += '<div class="info-cards">' + pg.cards.map((c) => `
      <a class="info-card" href="${c.href}">
        <strong>${esc(c.t)}</strong>
        <span>${esc(c.d)}</span>
      </a>`).join('') + '</div>';
  }
  for (const s of pg.sections || []) {
    out += `<section class="info-sec"><h2>${esc(s.h)}</h2>`;
    if (s.p) out += s.p.map((x) => `<p>${esc(x)}</p>`).join('');
    if (s.ul) out += '<ul>' + s.ul.map((x) => `<li>${esc(x)}</li>`).join('') + '</ul>';
    out += '</section>';
  }
  return out;
}

function page(slug, pg) {
  const body = `
<div class="wrap">
  <nav class="crumb"><a href="/">首頁</a><span class="sep">/</span><span>${esc(pg.title)}</span></nav>
  <div class="card">
    <div class="card__hd"><h2>${esc(pg.title)}</h2></div>
    <div class="card__bd info-body">
      <p class="info-intro">${esc(pg.intro)}</p>
      ${renderSections(pg)}
    </div>
  </div>
</div>`;

  return `<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=0">
<title>${esc(pg.title)} - momo購物網</title>
${UTM}
${CSS.map((h) => `<link rel="stylesheet" href="${h}">`).join('\n')}
</head>
<body class="momo-page">
${header}
${body}
${footer}
<script>
(function(){
  var $ = function(id){ return document.getElementById(id); };
  if ($('orderQuery')) {
    $('orderQuery').addEventListener('click', function(){
      var no = ($('orderNo').value || '').trim();
      var box = $('orderResult');
      if (!no) { box.textContent = '請先輸入訂單編號'; box.className = 'info-form__result err'; return; }
      box.textContent = '查詢中…'; box.className = 'info-form__result';
      fetch('/api/order/' + encodeURIComponent(no)).then(function(r){ return r.json(); }).then(function(j){
        if (j && j.ok && j.order) {
          box.className = 'info-form__result ok';
          box.innerHTML = '訂單 <b>' + j.order.order_number + '</b>　金額 <b>$' +
            Number(j.order.amount).toLocaleString('en-US') + '</b>　狀態 <b>已成立</b><br>建立時間 ' +
            new Date(j.order.created_at).toLocaleString('zh-TW');
        } else {
          box.className = 'info-form__result err';
          box.textContent = '查無此訂單，請確認編號是否正確';
        }
      }).catch(function(){ box.className = 'info-form__result err'; box.textContent = '查詢失敗，請稍後再試'; });
    });
  }
  if ($('loginBtn')) {
    $('loginBtn').addEventListener('click', function(){
      var box = $('loginResult');
      box.className = 'info-form__result err';
      box.textContent = '示範站未串接會員系統；可直接前往結帳（訪客結帳免登入）';
    });
  }

  // ── 登入 / 註冊 ──
  if ($('authMsg')) {
    var msg = $('authMsg');
    function say(t, ok) { msg.textContent = t || ''; msg.className = 'auth__msg' + (ok ? ' ok' : t ? ' err' : ''); }
    document.querySelectorAll('.auth__tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.auth__tabs button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        document.querySelectorAll('.auth__pane').forEach(function (p) {
          p.hidden = p.getAttribute('data-pane') !== b.getAttribute('data-tab');
        });
        say('');
      });
    });
    function post(url, body) {
      return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
    }
    if ($('doLogin')) {
      $('doLogin').addEventListener('click', function () {
        var phone = $('loginPhone').value, pwd = $('loginPwd').value;
        if (!phone || !pwd) return say('請輸入手機號碼與密碼');
        say('登入中…');
        post('/api/auth/login', { phone: phone, password: pwd }).then(function (j) {
          if (j && j.ok) { say('登入成功，正在前往會員中心…', true); setTimeout(function () { location.href = '/info/member-center'; }, 500); }
          else say((j && j.message) || '登入失敗');
        }).catch(function () { say('網路異常，請重試'); });
      });
    }
    if ($('doRegister')) {
      $('doRegister').addEventListener('click', function () {
        var body = { phone: $('regPhone').value, password: $('regPwd').value, name: $('regName').value, email: $('regEmail').value };
        say('註冊中…');
        post('/api/auth/register', body).then(function (j) {
          if (j && j.ok) { say('註冊成功，正在前往會員中心…', true); setTimeout(function () { location.href = '/info/member-center'; }, 500); }
          else say((j && j.message) || '註冊失敗');
        }).catch(function () { say('網路異常，請重試'); });
      });
    }
    // 已登录直接跳会员中心
    fetch('/api/auth/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.ok) setTimeout(function () { location.href = '/info/member-center'; }, 300);
    }).catch(function () {});
  }

  // ── 会员中心 ──
  if ($('memberBox')) {
    fetch('/api/auth/me', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) { $('guestBox').hidden = false; return; }
      var u = j.user;
      $('memberBox').hidden = false;
      $('mName').textContent = u.name || 'momo 會員';
      $('mPhone').textContent = u.phone ? u.phone.replace(/^([0-9]{4})[0-9]{3}([0-9]{3})$/, '$1***$2') : '';
      $('mAvatar').textContent = (u.name || 'm').trim().charAt(0) || 'm';

      fetch('/api/member/orders', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (o) {
        var box = $('myOrders');
        if (!o || !o.ok) { box.textContent = '訂單載入失敗'; return; }
        if (!o.orders.length) { box.innerHTML = '<p class="member__empty">還沒有訂單，<a href="/category">去逛逛</a></p>'; return; }
        box.innerHTML = o.orders.map(function (od) {
          return '<div class="member__order">' +
            '<div><b>' + od.order_number + '</b><span>' + new Date(od.created_at).toLocaleString('zh-TW') + '</span></div>' +
            '<div class="member__order-amt">$' + Number(od.amount).toLocaleString('en-US') + '</div>' +
            '<a href="/order/' + encodeURIComponent(od.order_number) + '">查看</a>' +
            '</div>';
        }).join('');
      });
    }).catch(function () { $('guestBox').hidden = false; });

    if ($('doLogout')) {
      $('doLogout').addEventListener('click', function () {
        fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).then(function () { location.reload(); });
      });
    }
  }
})();
</script>
</body>
</html>`;
}

/** 手机版站内页：r-* 外壳 + 同一份内容与交互脚本 */
function pageMobile(pg, scriptHtml) {
  const body = `
<header class="r-hd">
  <button class="r-hd__menu" type="button" aria-label="選單"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
  <span class="r-hd__tag">新品<em>🔥</em></span>
  <form class="r-hd__search" onsubmit="event.preventDefault();location.href='/m/category?kw='+encodeURIComponent(this.q.value)">
    <input name="q" type="search" placeholder="除濕機" aria-label="搜尋">
  </form>
  <a class="r-hd__ico" href="/m/category" aria-label="足跡"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/></svg></a>
  <a class="r-hd__ico" href="/m/info/contact" aria-label="消息"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H8l-4 3V5Z"/></svg></a>
</header>

<nav class="r-nav">
  <a href="/m/">首頁</a>
  <a href="/m/category">限時搶購</a>
  <a href="/m/category">直播</a>
  <a href="/m/category">mo店+</a>
  <a href="/m/category">看看買</a>
  <a class="r-nav__more" href="/m/category"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></a>
</nav>

<main class="r-main r-info">
  <nav class="r-crumb"><a href="/m/">首頁</a><span>/</span><span>${esc(pg.title)}</span></nav>
  <section class="r-info__card">
    <div class="r-info__hd"><h1>${esc(pg.title)}</h1></div>
    <div class="r-info__bd info-body">
      <p class="info-intro">${esc(pg.intro)}</p>
      ${renderSections(pg)}
    </div>
  </section>
</main>

<nav class="r-tab">
  <a href="/m/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z"/></svg><span>首頁</span></a>
  <a href="/m/category"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16l-1.2 11.5a1 1 0 0 1-1 .9H6.2a1 1 0 0 1-1-.9L4 8Z"/><path d="M8.5 8V6a3.5 3.5 0 0 1 7 0v2"/></svg><span>逛逛</span></a>
  <a href="/m/info/wishlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.6-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.4 12 20 12 20Z"/></svg><span>追蹤清單</span></a>
  <a href="/m/cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L19.5 8H6"/><circle cx="9.5" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg><span>購物車</span></a>
  <a href="/m/info/member-center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.3-3.6 4-5.4 7.5-5.4s6.2 1.8 7.5 5.4"/></svg><span>會員中心</span></a>
</nav>`;

  return `<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1">
<title>${esc(pg.title)} - momo購物網</title>
${UTM}
<link rel="stylesheet" href="/assets/image.momoshop.com.tw/ecm/font/theme-main.css">
<link rel="stylesheet" href="/m/assets/css/momo-mobile.css">
<link rel="stylesheet" href="/m/assets/css/mobile-home.css">
<link rel="stylesheet" href="/assets/css/momo-info.css">
</head>
<body class="m r-page">
${body}
${scriptHtml || ''}
</body>
</html>`;
}

function write(rel, content) {
  const abs = path.join(SITE, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  console.log('  ✓', rel.replace(/\\/g, '/'), (content.length / 1024).toFixed(1) + 'KB');
}

console.log('生成站内实体页…');
for (const [slug, pg] of Object.entries(PAGES)) {
  const desktop = page(slug, pg);
  write(path.join('info', slug + '.html'), desktop);
  const m = desktop.match(/<script>[\s\S]*?<\/script>/);
  write(path.join('m', 'info', slug + '.html'), pageMobile(pg, m ? m[0] : ''));
}
console.log('完成，共', Object.keys(PAGES).length, '页');
