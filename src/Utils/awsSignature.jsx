export function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256(message) {
  const data = typeof message === 'string'
    ? new TextEncoder().encode(message)
    : message
  return crypto.subtle.digest('SHA-256', data)
}

async function hmacSha256(key, message) {
  const keyMaterial = key instanceof ArrayBuffer || ArrayBuffer.isView(key)
    ? key
    : new TextEncoder().encode(key)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const msg = typeof message === 'string'
    ? new TextEncoder().encode(message)
    : message
  return crypto.subtle.sign('HMAC', cryptoKey, msg)
}

async function getSigningKey(secret, date, region, service) {
  const kSecret  = new TextEncoder().encode('AWS4' + secret)
  const kDate    = await hmacSha256(kSecret, date)
  const kRegion  = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, service)
  return hmacSha256(kService, 'aws4_request')
}

function awsEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, c =>
    '%' + c.charCodeAt(0).toString(16).toUpperCase()
  )
}

export async function buildTranscribeUrl({ region, accessKeyId, secretAccessKey }) {
  const host    = `transcribestreaming.${region}.amazonaws.com:8443`
  const path    = '/stream-transcription-websocket'
  const service = 'transcribe'

  const now       = new Date()
  const amzDate   = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const dateStamp = amzDate.slice(0, 8)

  const credential = `${accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`

  const params = {
    'X-Amz-Algorithm':         'AWS4-HMAC-SHA256',
    'X-Amz-Credential':        credential,
    'X-Amz-Date':              amzDate,
    'X-Amz-Expires':           '60',
    'X-Amz-SignedHeaders':     'host',
    'language-code':           'en-US',
    'media-encoding':          'pcm',
    'sample-rate': '16000',
  }

  const queryString = Object.keys(params)
    .sort()
    .map(k => `${awsEncode(k)}=${awsEncode(params[k])}`)
    .join('&')

  // IMPORTANT: canonical request must have exactly this structure
  // each section separated by \n
  // canonical headers section ends with \n
  // then an empty string (which becomes another \n when joined)
  // then signed headers
  const canonicalRequest = [
    'GET',               // method
    path,                // path
    queryString,         // query string
    `host:${host}`,      // canonical header
    '',                  // blank line after headers — REQUIRED
    'host',              // signed headers
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' // empty body hash
  ].join('\n')

  console.log('[Sig4] canonical request:\n' + canonicalRequest)

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const hashedCanonical = toHex(await sha256(canonicalRequest))

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hashedCanonical,
  ].join('\n')

  console.log('[Sig4] string to sign:\n' + stringToSign)

  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service)
  const signature  = toHex(await hmacSha256(signingKey, stringToSign))

  const finalUrl = `wss://${host}${path}?${queryString}&X-Amz-Signature=${signature}`
  console.log('[Sig4] final URL:\n' + finalUrl)

  return finalUrl
}