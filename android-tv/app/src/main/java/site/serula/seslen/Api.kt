package site.serula.seslen
import android.content.Context
import android.util.Base64
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.spec.GCMParameterSpec
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

class Vault(val c: Context) {
 private val p=c.getSharedPreferences("seslen",0)
 private fun key(): java.security.Key { val ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);return ks.getKey("seslen",null) ?: KeyGenerator.getInstance("AES","AndroidKeyStore").apply { init(KeyGenParameterSpec.Builder("seslen",KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes("GCM").setEncryptionPaddings("NoPadding").build()) }.generateKey() }
 fun token(): String = try { val raw=Base64.decode(p.getString("secret","")!!,0);val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),GCMParameterSpec(128,raw.copyOfRange(0,12)));String(cipher.doFinal(raw.copyOfRange(12,raw.size))) } catch(e:Exception) { "" }
 fun save(t:String) { val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());p.edit().putString("secret",Base64.encodeToString(cipher.iv+cipher.doFinal(t.toByteArray()),0)).apply() }
}
object Api {
 fun call(base:String,path:String,token:String="",body:JSONObject?=null):JSONObject {
 require(base.startsWith("https://") && URL(base).userInfo==null)
 val c=URL(base.trimEnd('/')+path).openConnection() as HttpURLConnection
 c.connectTimeout=10000;c.readTimeout=15000;c.instanceFollowRedirects=false
 if(token.isNotBlank()) c.setRequestProperty("Authorization","Bearer $token")
 try { if(body!=null) { c.requestMethod="POST";c.doOutput=true;c.setRequestProperty("Content-Type","application/json");c.outputStream.use {it.write(body.toString().toByteArray())} }
 if(c.responseCode !in 200..299) throw java.io.IOException("HTTP ${c.responseCode}")
 return JSONObject(c.inputStream.bufferedReader().use {it.readText()}) } finally {c.disconnect()}
 }
}
