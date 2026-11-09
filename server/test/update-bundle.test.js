import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parsePackageBadging, createMetadata, UPDATE_APK_URL} from '../scripts/stage-tv-update.mjs';

test('stable signed APK metadata contains fixed URL, digest, size and ascending version', () => {
  const apk = Buffer.from('test apk bytes');
  const m = createMetadata(apk, 4, '1.0.0');
  assert.equal(m.apkUrl, UPDATE_APK_URL);
  assert.equal(m.versionCode, 4);
  assert.equal(m.sizeBytes, apk.length);
  assert.equal(m.sha256, createHash('sha256').update(apk).digest('hex'));
});

test('reject empty, oversized and nonstable release metadata', () => {
  assert.throws(() => createMetadata(Buffer.alloc(0), 4, '1.0.0'));
  assert.throws(() => createMetadata(Buffer.alloc(26 * 1024 * 1024), 4, '1.0.0'));
  assert.throws(() => createMetadata(Buffer.from('x'), 4, '0.3.0-test'));
  assert.throws(() => createMetadata(Buffer.from('x'), -1, '1.0.0'));
});

test('only Seslen APKs with stable version can enter update channel', () => {
  assert.deepEqual(
    parsePackageBadging("package: name='site.serula.seslen' versionCode='8' versionName='1.2.3'\n"),
    {versionCode: 8, versionName: '1.2.3'}
  );
  assert.throws(() => parsePackageBadging("package: name='other.app' versionCode='8' versionName='1.2.3'"));
  assert.throws(() => parsePackageBadging("package: name='site.serula.seslen' versionCode='8' versionName='1.2.3-test'"));
});
