import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const PIN_HASH_KEY = 'moneymanager.pin.hash';
const PIN_SALT_KEY = 'moneymanager.pin.salt';
const CURRENCY_KEY = 'moneymanager.settings.currency';

/**
 * PIN security: only a salted SHA-256 hash is stored, never the PIN itself.
 * The salt is random per setup. Verification recomputes the hash.
 * There is intentionally no "recover PIN" path: forgetting the PIN means
 * choosing "Reset with data wipe" in Settings, which deletes all local
 * data. That trade-off keeps an offline PIN meaningful.
 */

async function randomSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function hasPin(): Promise<boolean> {
  const hash = await AsyncStorage.getItem(PIN_HASH_KEY);
  return hash !== null;
}

export async function setPin(pin: string): Promise<void> {
  const salt = await randomSalt();
  const hash = await hashPin(pin, salt);
  await AsyncStorage.multiSet([
    [PIN_SALT_KEY, salt],
    [PIN_HASH_KEY, hash],
  ]);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const [salt, hash] = await AsyncStorage.multiGet([PIN_SALT_KEY, PIN_HASH_KEY]);
  if (!salt[1] || !hash[1]) return false;
  const attempt = await hashPin(pin, salt[1]);
  return attempt === hash[1];
}

export async function clearPin(): Promise<void> {
  await AsyncStorage.multiRemove([PIN_SALT_KEY, PIN_HASH_KEY]);
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export async function getCurrencySymbol(): Promise<string> {
  return (await AsyncStorage.getItem(CURRENCY_KEY)) ?? 'Rs';
}

export async function setCurrencySymbol(symbol: string): Promise<void> {
  await AsyncStorage.setItem(CURRENCY_KEY, symbol);
}
