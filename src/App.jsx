import { useState } from 'react';
import './App.css';
import Waveform from './waveform';


export default function App() {
  const [isRecording, setIsRecording] = useState(false)

  return (
    <div className="layout">
      <header className="header">
        <div className="logo">
          <span className="logo-mark">VS</span>
          <div>
            <h1>Speech to Text</h1>
            <p className="tagline">speech to text · privacy first</p>
          </div>
        </div>
      </header>

      <main className="card">
        <div className="waveform-row">
  <Waveform active={isRecording} />
</div>
        <div className="card-topbar">
          <div className="textarea-wrap">
  <textarea
    placeholder="Click 'Start Recording' to transcribe speech, or type directly…"
    rows={10}
  />
</div>
          <span className="field-label">Description</span>
          <button
            className={`record-btn ${isRecording ? 'recording' : ''}`}
            onClick={() => setIsRecording(o => !o)}
          >
            <span className={`rec-dot ${isRecording ? 'pulse' : ''}`} />
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
        </div>
      </main>
    </div>
  )
}