/**
 * Cloudflare Worker 入口（静态资源 + 动态路由）
 *
 * 为什么需要这个文件：
 *   项目走 Pages 时，functions/ 目录被上传但从不执行（/api/ping 都返回首页 HTML）。
 *   改成 Worker + Assets 绑定后，动态路由由本文件接管，静态文件交给 env.ASSETS。
 *
 * 复用 functions/[[path]].js 里的 onRequest(context)，适配 Pages 的 context 形态：
 *   { request, env, next, params }
 * 其中 next() 在 Pages 里是「交给静态资源」，这里换成 env.ASSETS.fetch(request)。
 */
import { onRequest } from './functions/[[path]].js';

export default {
  async fetch(request, env, ctx) {
    const next = () => env.ASSETS.fetch(request);
    try {
      const res = await onRequest({ request, env, next, params: {}, data: {} });
      if (res) return res;
      return next();
    } catch (err) {
      // 出错时不要静默回落到静态页，直接暴露错误，便于排查
      return new Response(
        JSON.stringify({
          ok: false,
          error_code: 'worker_exception',
          message: String((err && err.message) || err),
          stack: String((err && err.stack) || '').split('\n').slice(0, 6),
        }),
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }
      );
    }
  },
};
