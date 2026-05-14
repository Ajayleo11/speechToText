import { useState } from 'react';
import './App.css';
import Waveform from './waveform';


export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
const [region, setRegion] = useState('us-east-1')
const [accessKeyId, setAccessKeyId] = useState('')
const [secretAccessKey, setSecretAccessKey] = useState('')
const [customWords, setCustomWords] = useState('')

  return (
    <div className="layout">
      <header className="header">
        <button
  className={`settings-btn ${settingsOpen ? 'active' : ''}`}
  onClick={() => setSettingsOpen(o => !o)}
>
  Settings
</button>
        <div className="logo">
          <span className="logo-mark">VS</span>
          <div>
            <h1>Speech to Text</h1>
            <p className="tagline">speech to text · privacy first</p>
          </div>
        </div>
      </header>
{settingsOpen && (
  <div className="settings-panel">
    <div className="settings-grid">
      <label className="field">
        <span className="field-label">AWS Region</span>
        <input value={region} onChange={e => setRegion(e.target.value)} placeholder="us-east-1" />
      </label>
      <label className="field">
        <span className="field-label">Access Key ID</span>
        <input value={accessKeyId} onChange={e => setAccessKeyId(e.target.value)} placeholder="AKIAIOSFODNN7EXAMPLE" />
      </label>
      <label className="field">
        <span className="field-label">Secret Access Key</span>
        <input type="password" value={secretAccessKey} onChange={e => setSecretAccessKey(e.target.value)} placeholder="••••••••••••••••" />
      </label>
      <label className="field">
        <span className="field-label">Extra words to mask (comma-separated)</span>
        <input value={customWords} onChange={e => setCustomWords(e.target.value)} placeholder="badword, anotherword" />
      </label>
    </div>
    <p className="settings-note">Credentials stay client-side only. For production use IAM roles or Cognito.</p>
  </div>
)}
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