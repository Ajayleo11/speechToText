import { useRef, useCallback } from 'react'
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand
} from '@aws-sdk/client-transcribe-streaming'

export function useTranscribe({ onPartial, onFinal, onError, onStatusChange }) {
  const clientRef = useRef(null)
  const audioContextRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const processorRef = useRef(null)
  const activeRef = useRef(false)

  const stop = useCallback(() => {
    activeRef.current = false
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop())
      mediaStreamRef.current = null
    }
    clientRef.current = null
    onStatusChange('idle')
  }, [onStatusChange])

  const start = useCallback(async ({ region, accessKeyId, secretAccessKey }) => {
    if (!region || !accessKeyId || !secretAccessKey) {
      onError('AWS credentials are required. Open ⚙ Settings.')
      return
    }

    onStatusChange('connecting')

    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true }
      })
    } catch {
      onError('Microphone access denied.')
      onStatusChange('idle')
      return
    }

    audioContextRef.current = new AudioContext({ sampleRate: 16000 })
    const source = audioContextRef.current.createMediaStreamSource(
      mediaStreamRef.current
    )
    processorRef.current = audioContextRef.current.createScriptProcessor(
      4096, 1, 1
    )

    const audioQueue = []

    processorRef.current.onaudioprocess = (e) => {
      if (!activeRef.current) return
      const float32 = e.inputBuffer.getChannelData(0)
      const int16 = new Int16Array(float32.length)
      for (let i = 0; i < float32.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768))
      }
      audioQueue.push(new Uint8Array(int16.buffer))
    }

    source.connect(processorRef.current)
    processorRef.current.connect(audioContextRef.current.destination)

    async function* audioGenerator() {
      while (activeRef.current) {
        if (audioQueue.length > 0) {
          const chunk = audioQueue.shift()
          yield { AudioEvent: { AudioChunk: chunk } }
        } else {
          await new Promise(r => setTimeout(r, 10))
        }
      }
    }

    clientRef.current = new TranscribeStreamingClient({
      region,
      credentials: { accessKeyId, secretAccessKey }
    })

    const command = new StartStreamTranscriptionCommand({
      LanguageCode: 'en-US',
      MediaEncoding: 'pcm',
      MediaSampleRateHertz: 16000,
      AudioStream: audioGenerator()
    })

    activeRef.current = true
    onStatusChange('listening')

    try {
      const response = await clientRef.current.send(command)
      for await (const event of response.TranscriptResultStream) {
        if (!activeRef.current) break
        const results = event?.TranscriptEvent?.Transcript?.Results
        if (!results?.length) continue
        const result = results[0]
        const transcript = result?.Alternatives?.[0]?.Transcript || ''
        if (result.IsPartial) {
          onPartial(transcript)
        } else {
          onFinal(transcript)
        }
      }
    } catch (err) {
      if (activeRef.current) {
        onError(err.message || 'Transcription error')
      }
    } finally {
      stop()
    }
  }, [onPartial, onFinal, onError, onStatusChange, stop])

  return { start, stop }
}