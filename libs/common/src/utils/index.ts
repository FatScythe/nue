import { createHash, createHmac } from 'crypto';
import { Request } from 'express';
import { customAlphabet } from 'nanoid';
export class MoneyTransformer {
  private static readonly SCALE = 100n;

  // convert DB BigInt to human string: 5000n -> "50.00"
  static toDecimalString(minorAmount: bigint): string {
    const major = minorAmount / this.SCALE;
    const minor = minorAmount % this.SCALE;
    // padStart ensures 5005n becomes "50.05" and not "50.5"
    return `${major}.${minor.toString().padStart(2, '0')}`;
  }

  // convert human input to DB BigInt: "50.00" -> 5000n
  static toMinorUnit(amount: number | string): bigint {
    return BigInt(Math.round(Number(amount) * 100));
  }
}

export const containsSpecialChars = (str) => {
  const re = /[ `!@#$%^&*()+\=\[\]{};':"\\|,.<>\/?~]/;

  return re.test(str);
};

export const randomNumberNano = (length = 11) => {
  const alphabet = '1234567890';
  const nanoid = customAlphabet(alphabet, length);
  return nanoid();
};

export const generateSecretKey = (prefix = 'nsk_') => {
  const entropy = customAlphabet('abcdef0123456789', 32)();

  return `${prefix}${entropy}${randomNumberNano(4)}`;
};

export const getRandomNumberBetween = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const generate256Hmac = (value: string, secret: string) => {
  return createHmac('sha256', secret).update(value).digest('hex');
};

export const generateSha512 = (value: string) => {
  return createHash('sha512').update(value, 'utf-8').digest('hex');
};

export const isObject = <T = Record<string, any>>(
  variable: any,
): variable is T => {
  if (!variable) return false;

  return Object.prototype.toString.call(variable) === '[object Object]';
};

export const isString = (variable: any): variable is string => {
  if (!variable) return false;

  return Object.prototype.toString.call(variable) === '[object String]';
};

export const isXML = (str) => /^\s*<[\s\S]*>/.test(str);

/**
 * Clean up internal SQL fields and ensure 'id' is consistent
 */
export function transformObject(data: any): any {
  if (!isObject(data) || data instanceof Date) {
    return data;
  }

  const forbiddenKeys = [
    'secretKey',
    'otpKey',
    'password',
    'deletedAt',
    'processor',
  ];

  const cleanData: object = Array.isArray(data) ? [] : {};

  if (Array.isArray(data)) {
    return data.map((item) => transformObject(item));
  }

  for (const key in data) {
    if (forbiddenKeys.includes(key)) continue;

    const value = data[key];

    if (isObject(value) && !(value instanceof Date)) {
      cleanData[key] = transformObject(value);
    } else {
      cleanData[key] = value;
    }
  }

  return cleanData;
}

export const formatReponse = (data: any) => {
  if (!data) return null;
  return transformObject(data);
};

export const isDefined = <T = any>(variable: any): variable is T => {
  if (
    variable !== 'null' &&
    variable !== 'undefined' &&
    variable !== undefined &&
    variable !== null &&
    variable !== false
  ) {
    // variable is defined and its value is not falsy, this will include 0
    return true;
  }

  return false;
};

export const isNumber = (str: any) => {
  if (!isDefined(str)) return false;

  return !isNaN(parseFloat(str)) && !isNaN(str - 0);
};

export const isBoolean = (val) => {
  return (
    val === false ||
    val === 'false' ||
    val === 'true' ||
    val === true ||
    val instanceof Boolean ||
    typeof val === 'boolean'
  );
};

export const sanitizeRequestUrl = (req: Request) => {
  const url = new URL('https://./');
  url.hostname = req.hostname;
  url.pathname =
    req.baseUrl + (req.path === '/' ? '' : req.path) ||
    req.originalUrl ||
    req.url;

  url.protocol = req.protocol;

  url.search = new URLSearchParams(req.query as any) as any;

  return url.href.replace(/(password=).*?(&|$)/gi, '$1<hidden>$2');
};

//depreciated  MD5, SHA1, PKCS
export const generateRequestId = (str: string) =>
  createHash('MD5').update(str).digest('hex');

export const getIp = (req) => {
  // trust proxy sets ip to the remote client (not to the ip of the last reverse proxy server)

  let ip =
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for']?.split(',').shift()?.trim() ||
    req.socket?.remoteAddress ||
    req.ip;

  if (ip.substring(0, 7) == '::ffff:') {
    // fix for if you have both ipv4 and ipv6
    ip = ip.substring(7);
  }

  return ip;
};

export const numberWithComma = (amount: number) => {
  return Number(amount).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
  });
};

export const stripPhoneCountryCode = (phone: string): string => {
  if (phone) {
    // +234XXXXXXXXX -> 234XXXXXXXXX
    phone = phone.replace(/\D/g, '');

    if (phone.startsWith('234')) {
      //  234XXXXXXXXX -> 0XXXXXXXXX
      phone = '0' + phone.substring(3);
    }
  }

  return phone;
};
