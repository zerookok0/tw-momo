/**
 * 全站定价规则（单一事实源）
 *
 * 规则：所有商品按「原价」打 5 折，四舍五入取整数，不显示小数。
 *   原价 167 → 84（167 / 2 = 83.5 → 84）
 *   原价 828 → 414
 *   原价 59  → 30（29.5 → 30）
 *
 * 「原价」= 目录里抓到的 momo 售价（catalog.json 的 price）。
 * 已有的折扣一律丢弃，重新按原价计算，保证全站口径一致。
 */

export const DISCOUNT = 0.5;

/** 原价（整数元） */
export function origPrice(item) {
  const n = Number(item && item.price);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/** 折后价：原价 × 0.5，四舍五入到整数 */
export function salePrice(item) {
  return Math.round(origPrice(item) * DISCOUNT);
}

/** 折扣率文案，例如 5 折 */
export function discountLabel() {
  return '5 折';
}

export const fmtTWD = (n) => '$' + Number(n || 0).toLocaleString('en-US');
