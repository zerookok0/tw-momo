// 验证：购物车带过来的商品金额，是否真的进入结账页
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(path.resolve(__dirname, ".."), "dist");
for (const f of ["checkout/index.html", "m/checkout/index.html"]) {
  const html = fs.readFileSync(path.join(DIST, f), "utf8");
  const hasHydrate = html.includes("momo_checkout_cart");
  const hasSkeletonBefore = html.indexOf("__BP_CART__") < html.indexOf("momo_checkout_cart");
  const connectorAfter = html.indexOf("/bp/connector.js") > html.indexOf("momo_checkout_cart");
  console.log(`${hasHydrate && hasSkeletonBefore && connectorAfter ? "✅" : "❌"} ${f.padEnd(24)} 覆写脚本在骨架之后、connector 之前: ${hasHydrate && hasSkeletonBefore && connectorAfter}`);
}
