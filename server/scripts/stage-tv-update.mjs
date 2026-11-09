import {createHash} from 'node:crypto';
import {copyFile, mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

export const UPDATE_APK_URL = 'https://seslen.serula.site/updates/Seslen.apk';
const OUTPUT_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), '../../iphone/updates');
const MAX_APK = 25 * 1024 * 1024;

export function parsePackageBadging(text) {
  const match = text.match(/^package:\s+name='([^']+)'\s+versionCode='([0-9]+)'\s+versionName='([^']+)'/m);
  if (!match || match[1] !== 'site.serula.seslen') throw Error('Unexpected APK package');
  const versionCode = Number(match[2]);
  const versionName = match[3];
  if (!Number.isSafeInteger(versionCode) || versionCode <= 0 ||
      !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(versionName)) {
    throw Error('Only stable, monotonic Android versions can be published');
  }
  return {versionCode, versionName};
}

export function createMetadata(apk, versionCode, versionName) {
  if (!Buffer.isBuffer(apk) || apk.length === 0 || apk.length > MAX_APK) {
    throw Error('Invalid APK size');
  }
  if (!Number.isSafeInteger(versionCode) || versionCode <= 0 ||
      !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(versionName)) {
    throw Error('Invalid stable version');
  }
  return {
    versionCode,
    versionName,
    apkUrl: UPDATE_APK_URL,
    sha256: createHash('sha256').update(apk).digest('hex'),
    sizeBytes: apk.length
  };
}

async function main(apkPath) {
  if (!apkPath) throw Error('Usage: node stage-tv-update.mjs /absolute/path/to/signed.apk');
  const aapt = resolve(process.env.ANDROID_HOME || '', 'build-tools/35.0.0/aapt');
  const badging = execFileSync(aapt, ['dump', 'badging', apkPath], {encoding: 'utf8'});
  const {versionCode, versionName} = parsePackageBadging(badging);
  const source = resolve(apkPath);
  const bytes = await readFile(source);
  const metadata = createMetadata(bytes, versionCode, versionName);
  await mkdir(OUTPUT_DIRECTORY, {recursive: true});
  // Publish APK before manifest: clients never see a new manifest pointing to absent bytes.
  await copyFile(source, resolve(OUTPUT_DIRECTORY, 'Seslen.apk'));
  await writeFile(resolve(OUTPUT_DIRECTORY, 'stable.json'), JSON.stringify(metadata, null, 2) + '\n');
  const onDisk = await stat(resolve(OUTPUT_DIRECTORY, 'Seslen.apk'));
  if (onDisk.size !== metadata.sizeBytes) throw Error('Staged APK size changed');
  process.stdout.write('Staged approved TV update ' + versionName + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv[2]).catch(error => {console.error(error.message); process.exitCode = 1});
}
