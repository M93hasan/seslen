import {webcrypto} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const directory=new URL('../.secrets/',import.meta.url);await mkdir(directory,{recursive:true,mode:0o700});
const privatePath=new URL('vapid-private.json',directory),publicPath=new URL('vapid-public.txt',directory);
try{await readFile(privatePath);console.log('Existing VAPID key retained.');}catch(e){if(e.code!=='ENOENT')throw e;const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const jwk=await webcrypto.subtle.exportKey('jwk',pair.privateKey);const raw=Buffer.from(await webcrypto.subtle.exportKey('raw',pair.publicKey)).toString('base64url');await writeFile(privatePath,JSON.stringify(jwk),{mode:0o600,flag:'wx'});await writeFile(publicPath,raw,{mode:0o600,flag:'wx'});console.log('VAPID files created in server/.secrets; private key was not printed.');}
