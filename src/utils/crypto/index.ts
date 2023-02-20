import { createCipheriv, randomBytes, scrypt, createDecipheriv } from 'crypto';
import { promisify } from 'util';
import { authSecret } from '../../../config';

// 加密
export async function addLock(password: string) {
  const iv = randomBytes(16);
  const key = (await promisify(scrypt)(password, 'salt', 32)) as Buffer;
  const cipher = createCipheriv('aes-256-ctr', key, iv);
  return {
    pwd: Buffer.concat([
      cipher.update(authSecret.encryptedPwdKey),
      cipher.final(),
    ]),
    key,
  };
}

// 解密
export function loseLock(lockedPassword: Buffer, key: any) {
  const iv = randomBytes(16);
  const decipher = createDecipheriv('aes-256-ctr', key, iv);
  console.log(decipher.update);
  return Buffer.concat([decipher.update(lockedPassword), decipher.final()]);
}
