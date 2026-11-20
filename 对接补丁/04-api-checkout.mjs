/**
 * 契约 §6 —— POST /api/checkout
 *
 * 四条硬规则：
 *   1. 🔴 永远 HTTP 200 + JSON，绝不 302/303，绝不返回 HTML
 *   2. 🔴 返回的 order_number 必须等于请求里的那个（不许提交时生成新号）
 *   3. 🔴 幂等：同一 order_number 重复 POST 返回同一个 ok:true
 *   4. 🔴 无验证码 / 无一次性 nonce；用 SameSite=Lax cookie + Origin 比对防重放
 *
 * 卡片数据不会出现在这个请求里（只走面板通道），服务端不需要也不应该接收。
 */

const ORDERS = new Map(); // 生产环境换 Redis / DB，key = order_number

const MESSAGES = {
  invalid_amount: '金額異常，請回到購物車重新結帳',
  origin_mismatch: '來源驗證失敗，請重新整理後再試',
  bad_json: '請求格式錯誤，請重試',
  card_declined: '支付未通過，請更換卡片或重試',
  bank_timeout: '銀行回應逾時，請稍後再試',
};

function fail(res, code) {
  return res.status(200).json({ ok: false, error_code: code, message: MESSAGES[code] || '付款失敗，請稍後再試' });
}

export async function POST_checkout(req, res) {
  // ── 1. 解析 body ──
  let body = {};
  try {
    body = typeof req.body === 'object' && req.body ? req.body : JSON.parse(req.body || '{}');
  } catch {
    return fail(res, 'bad_json');
  }

  // ── 2. Origin 比对（契约 §6.1 🟡 防重放）──
  const origin = req.headers.origin;
  const self = `${req.protocol}://${req.headers.host}`;
  if (origin && origin !== self) return fail(res, 'origin_mismatch');

  // ── 3. 单号复用（契约 §6.1 🔴）──
  const orderNumber = body.order_number;
  if (!orderNumber) return fail(res, 'bad_json');

  // ── 4. 幂等（契约 §6.1 🟡 / §6.2 硬要求）──
  if (ORDERS.has(orderNumber)) {
    const o = ORDERS.get(orderNumber);
    return res.status(200).json({ ok: true, order_number: o.order_number, idempotent: true });
  }

  // ── 5. 金额校验 ──
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return fail(res, 'invalid_amount');

  // ── 6. 落单（这里换成你的下单逻辑；不要在这里接收卡片数据）──
  const order = {
    order_number: orderNumber,
    amount,
    currency: body.currency || 'TWD',
    locale: body.locale || 'zh-TW',
    utm: body.utm || {},
    customer: body.customer || {},
    created_at: new Date().toISOString(),
    status: 'paid',
  };
  ORDERS.set(orderNumber, order);

  // ── 7. 成功：200 + JSON，跳转由前端决定（契约 R3）──
  return res.status(200).json({ ok: true, order_number: order.order_number });
}

export async function GET_order(req, res) {
  const no = decodeURIComponent(req.params?.order_number || '');
  const o = ORDERS.get(no);
  if (!o) return res.status(200).json({ ok: false, error_code: 'not_found' });
  return res.status(200).json({ ok: true, order: o });
}
