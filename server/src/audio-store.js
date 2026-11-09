// D1 is the default for small household recordings. R2 remains an optional backend.
const CHUNK=256*1024,USER_LIMIT=20*1024*1024,TOTAL_LIMIT=100*1024*1024;
export async function storeAudio(env,id,owner,bytes,mime,created){
 const backend=env.AUDIO_BACKEND==='r2'?'r2':'d1';
 if(backend==='r2'&&!env.AUDIO)throw {status:503};
 const reserved=await env.DB.prepare(`INSERT INTO audio(id,owner,created,backend,bytes,mime,ready)
 SELECT ?,?,?,?,?,?,0 WHERE
 (SELECT COALESCE(SUM(bytes),0) FROM audio WHERE owner=?)+?<=? AND
 (SELECT COALESCE(SUM(bytes),0) FROM audio)+?<=? AND
 (SELECT COUNT(*) FROM audio WHERE owner=? AND created>?)<100`).bind(id,owner,created,backend,bytes.length,mime,owner,bytes.length,USER_LIMIT,bytes.length,TOTAL_LIMIT,owner,created-86400).run();
 if(reserved.meta.changes!==1)throw {status:429};
 try{
 if(backend==='r2')await env.AUDIO.put(id,bytes,{httpMetadata:{contentType:mime}});
 else {const statements=[];for(let i=0;i<bytes.length;i+=CHUNK)statements.push(env.DB.prepare('INSERT INTO audio_chunks VALUES(?,?,?)').bind(id,i/CHUNK,bytes.slice(i,i+CHUNK).buffer));await env.DB.batch(statements);}
 await env.DB.prepare('UPDATE audio SET ready=1 WHERE id=?').bind(id).run();
 }catch(e){await env.DB.batch([env.DB.prepare('DELETE FROM audio_chunks WHERE audio_id=?').bind(id),env.DB.prepare('DELETE FROM audio WHERE id=?').bind(id)]);if(backend==='r2')await env.AUDIO.delete(id);throw e;}
}
export async function getAudio(env,id){
 const info=await env.DB.prepare('SELECT backend,mime,bytes FROM audio WHERE id=? AND ready=1').bind(id).first();if(!info)return null;
 if(info.backend==='r2')return env.AUDIO?await env.AUDIO.get(id):null;
 const {results}=await env.DB.prepare('SELECT data FROM audio_chunks WHERE audio_id=? ORDER BY part').bind(id).all();
 const bytes=new Uint8Array(info.bytes);let offset=0;for(const r of results){const chunk=new Uint8Array(r.data);bytes.set(chunk,offset);offset+=chunk.length;}if(offset!==info.bytes)return null;
 return {body:bytes,httpMetadata:{contentType:info.mime}};
}
export async function deleteOldAudio(env,cutoff){
 const {results}=await env.DB.prepare('SELECT id,backend FROM audio WHERE created<? LIMIT 500').bind(cutoff).all();
 for(const a of results){if(a.backend==='r2'){if(!env.AUDIO)continue;await env.AUDIO.delete(a.id);}await env.DB.batch([env.DB.prepare('DELETE FROM audio_chunks WHERE audio_id=?').bind(a.id),env.DB.prepare('DELETE FROM audio WHERE id=?').bind(a.id)]);}
}
