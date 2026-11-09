import {createRemoteJWKSet,jwtVerify} from 'jose';
import {validateMessage} from './validation.js';
import {storeAudio,getAudio,deleteOldAudio} from './audio-store.js';
import {validEndpoint,drainPush} from './push.js';
const enc=new TextEncoder();
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))),x=>x.toString(16).padStart(2,'0')).join('');
const now=()=>Math.floor(Date.now()/1000);
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const cookie=(name,value,age)=>`${name}=${value}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}`;
const cookies=req=>Object.fromEntries((req.headers.get('Cookie')||'').split(';').map(x=>x.trim().split('=')));
async function bounded(req,max){const reader=req.body?.getReader();if(!reader)return new Uint8Array();let chunks=[],size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw {status:413}}chunks.push(value)}const a=new Uint8Array(size);let i=0;for(const c of chunks){a.set(c,i);i+=c.length}return a;}
async function body(req){try{return JSON.parse(new TextDecoder().decode(await bounded(req,16384)))}catch(e){throw {status:e.status||400}}}
function assert(ok,status=400){if(!ok)throw {status};}
async function rate(req,env,path){const ip=req.headers.get('CF-Connecting-IP')||'local';const id=await hash(ip+path+Math.floor(now()/60));const r=await env.DB.prepare('INSERT INTO limits(id,n,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET n=n+1 RETURNING n').bind(id,now()+120).first();assert(r.n<=60,429);}
async function auth(req,env){const bearer=req.headers.get('Authorization')?.replace(/^Bearer /,'');const secret=bearer||cookies(req).session;assert(secret,401);const h=await hash(secret);
 const s=await env.DB.prepare('SELECT owner,kind FROM sessions WHERE hash=? AND expires>?').bind(h,now()).first();if(s){if(!bearer&&req.method!=='GET')assert(req.headers.get('Origin')===env.ORIGIN,403);return {...s,hash:h};}
 const d=await env.DB.prepare('SELECT id,owner FROM devices WHERE hash=? AND revoked=0').bind(h).first();assert(d,401);return {...d,kind:'tv',hash:h};}
async function device(env,id,owner){return env.DB.prepare('SELECT id FROM devices WHERE id=? AND owner=? AND revoked=0').bind(id,owner).first();}
export default {
 async fetch(req,env,ctx){try{
 const url=new URL(req.url),path=url.pathname;assert(url.protocol==='https:'||url.hostname==='localhost'||url.hostname==='127.0.0.1',400);
 if(path==='/health')return json({app:'Seslen',version:'0.3.0-test'});
 if(path.startsWith('/api/')||path.startsWith('/auth/'))await rate(req,env,path);
 if(path==='/auth/login'&&req.method==='GET'){
 assert(env.GOOGLE_CLIENT_SECRET&&env.GOOGLE_CLIENT_ID&&!env.GOOGLE_CLIENT_ID.startsWith('REPLACE_'),503);
 const pairing=url.searchParams.get('pair')||'';if(pairing){assert(/^[A-F0-9]{12}$/.test(pairing));assert(await env.DB.prepare('SELECT code FROM pairs WHERE code=? AND expires>? AND token IS NULL').bind(pairing,now()).first(),410);}
 const state=random(),verifier=random(),nonce=random();await env.DB.prepare('INSERT INTO oauth(state,verifier,nonce,expires,pair_code) VALUES(?,?,?,?,?)').bind(await hash(state),verifier,nonce,now()+600,pairing).run();
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(verifier)));const challenge=btoa(String.fromCharCode(...digest)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
 const u=new URL('https://accounts.google.com/o/oauth2/v2/auth');u.search=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:env.ORIGIN+'/auth/callback',response_type:'code',scope:'openid email',state,nonce,code_challenge:challenge,code_challenge_method:'S256'}).toString();
 return new Response(null,{status:302,headers:{Location:u.href,'Set-Cookie':cookie('oauth',state,600),'Cache-Control':'no-store'}});
 }
 if(path==='/auth/callback'&&req.method==='GET'){
 const state=url.searchParams.get('state');assert(state&&state===cookies(req).oauth,403);
 const flow=await env.DB.prepare('DELETE FROM oauth WHERE state=? AND expires>? RETURNING *').bind(await hash(state),now()).first();assert(flow,403);
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code:url.searchParams.get('code')||'',client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:env.ORIGIN+'/auth/callback',grant_type:'authorization_code',code_verifier:flow.verifier})});assert(response.ok,401);
 const tokens=await response.json();const {payload}=await jwtVerify(tokens.id_token,createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs')),{issuer:['https://accounts.google.com','accounts.google.com'],audience:env.GOOGLE_CLIENT_ID});assert(payload.nonce===flow.nonce&&payload.sub,401);
 const email=payload.email_verified===true&&typeof payload.email==='string'?payload.email:'';await env.DB.prepare('INSERT INTO accounts(owner,email) VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET email=excluded.email').bind(payload.sub,email).run();
 const session=random();await env.DB.prepare('INSERT INTO sessions VALUES(?,?,?,?)').bind(await hash(session),payload.sub,'browser',now()+2592000).run();return new Response(null,{status:302,headers:{Location:flow.pair_code?'/?pair='+encodeURIComponent(flow.pair_code):'/', 'Set-Cookie':cookie('session',session,2592000),'Cache-Control':'no-store'}});
 }
 if(path==='/api/pair/start'&&req.method==='POST'){
 await body(req);const code=random().slice(0,12).toUpperCase(),poll=random();await env.DB.prepare('INSERT INTO pairs VALUES(?,?,?,NULL)').bind(code,await hash(poll),now()+360).run();return json({code,poll,expires:360,url:env.ORIGIN+'/?pair='+code});
 }
 if(path==='/api/pair/poll'&&req.method==='POST'){
 const b=await body(req);assert(typeof b.poll==='string'&&b.poll.length===64);const h=await hash(b.poll);const row=await env.DB.prepare('DELETE FROM pairs WHERE poll=? AND expires>? AND token IS NOT NULL RETURNING token').bind(h,now()).first();if(!row)return json({waiting:true});const account=await env.DB.prepare('SELECT a.email FROM devices d LEFT JOIN accounts a ON a.owner=d.owner WHERE d.hash=?').bind(await hash(row.token)).first();return json({token:row.token,email:account?.email||''});
 }
 if(path.startsWith('/api/')){
 const user=await auth(req,env);
 if(path==='/api/account'&&req.method==='GET'){assert(user.kind==='browser'||user.kind==='tv',403);const account=await env.DB.prepare('SELECT email FROM accounts WHERE owner=?').bind(user.owner).first();return json({email:account?.email||'',kind:user.kind});}
 if(path==='/api/inbox'&&req.method==='GET'){assert(user.kind==='tv',403);const r=await env.DB.prepare('SELECT id,text,audio FROM messages WHERE device=? AND done=0 AND created>? ORDER BY created,rowid LIMIT 50').bind(user.id,now()-604800).all();return json({messages:r.results});}
 if(path==='/api/events'&&req.method==='POST'){
 assert(user.kind==='tv',403);const b=await body(req);assert(typeof b.id==='string'&&['delivered','finished','seen','failed'].includes(b.status));
 const status=b.status==='finished'?'delivered':b.status;
 await env.DB.batch([env.DB.prepare("UPDATE messages SET status=CASE WHEN done=1 AND ?='delivered' THEN status ELSE ? END,done=MAX(done,?) WHERE id=? AND device=? AND status!='seen'").bind(status,status,b.status==='delivered'?0:1,b.id,user.id),env.DB.prepare("INSERT OR IGNORE INTO push_jobs(id,owner,created) SELECT id,owner,? FROM messages WHERE id=? AND device=? AND status='seen' AND changes()>0").bind(now(),b.id,user.id)]);
 if(status==='seen'&&ctx)ctx.waitUntil(drainPush(env));return json({ok:true});
 }
 if(path.startsWith('/api/audio/')&&req.method==='GET'){
 const id=path.slice('/api/audio/'.length);let allowed;
 if(user.kind==='tv')allowed=await env.DB.prepare('SELECT id FROM messages WHERE audio=? AND device=? AND created>?').bind(id,user.id,now()-604800).first();else allowed=await env.DB.prepare('SELECT id FROM audio WHERE id=? AND owner=? AND ready=1 AND created>?').bind(id,user.owner,now()-604800).first();assert(allowed,404);const obj=await getAudio(env,id);assert(obj,404);return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 assert(user.kind!=='tv',403);
 if(path==='/api/push/key'&&req.method==='GET'){assert(user.kind==='browser',403);return json({publicKey:env.VAPID_PUBLIC_KEY||null});}
 if(path==='/api/push/subscribe'&&req.method==='POST'){
 assert(user.kind==='browser',403);assert(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_JWK,503);const b=await body(req);assert(typeof b.endpoint==='string'&&validEndpoint(b.endpoint));const id=await hash(b.endpoint);
 const r=await env.DB.prepare('INSERT INTO push_subscriptions(id,owner,session_hash,endpoint,created) SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM push_subscriptions WHERE owner=?)<5 OR EXISTS(SELECT 1 FROM push_subscriptions WHERE id=?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,session_hash=excluded.session_hash,created=excluded.created').bind(id,user.owner,user.hash,b.endpoint,now(),user.owner,id).run();assert(r.meta.changes===1,429);return json({ok:true});
 }
 if(path==='/api/push/unsubscribe'&&req.method==='POST'){assert(user.kind==='browser',403);await env.DB.prepare('DELETE FROM push_subscriptions WHERE session_hash=?').bind(user.hash).run();return json({ok:true});}
 if(path==='/api/devices'&&req.method==='GET')return json({devices:(await env.DB.prepare('SELECT id,name FROM devices WHERE owner=? AND revoked=0').bind(user.owner).all()).results});
 if(path==='/api/pair/confirm'&&req.method==='POST'){
 assert(user.kind==='browser',403);const b=await body(req);assert(typeof b.code==='string'&&/^[A-F0-9]{12}$/.test(b.code));const token=random(),id=crypto.randomUUID();const name=typeof b.name==='string'?b.name.slice(0,80):'Seslen TV';
 const r=await env.DB.batch([env.DB.prepare('UPDATE pairs SET token=? WHERE code=? AND expires>? AND token IS NULL').bind(token,b.code,now()),env.DB.prepare('INSERT INTO devices(id,owner,name,hash) SELECT ?,?,?,? WHERE changes()=1').bind(id,user.owner,name,await hash(token))]);assert(r[0].meta.changes===1,409);return json({id});
 }
 if(path==='/api/revoke'&&req.method==='POST'){assert(user.kind==='browser',403);const b=await body(req);assert(typeof b.device==='string');await env.DB.prepare('UPDATE devices SET revoked=1 WHERE id=? AND owner=?').bind(b.device,user.owner).run();return json({ok:true});}
 if(path==='/api/sender-token'&&req.method==='POST'){assert(user.kind==='browser',403);await body(req);const token=random();await env.DB.prepare('INSERT INTO sessions VALUES(?,?,?,?)').bind(await hash(token),user.owner,'sender',now()+2592000).run();return json({token,expiresDays:30});}
 if(path==='/api/revoke-senders'&&req.method==='POST'){assert(user.kind==='browser',403);await env.DB.prepare("DELETE FROM sessions WHERE owner=? AND kind='sender'").bind(user.owner).run();return json({ok:true});}
 if(path==='/api/logout'&&req.method==='POST'){await env.DB.batch([env.DB.prepare('DELETE FROM push_subscriptions WHERE session_hash=?').bind(user.hash),env.DB.prepare('DELETE FROM sessions WHERE hash=?').bind(user.hash)]);return json({ok:true},200,{'Set-Cookie':cookie('session','',0)});}
 if(path==='/api/audio'&&req.method==='POST'){
 const type=req.headers.get('Content-Type')?.split(';')[0];assert(['audio/mp4','audio/aac','audio/mpeg','audio/wav','audio/x-m4a','audio/webm'].includes(type),415);const bytes=await bounded(req,5*1024*1024);assert(bytes.length>0);const id=crypto.randomUUID();await storeAudio(env,id,user.owner,bytes,type,now());return json({audio:id});
 }
 if(path==='/api/messages'&&req.method==='POST'){
 let b;try{b=validateMessage(await body(req))}catch(e){throw {status:400}}
 assert(await device(env,b.device,user.owner),404);
 if(b.audio)assert(await env.DB.prepare('SELECT id FROM audio WHERE id=? AND owner=? AND ready=1 AND created>?').bind(b.audio,user.owner,now()-604800).first(),404);
 await env.DB.prepare("INSERT INTO messages(id,owner,device,text,audio,created,idem) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM messages WHERE owner=? AND created>?)<500 ON CONFLICT(owner,idem) DO NOTHING").bind(crypto.randomUUID(),user.owner,b.device,b.text,b.audio,now(),b.key,user.owner,now()-86400).run();const m=await env.DB.prepare('SELECT id,device,text,audio,status FROM messages WHERE owner=? AND idem=?').bind(user.owner,b.key).first();assert(m,429);assert(m.device===b.device&&m.text===b.text&&m.audio===b.audio,409);return json({id:m.id,status:m.status},202);
 }
 if(path==='/api/messages'&&req.method==='GET')return json({messages:(await env.DB.prepare('SELECT id,device,text,status,created FROM messages WHERE owner=? ORDER BY created DESC,rowid DESC LIMIT 100').bind(user.owner).all()).results});
 return json({error:'Not found'},404);
 }
 return env.ASSETS.fetch(req);
 }catch(e){return json({error:e.status===401?'Oturum gerekli':e.status===429?'Çok fazla istek':'İstek tamamlanamadı'},e.status||500);}},
 async scheduled(_event,env){await drainPush(env);const cutoff=now()-604800;await deleteOldAudio(env,cutoff);await env.DB.batch([env.DB.prepare('DELETE FROM messages WHERE created<?').bind(cutoff),env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(now()),env.DB.prepare('DELETE FROM pairs WHERE expires<?').bind(now()),env.DB.prepare('DELETE FROM oauth WHERE expires<?').bind(now()),env.DB.prepare('DELETE FROM limits WHERE expires<?').bind(now()),env.DB.prepare('DELETE FROM push_jobs WHERE created<?').bind(cutoff),env.DB.prepare('DELETE FROM push_receipts WHERE job NOT IN (SELECT id FROM push_jobs)'),env.DB.prepare('DELETE FROM push_subscriptions WHERE session_hash NOT IN (SELECT hash FROM sessions)')]);}
};

