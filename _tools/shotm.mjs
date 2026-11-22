import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "_ref", "shots");
fs.mkdirSync(OUT, { recursive: true });
const TARGET = process.argv[2];
const NAME = process.argv[3] || "m";
const W = Number(process.argv[4] || 402);
const H = Number(process.argv[5] || 874);
const PORT = 9477;
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Google/Chrome/Application/chrome.exe","C:/Users/Admin/AppData/Local/Google/Chrome/Application/chrome.exe"].find(p => fs.existsSync(p));
const UD = path.join(process.env.TEMP || ".", "cdpm-" + Date.now());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const proc = spawn(CHROME, ["--headless=new","--remote-debugging-port="+PORT,"--user-data-dir="+UD,"--no-first-run","--no-default-browser-check","--hide-scrollbars","--mute-audio","about:blank"], { stdio: "ignore" });

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
await S("Emulation.setDeviceMetricsOverride",{width:W,height:H,deviceScaleFactor:3,mobile:true,screenWidth:W,screenHeight:H});
await S("Emulation.setUserAgentOverride",{userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",platform:"iPhone"});
await S("Page.navigate",{url:TARGET});
await sleep(5000);
const m = await S("Page.getLayoutMetrics");
const h = Math.min(Math.round((m.cssContentSize||m.contentSize).height), 5000);
const shot = await S("Page.captureScreenshot",{format:"png",captureBeyondViewport:true,clip:{x:0,y:0,width:W,height:h,scale:2}});
const f = path.join(OUT, NAME + ".png");
fs.writeFileSync(f, Buffer.from(shot.data,"base64"));
const d = await S("Runtime.evaluate",{expression:`JSON.stringify({vw:innerWidth,docW:document.documentElement.scrollWidth,hdr:document.querySelector('.m-header').getBoundingClientRect().width,box:(document.querySelector('#promoBox')||{getBoundingClientRect:()=>({width:0,height:0})}).getBoundingClientRect().width,boxH:(document.querySelector('#promoBox')||{getBoundingClientRect:()=>({width:0,height:0})}).getBoundingClientRect().height})`,returnByValue:true});
console.log("OK", f, W+"x"+h, d.result.value);
ws.close(); proc.kill(); process.exit(0);
