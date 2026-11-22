import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "_ref", "shots");
const TARGET = process.argv[2], NAME = process.argv[3] || "np";
const W = Number(process.argv[4] || 402), H = Number(process.argv[5] || 2000);
const PORT = 9511;
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Google/Chrome/Application/chrome.exe","C:/Users/Admin/AppData/Local/Google/Chrome/Application/chrome.exe"].find(p => fs.existsSync(p));
const UD = path.join(process.env.TEMP || ".", "cdpnp-" + Date.now());
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
await S("Emulation.setDeviceMetricsOverride",{width:W,height:900,deviceScaleFactor:2,mobile:true,screenWidth:W,screenHeight:900});
await S("Page.navigate",{url:TARGET});
await sleep(4500);
// 关掉弹窗
await S("Runtime.evaluate",{expression:`(function(){var c=document.querySelector('#promoClose'); if(c) c.click(); var m=document.querySelector('#promoMask'); if(m){m.classList.remove('on'); m.style.display='none';} })()`});
await sleep(800);
const shot = await S("Page.captureScreenshot",{format:"png",captureBeyondViewport:true,clip:{x:0,y:0,width:W,height:H,scale:2}});
const f = path.join(OUT, NAME + ".png");
fs.writeFileSync(f, Buffer.from(shot.data,"base64"));
console.log("OK", f);
ws.close(); proc.kill(); process.exit(0);
