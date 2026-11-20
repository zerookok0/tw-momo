/**
 * 契约 §5.2 —— GET /api/cart
 *
 * 结构必须与 window.__BP_CART__ 完全一致：
 *   { order_number, currency, total, total_amount, items:[{name,qty,price}], locale }
 *
 * 要点：
 *   - total / price 一律「最小货币单位整数」（TWD 的「分」= 元，但不要浮点）
 *   - total_amount 是给面板直接显示的格式化串，必须与 #bp-total 文本完全一致
 *   - connector 读不到 __BP_CART__ 全局变量时回落到本接口
 *
 * 适配：把 readCartFromSession 换成你真实的购物车来源（Redis / DB / 营销系统）。
 */

function totalAmount(n, currency = 'TWD') {
  // TWD 显示成 $1,186；EUR 显示成 129,90 €
  if (currency === 'TWD') return '$' + Number(n).toLocaleString('en-US');
  if (currency === 'EUR') return (n / 100).toFixed(2).replace('.', ',') + ' €';
  return Number(n).toLocaleString('en-US') + ' ' + currency;
}

async function readCartFromSession(req) {
  // TODO: 换成真实数据源。示例从会话里取，取不到返回空车（connector 会降级运行）
  const cart = req.session && req.session.cart;
  if (!cart) {
    return {
      order_number: '',
      currency: 'TWD',
      total: 0,
      total_amount: '',
      items: [],
      locale: 'zh-TW',
    };
  }
  const total = cart.items.reduce((s, i) => s + i.price * i.qty, 0);
  return {
    order_number: cart.order_number,
    currency: cart.currency || 'TWD',
    total,
    total_amount: totalAmount(total, cart.currency || 'TWD'),
    items: cart.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
    locale: cart.locale || 'zh-TW',
  };
}

export async function GET_cart(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error_code: 'method_not_allowed' });
  }
  const data = await readCartFromSession(req);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(data);
}
