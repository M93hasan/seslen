import {createRemoteJWKSet,jwtVerify} from 'jose';
import {validateMessage} from './validation.js';
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
 async fetch(req,env){try{
 const url=new URL(req.url),path=url.pathname;assert(url.protocol==='https:'||url.hostname==='localhost'||url.hostname==='127.0.0.1',400);
 if(path==='/health')return json({app:'Seslen',version:'0.1.0-test'});
 if(path.startsWith('/api/')||path.startsWith('/auth/'))await rate(req,env,path);
 if(path==='/auth/login'&&req.method==='GET'){
 const state=random(),verifier=random(),nonce=random();await env.DB.prepare('INSERT INTO oauth VALUES(?,?,?,?)').bind(await hash(state),verifier,nonce,now()+600).run();
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(verifier)));const challenge=btoa(String.fromCharCode(...digest)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
 const u=new URL('https://accounts.google.com/o/oauth2/v2/auth');u.search=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:env.ORIGIN+'/auth/callback',response_type:'code',scope:'openid email',state,nonce,code_challenge:challenge,code_challenge_method:'S256'}).toString();
 return new Response(null,{status:302,headers:{Location:u.href,'Set-Cookie':cookie('oauth',state,600),'Cache-Control':'no-store'}});
 }
 if(path==='/auth/callback'&&req.method==='GET'){
 const state=url.searchParams.get('state');assert(state&&state===cookies(req).oauth,403);
 const flow=await env.DB.prepare('DELETE FROM oauth WHERE state=? AND expires>? RETURNING *').bind(await hash(state),now()).first();assert(flow,403);
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code:url.searchParams.get('code')||'',client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:env.ORIGIN+'/auth/callback',grant_type:'authorization_code',code_verifier:flow.verifier})});assert(response.ok,401);
 const tokens=await response.json();const {payload}=await jwtVerify(tokens.id_token,createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs')),{issuer:['https://accounts.google.com','accounts.google.com'],audience:env.GOOGLE_CLIENT_ID});assert(payload.nonce===flow.nonce&&payload.sub,401);
 const session=random();await env.DB.prepare('INSERT INTO sessions VALUES(?,?,?,?)').bind(await hash(session),payload.sub,'browser',now()+2592000).run();return new Response(null,{status:302,headers:{Location:'/', 'Set-Cookie':cookie('session',session,2592000),'Cache-Control':'no-store'}});
 }
 if(path==='/api/pair/start'&&req.method==='POST'){
 await body(req);const code=random().slice(0,12).toUpperCase(),poll=random();await env.DB.prepare('INSERT INTO pairs VALUES(?,?,?,NULL)').bind(code,await hash(poll),now()+360).run();return json({code,poll,expires:360});
 }
 if(path==='/api/pair/poll'&&req.method==='POST'){
 const b=await body(req);assert(typeof b.poll==='string'&&b.poll.length===64);const h=await hash(b.poll);const row=await env.DB.prepare('DELETE FROM pairs WHERE poll=? AND expires>? AND token IS NOT NULL RETURNING token').bind(h,now()).first();return json(row?{token:row.token}:{waiting:true});
 }
 if(path.startsWith('/api/')){
 const user=await auth(req,env);
 if(path==='/api/inbox'&&req.method==='GET'){assert(user.kind==='tv',403);const r=await env.DB.prepare('SELECT id,text,audio FROM messages WHERE device=? AND done=0 AND created>? ORDER BY created,rowid LIMIT 50').bind(user.id,now()-604800).all();return json({messages:r.results});}
 if(path==='/api/events'&&req.method==='POST'){
 assert(user.kind==='tv',403);const b=await body(req);assert(typeof b.id==='string'&&['delivered','finished','seen','failed'].includes(b.status));
 const status=b.status==='finished'?'delivered':b.status;await env.DB.prepare("UPDATE messages SET status=CASE WHEN status='seen' THEN 'seen' WHEN done=1 AND ?='delivered' THEN status ELSE ? END,done=MAX(done,?) WHERE id=? AND device=?").bind(status,status,b.status==='delivered'?0:1,b.id,user.id).run();return json({ok:true});
 }
 if(path.startsWith('/api/audio/')&&req.method==='GET'){
 const id=path.slice('/api/audio/'.length);let allowed;
 if(user.kind==='tv')allowed=await env.DB.prepare('SELECT id FROM messages WHERE audio=? AND device=? AND created>?').bind(id,user.id,now()-604800).first();else allowed=await env.DB.prepare('SELECT id FROM audio WHERE id=? AND owner=? AND created>?').bind(id,user.owner,now()-604800).first();assert(allowed,404);const obj=await env.AUDIO.get(id);assert(obj,404);return new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 assert(user.kind!=='tv',403);
 if(path==='/api/devices'&&req.method==='GET')return json({devices:(await env.DB.prepare('SELECT id,name FROM devices WHERE owner=? AND revoked=0').bind(user.owner).all()).results});
 if(path==='/api/pair/confirm'&&req.method==='POST'){
 assert(user.kind==='browser',403);const b=await body(req);assert(typeof b.code==='string'&&/^[A-F0-9]{12}$/.test(b.code));const token=random(),id=crypto.randomUUID();const name=typeof b.name==='string'?b.name.slice(0,80):'Seslen TV';
 const r=await env.DB.batch([env.DB.prepare('UPDATE pairs SET token=? WHERE code=? AND expires>? AND token IS NULL').bind(token,b.code,now()),env.DB.prepare('INSERT INTO devices(id,owner,name,hash) SELECT ?,?,?,? WHERE changes()=1').bind(id,user.owner,name,await hash(token))]);assert(r[0].meta.changes===1,409);return json({id});
 }
 if(path==='/api/revoke'&&req.method==='POST'){assert(user.kind==='browser',403);const b=await body(req);assert(typeof b.device==='string');await env.DB.prepare('UPDATE devices SET revoked=1 WHERE id=? AND owner=?').bind(b.device,user.owner).run();return json({ok:true});}
 if(path==='/api/sender-token'&&req.method==='POST'){assert(user.kind==='browser',403);await body(req);const token=random();await env.DB.prepare('INSERT INTO sessions VALUES(?,?,?,?)').bind(await hash(token),user.owner,'sender',now()+2592000).run();return json({token,expiresDays:30});}
 if(path==='/api/revoke-senders'&&req.method==='POST'){assert(user.kind==='browser',403);await env.DB.prepare("DELETE FROM sessions WHERE owner=? AND kind='sender'").bind(user.owner).run();return json({ok:true});}
 if(path==='/api/logout'&&req.method==='POST'){await env.DB.prepare('DELETE FROM sessions WHERE hash=?').bind(user.hash).run();return json({ok:true},200,{'Set-Cookie':cookie('session','',0)});}
 if(path==='/api/audio'&&req.method==='POST'){
 const type=req.headers.get('Content-Type')?.split(';')[0];assert(['audio/mp4','audio/aac','audio/mpeg','audio/wav','audio/x-m4a','audio/webm'].includes(type),415);const bytes=await bounded(req,5*1024*1024);assert(bytes.length>0);const id=crypto.randomUUID();await env.AUDIO.put(id,bytes,{httpMetadata:{contentType:type}});await env.DB.prepare('INSERT INTO audio VALUES(?,?,?)').bind(id,user.owner,now()).run();return json({audio:id});
 }
 if(path==='/api/messages'&&req.method==='POST'){
 let b;try{b=validateMessage(await body(req))}catch(e){throw {status:400}}
 assert(await device(env,b.device,user.owner),404);
 if(b.audio)assert(await env.DB.prepare('SELECT id FROM audio WHERE id=? AND owner=? AND created>?').bind(b.audio,user.owner,now()-604800).first(),404);
 await env.DB.prepare("INSERT INTO messages(id,owner,device,text,audio,created,idem) VALUES(?,?,?,?,?,?,?) ON CONFLICT(owner,idem) DO NOTHING").bind(crypto.randomUUID(),user.owner,b.device,b.text,b.audio,now(),b.key).run();const m=await env.DB.prepare('SELECT id,device,text,audio,status FROM messages WHERE owner=? AND idem=?').bind(user.owner,b.key).first();assert(m.device===b.device&&m.text===b.text&&m.audio===b.audio,409);return json({id:m.id,status:m.status},202);
 }
 if(path==='/api/messages'&&req.method==='GET')return json({messages:(await env.DB.prepare('SELECT id,device,text,status,created FROM messages WHERE owner=? ORDER BY created DESC,rowid DESC LIMIT 100').bind(user.owner).all()).results});
 return json({error:'Not found'},404);
 }
 return env.ASSETS.fetch(req);
 }catch(e){return json({error:e.status===401?'Oturum gerekli':e.status===429?'Çok fazla istek':'İstek tamamlanamadı'},e.status||500);}},
 async scheduled(_event,env){const cutoff=now()-604800;const old=await env.DB.prepare('SELECT id FROM audio WHERE created<? LIMIT 500').bind(cutoff).all();for(const item of old.results){await env.AUDIO.delete(item.id);await env.DB.prepare('DELETE FROM audio WHERE id=?').bind(item.id).run()}await env.DB.batch([env.DB.prepare('DELETE FROM messages WHERE created<?').bind(cutoff),env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(now()),env.DB.prepare('DELETE FROM pairs WHERE expires<?').bind(now()),env.DB.prepare('DELETE FROM oauth WHERE expires<?').bind(now()),env.DB.prepare('DELETE FROM limits WHERE expires<?').bind(now())]);}
};
