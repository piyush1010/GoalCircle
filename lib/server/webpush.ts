import crypto from 'node:crypto'

/**
 * Minimal Web Push sender (RFC 8291 message encryption + RFC 8292 VAPID), using only Node's
 * crypto module so the app needs no extra package.
 */

export interface PushTarget { endpoint: string; p256dh: string; auth: string }

const b64u = {
  encode: (data: Buffer) => data.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  decode: (text: string) => Buffer.from(text.replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
}

const hmac = (key: Buffer, data: Buffer) => crypto.createHmac('sha256', key).update(data).digest()

/** Encrypt a payload for one browser subscription (aes128gcm content coding). */
export function encryptPayload(payload: Buffer, target: Pick<PushTarget, 'p256dh' | 'auth'>, salt = crypto.randomBytes(16)) {
  const uaPublic = b64u.decode(target.p256dh)
  const authSecret = b64u.decode(target.auth)
  const ecdh = crypto.createECDH('prime256v1')
  const asPublic = ecdh.generateKeys()
  const shared = ecdh.computeSecret(uaPublic)

  const prkKey = hmac(authSecret, shared)
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic])
  const ikm = hmac(prkKey, Buffer.concat([keyInfo, Buffer.from([1])])).subarray(0, 32)
  const prk = hmac(salt, ikm)
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01', 'binary')).subarray(0, 16)
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01', 'binary')).subarray(0, 12)

  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce)
  const body = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()])
  const header = Buffer.alloc(21)
  salt.copy(header, 0)
  header.writeUInt32BE(4096, 16)
  header.writeUInt8(asPublic.length, 20)
  return Buffer.concat([header, asPublic, body])
}

/** Signed VAPID header that proves the push comes from this app. */
export function vapidAuthorization(endpoint: string, publicKey: string, privateKey: string, subject: string) {
  const pub = b64u.decode(publicKey)
  const key = crypto.createPrivateKey({
    format: 'jwk',
    key: { kty: 'EC', crv: 'P-256', d: privateKey, x: b64u.encode(pub.subarray(1, 33)), y: b64u.encode(pub.subarray(33, 65)) },
  })
  const header = b64u.encode(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64u.encode(Buffer.from(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })))
  const signature = crypto.sign('sha256', Buffer.from(`${header}.${claims}`), { key, dsaEncoding: 'ieee-p1363' })
  return `vapid t=${header}.${claims}.${b64u.encode(signature)}, k=${publicKey}`
}

/** Send one push. Returns the push service's HTTP status (404/410 mean the address is gone). */
export async function sendPush(target: PushTarget, payload: object, keys: { publicKey: string; privateKey: string; subject: string }) {
  const response = await fetch(target.endpoint, {
    method: 'POST',
    headers: {
      Authorization: vapidAuthorization(target.endpoint, keys.publicKey, keys.privateKey, keys.subject),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'high',
    },
    body: new Uint8Array(encryptPayload(Buffer.from(JSON.stringify(payload)), target)),
  })
  return response.status
}

export const base64url = b64u
