export function validateMessage(b){
 if(typeof b.device!=='string'||b.device.length>100||typeof b.key!=='string'||b.key.length<16||b.key.length>100)throw Error('invalid');
 const text=b.text??'',audio=b.audio??'';
 if(typeof text!=='string'||typeof audio!=='string'||text.length>4000||audio.length>100||(!text.trim()&&!audio))throw Error('invalid');
 return {device:b.device,key:b.key,text,audio};
}
export function publicStatus(m){return m.status==='seen'?'Görüldü':m.status==='failed'?'Başarısız':m.status==='delivered'?'Teslim edildi':'Beklemede';}
