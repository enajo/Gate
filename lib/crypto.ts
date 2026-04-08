import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionSecret(): string {
  const secret =
    process.env.ENCRYPTION_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error(
      "Missing encryption secret. Set ENCRYPTION_SECRET, AUTH_SECRET, or NEXTAUTH_SECRET.",
    );
  }

  return secret;
}

function getEncryptionKey(): Buffer {
  return createHash("sha256").update(getEncryptionSecret()).digest();
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashAccessCode(code: string): string {
  return sha256(code.trim());
}

export function verifyAccessCode(
  inputCode: string,
  storedHash: string,
): boolean {
  const inputHash = Buffer.from(hashAccessCode(inputCode), "hex");
  const savedHash = Buffer.from(storedHash, "hex");

  if (inputHash.length !== savedHash.length) {
    return false;
  }

  return timingSafeEqual(inputHash, savedHash);
}

export function generateRandomToken(size = 32): string {
  return randomBytes(size).toString("hex");
}

export function encryptText(plainText: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptText(payload: string): string {
  const buffer = Buffer.from(payload, "base64");

  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    iv,
  );

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}