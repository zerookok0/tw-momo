import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 9499;
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Google/Chrome/Application/chrome.exe","C:/Users/Admin/AppData/Local/Google/Chrome/Application/chrome.exe"].find(p => fs.existsSync(p));
const UD = path.join(process.env.TEMP || ".", "cdpm2-" + Date.now());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const proc = spawn(CHROME, ["--headless=new","--remote-debugging-port="+PORT,"--user-data-dir="+UD,"--no-first-run","--hide-scrollbars","about:blank"], { stdio: "ignore" });
async function getJSON(p){ for(let i=0;i<80;i++){ try { return await (await fetch("http://127.0.0.1:"+PORT+p)).json(); } catch { await sleep(300);} } throw new Error("devtools"); }
const ver = await getJSON("/json/version");
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((res,rej)=>{ ws.onopen=res; ws.onerror=rej; });
let id=0; const pending=new Map();
ws.onmessage=(e)=>{ const m=JSON.parse(e.data); if(m.id&&pending.has(m.id)){ pending.get(m.id)(m); pending.delete(m.id);} };
function send(method,params={},sess){ const mid=++id; return new Promise((res,rej)=>{ pending.set(mid,m=>m.error?rej(new Error(method+": "+m.error.message)):res(m.result)); ws.send(JSON.stringify({id:mid,method,params,...(sess?{sessionId:sess}:{})})); }); }
const { targetId } = await send("Target.createTarget",{url:"about:blank"});
const { sessionId } = await send("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>send(m,p,sessionId);
await S("Page.enable");
await S("Emulation.setDeviceMetricsOverride",{width:402,height:874,deviceScaleFactor:2,mobile:true,screenWidth:402,screenHeight:874});
await S("Page.navigate",{url:"https://tw-momo.pages.dev/m/"});
await sleep(4500);
const r = await S("Runtime.evaluate",{expression:`(() => {
  const box = document.querySelector('#promoBox');
  const img = document.querySelector('#promoBox .pm-img');
  const b = box.getBoundingClientRect(), i = img.getBoundingClientRect();
  return JSON.stringify({
    vw: innerWidth, vh: innerHeight,
    box: { w: Math.round(b.width), h: Math.round(b.height), top: Math.round(b.top) },
    img: { w: Math.round(i.width), h: Math.round(i.height) },
    imgCSS: { height: getComputedStyle(img).height, objectFit: getComputedStyle(img).objectFit },
    mediaMatch: matchMedia('(max-width: 600px)').matches,
    pct: Math.round(b.height / innerHeight * 100) + '%',
  });
})()`, returnByValue:true});
console.log(r.result.value);
ws.close(); proc.kill(); process.exit(0);
