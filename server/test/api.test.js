import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import worker from '../src/index.js';
const digest=async s=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))).toString('hex');
function setup(){const sql=new DatabaseSync(':memory:');for(const name of ['0001.sql','0002_audio_storage.sql','0003_push.sql','0004_account_connect.sql','0005_ios_native.sql'])sql.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));function prep(query){let args=[];const stmt={bind(...values){args=values.map(v=>v instanceof ArrayBuffer?new Uint8Array(v):v);return stmt},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)}}}};return stmt}const objects=new Map();return {sql,env:{ORIGIN:'https://seslen.example',DB:{prepare:prep,async batch(stmts){sql.exec('BEGIN');try{const r=[];for(const s of stmts)r.push(await s.run());sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}},AUDIO:{async put(id,bytes,metadata){objects.set(id,{body:bytes,httpMetadata:metadata.httpMetadata})},async get(id){return objects.get(id)},async delete(id){objects.delete(id)}},ASSETS:{fetch(){return new Response('Seslen')}}}}}
async function seed(env,token='sender',owner='one',kind='sender'){await env.DB.prepare('INSERT INTO sessions VALUES(?,?,?,?)').bind(await digest(token),owner,kind,Math.floor(Date.now()/1000)+1000).run()}
function call(env,path,body,token,extra={}){return worker.fetch(new Request('https://seslen.example'+path,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)}),env)}
async function paired(env){await seed(env,'browser','one','browser');const p=await (await call(env,'/api/pair/start',{})).json();assert.equal((await call(env,'/api/pair/confirm',{code:p.code,name:'TV'},'browser')).status,200);const {token}=await (await call(env,'/api/pair/poll',{poll:p.poll})).json();assert.ok(token);return {token,id:(await (await call(env,'/api/devices',undefined,'browser')).json()).devices[0].id,p};}
test('unauthorized and malformed requests fail closed',async()=>{const {env}=setup();assert.equal((await call(env,'/api/messages')).status,401);await seed(env);assert.equal((await call(env,'/api/messages',{text:'hi'},'sender')).status,400)});
test('pair code single use, poll single use, role boundaries',async()=>{const {env}=setup();const {token,p}=await paired(env);assert.equal((await call(env,'/api/pair/confirm',{code:p.code},'browser')).status,409);assert.deepEqual(await (await call(env,'/api/pair/poll',{poll:p.poll})).json(),{waiting:true});assert.equal((await call(env,'/api/devices',undefined,token)).status,403);await seed(env);assert.equal((await call(env,'/api/pair/confirm',{code:p.code},'sender')).status,403)});
test('durable queue, idempotency conflict, delivered distinct from seen',async()=>{const {env}=setup();const {token,id}=await paired(env);await seed(env);const msg={device:id,text:'Türkçe şğıöüç',key:crypto.randomUUID()};const a=await (await call(env,'/api/messages',msg,'sender')).json();const b=await (await call(env,'/api/messages',msg,'sender')).json();assert.equal(a.id,b.id);assert.equal((await call(env,'/api/messages',{...msg,text:'different'},'sender')).status,409);const inbox=await (await call(env,'/api/inbox',undefined,token)).json();assert.equal(inbox.messages.length,1);await call(env,'/api/events',{id:a.id,status:'delivered'},token);assert.equal((await (await call(env,'/api/messages',undefined,'sender')).json()).messages[0].status,'delivered');await call(env,'/api/events',{id:a.id,status:'seen'},token);await call(env,'/api/events',{id:a.id,status:'delivered'},token);assert.equal((await (await call(env,'/api/messages',undefined,'sender')).json()).messages[0].status,'seen');assert.equal((await (await call(env,'/api/inbox',undefined,token)).json()).messages.length,0)});
test('cross-account send, history and audio are isolated',async()=>{const {env}=setup();const {id,token}=await paired(env);await seed(env,'other','two');assert.equal((await call(env,'/api/messages',{device:id,text:'x',key:crypto.randomUUID()},'other')).status,404);assert.equal((await (await call(env,'/api/messages',undefined,'other')).json()).messages.length,0);const upload=await worker.fetch(new Request('https://seslen.example/api/audio',{method:'POST',headers:{Authorization:'Bearer browser','Content-Type':'audio/mp4'},body:new Uint8Array([1,2,3])}),env);const {audio}=await upload.json();assert.equal((await call(env,'/api/audio/'+audio,undefined,'other')).status,404);assert.equal((await call(env,'/api/audio/'+audio,undefined,token)).status,404);assert.equal((await call(env,'/api/audio/'+audio,undefined,'browser')).status,200)});
test('cookie CSRF, device revoke, sender revoke and expired session',async()=>{const {env,sql}=setup();const {id,token}=await paired(env);assert.equal((await call(env,'/api/revoke',{device:id},undefined,{Cookie:'session=browser',Origin:'https://evil.example'})).status,403);await call(env,'/api/revoke',{device:id},'browser');assert.equal((await call(env,'/api/inbox',undefined,token)).status,401);await seed(env);await call(env,'/api/revoke-senders',{},'browser');assert.equal((await call(env,'/api/messages',undefined,'sender')).status,401);sql.exec('UPDATE sessions SET expires=0');assert.equal((await call(env,'/api/devices',undefined,'browser')).status,401)});
test('oversize JSON, unsupported audio, rate limiting and retention',async()=>{const {env,sql}=setup();await seed(env);assert.equal((await call(env,'/api/messages',{x:'x'.repeat(18000)},'sender')).status,400);const r=await worker.fetch(new Request('https://seslen.example/api/audio',{method:'POST',headers:{Authorization:'Bearer sender','Content-Type':'text/html'},body:'x'}),env);assert.equal(r.status,415);for(let i=0;i<60;i++)await call(env,'/api/pair/start',{});assert.equal((await call(env,'/api/pair/start',{})).status,429);sql.exec("INSERT INTO messages VALUES('old','one','tv','old','','pending',0,1,'oldkey'); INSERT INTO audio(id,owner,created) VALUES('old','one',1)");await env.AUDIO.put('old',new Uint8Array([1]),{httpMetadata:{}});await worker.scheduled({},env);assert.equal(sql.prepare('SELECT count(*) n FROM messages').get().n,0);assert.equal(await env.AUDIO.get('old'),undefined)});


test('D1 audio works without R2, preserves chunks and authorizes TV only after send',async()=>{const {env,sql}=setup();delete env.AUDIO;const {id,token}=await paired(env);const bytes=new Uint8Array(700000);for(let i=0;i<bytes.length;i++)bytes[i]=i%251;const upload=await worker.fetch(new Request('https://seslen.example/api/audio',{method:'POST',headers:{Authorization:'Bearer browser','Content-Type':'audio/mp4'},body:bytes}),env);assert.equal(upload.status,200);const {audio}=await upload.json();assert.equal(sql.prepare('SELECT COUNT(*) n FROM audio_chunks').get().n,3);assert.equal((await call(env,'/api/audio/'+audio,undefined,token)).status,404);await call(env,'/api/messages',{device:id,audio,key:crypto.randomUUID()},'browser');const response=await call(env,'/api/audio/'+audio,undefined,token);assert.equal(response.status,200);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);sql.exec('UPDATE audio SET created=1');await worker.scheduled({},env);assert.equal(sql.prepare('SELECT COUNT(*) n FROM audio_chunks').get().n,0)});
test('audio quotas include pending reservations; cross-owner cannot consume reserved audio',async()=>{const {env,sql}=setup();await seed(env);sql.prepare('INSERT INTO audio(id,owner,created,bytes,backend,ready) VALUES(?,?,?,?,?,0)').run('reservation','one',Math.floor(Date.now()/1000),20*1024*1024,'d1');const response=await worker.fetch(new Request('https://seslen.example/api/audio',{method:'POST',headers:{Authorization:'Bearer sender','Content-Type':'audio/mp4'},body:new Uint8Array([1])}),env);assert.equal(response.status,429);assert.equal((await call(env,'/api/audio/reservation',undefined,'sender')).status,404)});
test('message quota rejects new requests but allows idempotent replay',async()=>{const {env,sql}=setup();const {id}=await paired(env);await seed(env);const msg={device:id,text:'hi',key:crypto.randomUUID()};const first=await (await call(env,'/api/messages',msg,'sender')).json();const statement=sql.prepare('INSERT INTO messages(id,owner,device,text,created,idem) VALUES(?,?,?,?,?,?)');for(let i=0;i<499;i++)statement.run('quota'+i,'one',id,'q',Math.floor(Date.now()/1000),'quota-key'+i);assert.equal((await call(env,'/api/messages',{...msg,key:crypto.randomUUID()},'sender')).status,429);assert.equal((await (await call(env,'/api/messages',msg,'sender')).json()).id,first.id)});

test('Seen pushes are durable, only queued once, and not queued for delivery alone',async()=>{const {env,sql}=setup();const {token,id}=await paired(env);const m=await (await call(env,'/api/messages',{device:id,text:'hi',key:crypto.randomUUID()},'browser')).json();await call(env,'/api/events',{id:m.id,status:'delivered'},token);assert.equal(sql.prepare('SELECT COUNT(*) n FROM push_jobs').get().n,0);await call(env,'/api/events',{id:m.id,status:'seen'},token);await call(env,'/api/events',{id:m.id,status:'seen'},token);assert.equal(sql.prepare('SELECT COUNT(*) n FROM push_jobs').get().n,1)});
test('push subscription rejects SSRF, limits phones, and logout revokes subscription',async()=>{const {env,sql}=setup();await seed(env,'browser','one','browser');env.VAPID_PUBLIC_KEY='test';env.VAPID_PRIVATE_JWK='test';for(const endpoint of ['https://evil.example/push','http://fcm.googleapis.com/x','https://fcm.googleapis.com.evil.example/x','https://user@fcm.googleapis.com/x','https://fcm.googleapis.com:8443/x'])assert.equal((await call(env,'/api/push/subscribe',{endpoint},'browser')).status,400);for(let i=0;i<5;i++)assert.equal((await call(env,'/api/push/subscribe',{endpoint:'https://web.push.apple.com/'+i},'browser')).status,200);assert.equal((await call(env,'/api/push/subscribe',{endpoint:'https://web.push.apple.com/6'},'browser')).status,429);await call(env,'/api/logout',{},'browser');assert.equal(sql.prepare('SELECT COUNT(*) n FROM push_subscriptions').get().n,0)});

test('push retry records successful phones and retries only failed ones',async()=>{const {drainPush}=await import('../src/push.js');const {env,sql}=setup();await seed(env,'browser','one','browser');const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);env.VAPID_PRIVATE_JWK=JSON.stringify(await crypto.subtle.exportKey('jwk',pair.privateKey));env.VAPID_PUBLIC_KEY=Buffer.from(await crypto.subtle.exportKey('raw',pair.publicKey)).toString('base64url');for(const suffix of ['ok','retry'])assert.equal((await call(env,'/api/push/subscribe',{endpoint:'https://web.push.apple.com/'+suffix},'browser')).status,200);sql.prepare('INSERT INTO push_jobs(id,owner,created) VALUES(?,?,?)').run('job','one',Math.floor(Date.now()/1000));let requests=[];let fail=true;const fetcher=async endpoint=>{requests.push(endpoint);return new Response(null,{status:endpoint.endsWith('/retry')&&fail?503:201})};await drainPush(env,fetcher);assert.equal(sql.prepare('SELECT attempts FROM push_jobs').get().attempts,1);assert.equal(sql.prepare('SELECT COUNT(*) n FROM push_receipts').get().n,1);fail=false;sql.exec('UPDATE push_jobs SET next_attempt=0');await drainPush(env,fetcher);assert.equal(requests.filter(x=>x.endsWith('/ok')).length,1);assert.equal(requests.filter(x=>x.endsWith('/retry')).length,2);assert.equal(sql.prepare('SELECT COUNT(*) n FROM push_jobs').get().n,0)});
test('failed D1 chunk writes release reservation and do not expose partial audio',async()=>{const {env,sql}=setup();await seed(env);const original=env.DB.batch;let fail=true;env.DB.batch=async statements=>{if(fail){fail=false;throw Error('storage unavailable')}return original(statements)};const r=await worker.fetch(new Request('https://seslen.example/api/audio',{method:'POST',headers:{Authorization:'Bearer sender','Content-Type':'audio/mp4'},body:new Uint8Array([1,2,3])}),env);assert.equal(r.status,500);assert.equal(sql.prepare('SELECT COUNT(*) n FROM audio').get().n,0);assert.equal(sql.prepare('SELECT COUNT(*) n FROM audio_chunks').get().n,0)});

test('QR handoff uses canonical origin, preserves OAuth pairing, rejects expired or injected targets',async()=>{const {env,sql}=setup();env.GOOGLE_CLIENT_ID='test.apps.googleusercontent.com';env.GOOGLE_CLIENT_SECRET='test';const p=await (await call(env,'/api/pair/start',{})).json();assert.equal(p.url,env.ORIGIN+'/?pair='+p.code);const response=await call(env,'/auth/login?pair='+p.code);assert.equal(response.status,302);const target=new URL(response.headers.get('Location'));assert.equal(target.hostname,'accounts.google.com');assert.equal(target.searchParams.get('redirect_uri'),env.ORIGIN+'/auth/callback');assert.equal(sql.prepare('SELECT pair_code FROM oauth').get().pair_code,p.code);assert.equal((await call(env,'/auth/login?pair=https://evil.example')).status,400);sql.exec('UPDATE pairs SET expires=0');assert.equal((await call(env,'/auth/login?pair='+p.code)).status,410)});
test('account identity remains scoped and TV pairing returns only its linked account',async()=>{const {env,sql}=setup();sql.prepare('INSERT INTO accounts VALUES(?,?)').run('one','one@example.test');sql.prepare('INSERT INTO accounts VALUES(?,?)').run('two','two@example.test');await seed(env,'browser','one','browser');await seed(env,'other','two','browser');assert.equal((await call(env,'/api/account')).status,401);assert.equal((await (await call(env,'/api/account',undefined,'other')).json()).email,'two@example.test');const p=await (await call(env,'/api/pair/start',{})).json();await call(env,'/api/pair/confirm',{code:p.code,name:'Salon'},'browser');const result=await (await call(env,'/api/pair/poll',{poll:p.poll})).json();assert.equal(result.email,'one@example.test');assert.equal((await (await call(env,'/api/account',undefined,result.token)).json()).email,'one@example.test');assert.deepEqual(await (await call(env,'/api/pair/poll',{poll:p.poll})).json(),{waiting:true});assert.equal((await call(env,'/api/pair/confirm',{code:p.code},'other')).status,409)});


test('Seslen custom-domain login keeps OAuth callback on the same hostname',async()=>{
 const {env}=setup();
 env.ORIGIN='https://seslen-staging.m93hasan.workers.dev';
 env.GOOGLE_CLIENT_ID='test.apps.googleusercontent.com';
 env.GOOGLE_CLIENT_SECRET='test-secret';
 const response=await worker.fetch(new Request('https://seslen.serula.site/auth/login'),env);
 assert.equal(response.status,302);
 const location=new URL(response.headers.get('Location'));
 assert.equal(location.hostname,'accounts.google.com');
 assert.equal(location.searchParams.get('redirect_uri'),'https://seslen.serula.site/auth/callback');
 assert.match(response.headers.get('Set-Cookie'),/^oauth=/);
 const forbidden=await worker.fetch(new Request('https://evil.example/auth/login'),env);
 assert.equal(forbidden.status,403);
});

test('Seslen legacy TV staging OAuth continues to use its own callback',async()=>{
 const {env}=setup();
 env.ORIGIN='https://seslen-staging.m93hasan.workers.dev';
 env.GOOGLE_CLIENT_ID='test.apps.googleusercontent.com';
 env.GOOGLE_CLIENT_SECRET='test-secret';
 const response=await worker.fetch(new Request('https://seslen-staging.m93hasan.workers.dev/auth/login'),env);
 assert.equal(response.status,302);
 const location=new URL(response.headers.get('Location'));
 assert.equal(location.searchParams.get('redirect_uri'),'https://seslen-staging.m93hasan.workers.dev/auth/callback');
});

test('browser cookie mutations allow only matching request origin, not foreign origin',async()=>{
 const {env}=setup();
 env.ORIGIN='https://seslen-staging.m93hasan.workers.dev';
 await seed(env,'browser','one','browser');
 const make=(host,origin)=>worker.fetch(new Request(host+'/api/revoke-senders',{
  method:'POST',headers:{Cookie:'session=browser',Origin:origin,'Content-Type':'application/json'},body:'{}'
 }),env);
 assert.equal((await make('https://seslen.serula.site','https://seslen.serula.site')).status,200);
 assert.equal((await make('https://seslen.serula.site','https://evil.example')).status,403);
 assert.equal((await make('https://seslen-staging.m93hasan.workers.dev','https://seslen.serula.site')).status,403);
 assert.equal((await make('https://evil.example','https://evil.example')).status,403);
});


test('native iPhone browser OAuth uses existing Google Web client and bound PKCE challenge',async()=>{
 const {env,sql}=setup();env.ORIGIN='https://seslen-staging.m93hasan.workers.dev';
 env.GOOGLE_CLIENT_ID='test.apps.googleusercontent.com';env.GOOGLE_CLIENT_SECRET='secret';
 const challenge='A'.repeat(43);
 const r=await worker.fetch(new Request('https://seslen.serula.site/auth/ios/login?challenge='+challenge),env);
 assert.equal(r.status,302);
 const target=new URL(r.headers.get('Location'));
 assert.equal(target.searchParams.get('redirect_uri'),'https://seslen.serula.site/auth/callback');
 assert.equal(target.searchParams.get('code_challenge_method'),'S256');
 assert.equal(sql.prepare('SELECT pair_code FROM oauth').get().pair_code,'ios:'+challenge);
 assert.equal((await worker.fetch(new Request('https://seslen.serula.site/auth/ios/login?challenge=https://evil'),env)).status,400);
});

test('native ticket exchange is PKCE-verified, one-time and shares Google browser account',async()=>{
 const {env,sql}=setup();
 const verifier='A'.repeat(43);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
 const challenge=Buffer.from(digest).toString('base64url');
 const ticket='a'.repeat(64);
 const digestTicket=await digestValue(ticket);
 sql.prepare('INSERT INTO accounts(owner,email) VALUES(?,?)').run('native-owner','iphone@example.test');
 sql.prepare('INSERT INTO ios_tickets(hash,owner,challenge,expires) VALUES(?,?,?,?)')
  .run(digestTicket,'native-owner',challenge,Math.floor(Date.now()/1000)+100);
 const invalid=await call(env,'/api/ios/token',{ticket,verifier:'B'.repeat(43)});
 assert.equal(invalid.status,403);
 const ok=await call(env,'/api/ios/token',{ticket,verifier});
 assert.equal(ok.status,200);
 const data=await ok.json();
 assert.equal(data.expiresDays,30);
 assert.match(data.token,/^[a-f0-9]{64}$/);
 const account=await (await call(env,'/api/account',undefined,data.token)).json();
 assert.equal(account.email,'iphone@example.test');
 assert.equal((await call(env,'/api/ios/token',{ticket,verifier})).status,403);
 assert.equal((await call(env,'/api/logout',{},data.token)).status,200);
 assert.equal((await call(env,'/api/account',undefined,data.token)).status,401);
});

test('expired native tickets never issue tokens',async()=>{
 const {env,sql}=setup();const ticket='b'.repeat(64),verifier='C'.repeat(43);
 const challenge=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))).toString('base64url');
 sql.prepare('INSERT INTO ios_tickets(hash,owner,challenge,expires) VALUES(?,?,?,?)').run(await digestValue(ticket),'expired-owner',challenge,1);
 assert.equal((await call(env,'/api/ios/token',{ticket,verifier})).status,403);
});

const digestValue=digest;
