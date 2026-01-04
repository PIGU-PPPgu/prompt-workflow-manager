import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * 获取加密密钥（从环境变量或生成默认密钥）
 */
function getEncryptionKey(): Buffer {
  const keyFromEnv = process.env.ENCRYPTION_KEY;
  if (keyFromEnv && keyFromEnv.length === 64) {
    return Buffer.from(keyFromEnv, 'hex');
  }
  // 开发环境使用固定密钥（生产环境必须设置 ENCRYPTION_KEY）
  console.warn('[Crypto] ENCRYPTION_KEY not set, using default key (NOT SECURE FOR PRODUCTION)');
  return crypto.createHash('sha256').update('teachpt-default-key-change-in-production').digest();
}

const encryptionKey = getEncryptionKey();

/**
 * 加密敏感数据
 * @param plainText 明文
 * @returns 加密后的字符串（格式：iv:authTag:encrypted，均为hex）
 */
export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // 返回格式：iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * 解密数据
 * @param encryptedData 加密后的字符串
 * @returns 解密后的明文，解密失败返回 null
 */
export function decrypt(encryptedData: string): string | null {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      // 可能是未加密的旧数据，直接返回
      return encryptedData;
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error);
    // 可能是未加密的旧数据，直接返回原始值
    return encryptedData;
  }
}

/**
 * 检查数据是否已加密
 */
export function isEncrypted(data: string): boolean {
  const parts = data.split(':');
  return parts.length === 3 &&
         parts[0].length === IV_LENGTH * 2 &&
         parts[1].length === AUTH_TAG_LENGTH * 2;
}
