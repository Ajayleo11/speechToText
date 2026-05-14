import { useState, useRef, useCallback } from 'react';
import { maskWords } from './Utils/badWords';
import './App.css';
import Waveform from './waveform';
import { useTranscribe } from './hooks/useTranscribe';


export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
const [region, setRegion] = useState('us-east-1')
const [accessKeyId, setAccessKeyId] = useState('')
const [secretAccessKey, setSecretAccessKey] = useState('')
const [customWords, setCustomWords] = useState('');
const [text, setText] = useState('');
const [interim, setInterim] = useState('')
const [status, setStatus] = useState('idle');
const [error, setError] = useState('');
const [copied, setCopied] = useState(false);



const textareaRef = useRef(null)
const maskTimerRef = useRef(null)

const getCustomWordList = () =>
  customWords.split(',').map(w => w.trim()).filter(Boolean)

const scheduleMask = useCallback((raw) => {
  clearTimeout(maskTimerRef.current)
  maskTimerRef.current = setTimeout(() => {
    const masked = maskWords(raw, getCustomWordList())
    if (masked !== raw) setText(masked)
  }, 350)
}, [customWords])

const handleTextChange = (e) => {
  const val = e.target.value
  setText(val)
  scheduleMask(val)
}


const onPartial = useCallback((t) => {
  setInterim(maskWords(t, getCustomWordList()))
}, [customWords])

const onFinal = useCallback((t) => {
  const masked = maskWords(t, getCustomWordList())
  setText(prev => prev ? prev + ' ' + masked : masked)
  setInterim('')
  setTimeout(() => {
    if (textareaRef.current)
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight
  }, 0)
}, [customWords])

const onError = useCallback((msg) => {
  setError(msg)
  setIsRecording(false)
  setStatus('idle')
}, [])

const onStatusChange = useCallback((s) => {
  setStatus(s)
  if (s === 'listening') setError('')
  if (s === 'idle') setIsRecording(false)
}, [])

const { start, stop } = useTranscribe({
  onPartial, onFinal, onError, onStatusChange
})


const handleRecord = () => {
  if (isRecording) {
    stop()
    setIsRecording(false)
    setInterim('')
  } else {
    setError('')
    setIsRecording(true)
    start({ region, accessKeyId, secretAccessKey })
  }
}

const handleCopy = () => {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  })
}

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
        <div className="card-footer">
  <div className="status-row">
    <span className={`status-pill status-${status}`}>
      <span className="status-dot" />
      {{ idle: 'Ready', connecting: 'Connecting…', listening: 'Listening' }[status]}
    </span>
    {error && <span className="error-msg">{error}</span>}
  </div>
  <div className="actions">
    <span className="char-count">{text.length} chars</span>
    <button
      className="action-btn"
      onClick={() => { setText(''); setInterim('') }}
    >
      Clear
    </button>
    <button className="action-btn accent" onClick={handleCopy}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  </div>
</div>
  <textarea
  ref={textareaRef}
  value={text}
  onChange={handleTextChange}
    placeholder="Click 'Start Recording' to transcribe speech, or type directly…"
    rows={10}
  />


  {interim && (
  <div className="interim-overlay" aria-live="polite">
    {interim}
  </div>
)}

</div>
          <span className="field-label">Description</span>
          <button
            className={`record-btn ${isRecording ? 'recording' : ''}`}
            onClick={handleRecord}
          >
            <span className={`rec-dot ${isRecording ? 'pulse' : ''}`} />
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
        </div>
      </main>
      <footer className="page-footer">
  Profanity masking · Amazon Transcribe Streaming
</footer>
    </div>
  )
}