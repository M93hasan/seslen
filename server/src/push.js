import {SignJWT,importJWK} from 'jose';
export function validEndpoint(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&value.length<2048&&(u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname==='push.apple.com'||u.hostname.endsWith('.push.apple.com'));}catch{return false}}
// Empty Web Push: no message content is sent to the push provider. The service worker
// displays the generic Seen receipt; opening Seslen retrieves the authenticated history.
export async function deliverPush(env,endpoint,fetcher=fetch){
 if(!validEndpoint(endpoint))throw Error('Invalid push endpoint');
 const key=await importJWK(JSON.parse(env.VAPID_PRIVATE_JWK),'ES256');
 const token=await new SignJWT({}).setProtectedHeader({alg:'ES256',typ:'JWT'}).setAudience(new URL(endpoint).origin).setSubject(env.ORIGIN).setExpirationTime('1h').sign(key);
 return fetcher(endpoint,{method:'POST',redirect:'error',headers:{TTL:'86400',Authorization:`vapid t=${token}, k=${env.VAPID_PUBLIC_KEY}`},signal:AbortSignal.timeout(10000)});
}
export async function drainPush(env,fetcher=fetch){
 if(!env.VAPID_PRIVATE_JWK||!env.VAPID_PUBLIC_KEY)return;
 const now=Math.floor(Date.now()/1000);
 const jobs=(await env.DB.prepare('SELECT id,owner,attempts FROM push_jobs WHERE attempts<5 AND next_attempt<=? ORDER BY created LIMIT 3').bind(now).all()).results;
 for(const job of jobs){let failed=false;
 const subs=(await env.DB.prepare("SELECT p.id,p.endpoint FROM push_subscriptions p JOIN sessions s ON s.hash=p.session_hash WHERE p.owner=? AND s.expires>? AND NOT EXISTS(SELECT 1 FROM push_receipts r WHERE r.job=? AND r.subscription=p.id) LIMIT 5").bind(job.owner,now,job.id).all()).results;
 for(const sub of subs){try{const response=await deliverPush(env,sub.endpoint,fetcher);if(response.status===404||response.status===410)await env.DB.prepare('DELETE FROM push_subscriptions WHERE id=?').bind(sub.id).run();else if(response.ok)await env.DB.prepare('INSERT OR IGNORE INTO push_receipts VALUES(?,?)').bind(job.id,sub.id).run();else failed=true;}catch{failed=true}}
 if(failed)await env.DB.prepare('UPDATE push_jobs SET attempts=attempts+1,next_attempt=? WHERE id=?').bind(now+Math.min(3600,60*2**job.attempts),job.id).run();
 else await env.DB.batch([env.DB.prepare('DELETE FROM push_receipts WHERE job=?').bind(job.id),env.DB.prepare('DELETE FROM push_jobs WHERE id=?').bind(job.id)]);
 }
}
