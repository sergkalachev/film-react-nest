import { webcrypto as crypto } from 'crypto';
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = crypto as unknown as Crypto;
}
