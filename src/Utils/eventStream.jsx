// converts float32 audio to int16 PCM
export function float32ToInt16(float32) {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768))
  }
  return int16
}

// compute CRC32 checksum required by Transcribe event-stream protocol
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c
  }
  return table
})()

function crc32(data) {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

// encode a header value into event-stream binary format
function encodeHeader(name, value) {
  const nameBytes  = new TextEncoder().encode(name)
  const valueBytes = new TextEncoder().encode(value)
  // 1 byte name length + name + 1 byte type (7=string) + 2 bytes value length + value
  const buf    = new Uint8Array(1 + nameBytes.length + 1 + 2 + valueBytes.length)
  let offset   = 0
  buf[offset++] = nameBytes.length
  buf.set(nameBytes, offset); offset += nameBytes.length
  buf[offset++] = 7
  buf[offset++] = (valueBytes.length >> 8) & 0xff
  buf[offset++] = valueBytes.length & 0xff
  buf.set(valueBytes, offset)
  return buf
}

// encode a PCM audio chunk into Transcribe event-stream binary frame
export function encodeAudioChunk(pcmBuffer) {
  const h1 = encodeHeader(':content-type', 'application/octet-stream')
  const h2 = encodeHeader(':event-type', 'AudioEvent')
  const h3 = encodeHeader(':message-type', 'event')

  const headersLen  = h1.length + h2.length + h3.length
  const payloadLen  = pcmBuffer.byteLength
  const totalLen    = 4 + 4 + 4 + headersLen + payloadLen + 4

  const buf  = new ArrayBuffer(totalLen)
  const view = new DataView(buf)
  const bytes = new Uint8Array(buf)

  // write prelude
  view.setUint32(0, totalLen)
  view.setUint32(4, headersLen)

  // prelude CRC (covers first 8 bytes)
  const preludeCrc = crc32(new Uint8Array(buf, 0, 8))
  view.setUint32(8, preludeCrc)

  // write headers
  let offset = 12
  bytes.set(h1, offset); offset += h1.length
  bytes.set(h2, offset); offset += h2.length
  bytes.set(h3, offset); offset += h3.length

  // write payload
  bytes.set(new Uint8Array(pcmBuffer), offset)
  offset += payloadLen

  // message CRC (covers everything except last 4 bytes)
  const msgCrc = crc32(new Uint8Array(buf, 0, offset))
  view.setUint32(offset, msgCrc)

  return buf
}

// decode a binary event-stream message from Transcribe
export function decodeMessage(data) {
  try {
    const view       = new DataView(data)
    const totalLen   = view.getUint32(0)
    const headerLen  = view.getUint32(4)
    const preludeEnd = 12 + headerLen
    const payload    = new Uint8Array(data, preludeEnd, totalLen - preludeEnd - 4)
    return JSON.parse(new TextDecoder().decode(payload))
  } catch {
    return null
  }
}