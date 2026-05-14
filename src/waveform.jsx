import { useEffect, useRef } from 'react'

export default function Waveform({ active }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function drawIdle() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const bars = 28
      const barW = 3
      const gap = (canvas.width - bars * barW) / (bars + 1)
      for (let i = 0; i < bars; i++) {
        const x = gap + i * (barW + gap)
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.beginPath()
        ctx.roundRect(x, (canvas.height - 3) / 2, barW, 3, 2)
        ctx.fill()
      }
    }

    drawIdle()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={44}
      style={{ display: 'block', width: '100%', height: '44px', borderRadius: '6px' }}
      aria-hidden="true"
    />
  )
}