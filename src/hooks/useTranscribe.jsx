import { useRef, useCallback } from 'react';
import { buildTranscribeUrl } from '../Utils/awsSignature'
import { encodeAudioChunk, decodeMessage } from '../Utils/eventStream'

export function useTranscribe({ onPartial, onFinal, onError, onStatusChange }) {
  const wsRef           = useRef(null)
  const audioContextRef = useRef(null)
  const mediaStreamRef  = useRef(null)
  const processorRef    = useRef(null)
  const activeRef       = useRef(false)

  const stop = useCallback(() => {
    activeRef.current = false

    // close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // stop audio processor
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    // close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // stop microphone tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }

    onStatusChange('idle')
  }, [onStatusChange])

  const start = useCallback(async ({ region, accessKeyId, secretAccessKey }) => {
    if (!region || !accessKeyId || !secretAccessKey) {
      onError('AWS credentials required — open ⚙ Settings')
      return
    }

    onStatusChange('connecting')

    // 1. request microphone
    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount:    1,
          sampleRate:      16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })
    } catch {
      onError('Microphone access denied')
      onStatusChange('idle')
      return
    }

    // 2. build signed WebSocket URL
    // build signed WebSocket URL
let url
try {
  url = await buildTranscribeUrl({ region, accessKeyId, secretAccessKey })
} catch (err) {
  onError('Failed to sign URL: ' + err.message)
  onStatusChange('idle')
  return
}



    // 3. open WebSocket connection
    const ws = new WebSocket(url)
    wsRef.current = ws
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      console.log('[WebSocket] connection opened')
      activeRef.current = true
      onStatusChange('listening')

      // 4. set up audio pipeline
      audioContextRef.current = new AudioContext({ sampleRate: 16000 })
      const source = audioContextRef.current.createMediaStreamSource(
        mediaStreamRef.current
      )
      processorRef.current = audioContextRef.current.createScriptProcessor(
        4096, 1, 1
      )

      // 5. on each audio chunk, encode and send over WebSocket
      processorRef.current.onaudioprocess = async (e) => {
        if (!activeRef.current || ws.readyState !== WebSocket.OPEN) return

        const float32 = e.inputBuffer.getChannelData(0)

        // convert float32 → int16 PCM
        const int16 = new Int16Array(float32.length)
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768))
        }

        // encode into Transcribe binary frame and send
        const frame = await encodeAudioChunk(int16.buffer)
        ws.send(frame)
      }

      source.connect(processorRef.current)
      processorRef.current.connect(audioContextRef.current.destination)
    }

    // 6. handle incoming transcript messages
    ws.onmessage = (event) => {
      const msg = decodeMessage(event.data)
      if (!msg) return

      console.log('[WebSocket] message received', msg)

      const results = msg?.Transcript?.Results
      if (!results?.length) return

      const result     = results[0]
      const transcript = result?.Alternatives?.[0]?.Transcript || ''

      if (result.IsPartial) {
        onPartial(transcript)
      } else {
        onFinal(transcript)
      }
    }

    ws.onerror = (e) => {
      console.error('[WebSocket] error', e)
      onError('WebSocket error — check credentials and region')
      stop()
    }

    ws.onclose = (e) => {
  console.log('[WS] closed — code:', e.code, '— reason:', e.reason, '— wasClean:', e.wasClean)
      if (activeRef.current) {
        onError(`Connection closed (${e.code})`)
        stop()
      }
    }

  }, [onPartial, onFinal, onError, onStatusChange, stop])

  return { start, stop }
}