import { useState, useRef, useCallback } from 'react';
import { maskWords } from './Utils/badWords';
import './App.css';
import Waveform from './waveform';
import { useTranscribeSDK } from './hooks/useTranscribeSDK';
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
const [useSDK, setUseSDK] = useState(false)




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


const wsHook  = useTranscribe({
  onPartial, onFinal, onError, onStatusChange
})
const sdkHook = useTranscribeSDK({
  onPartial, onFinal, onError, onStatusChange
})


// pick the active hook based on toggle
const { start, stop } = useSDK ? sdkHook : wsHook


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


const handleSave = () => {
  const data = {
    description: text,
    savedAt: new Date().toISOString(),
    mode: useSDK ? 'AWS SDK' : 'Raw WebSocket',
  }
  console.log('Saved', data)

  // download as a .json file
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = `voicescript-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
console.log(region, "region", 'error', error)

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
          <span className="logo-mark">ST</span>
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
        <input value={accessKeyId} onChange={e => setAccessKeyId(e.target.value)} placeholder="Enter access key" />
      </label>
      <label className="field">
        <span className="field-label">Secret Access Key</span>
        <input type="password" value={secretAccessKey} onChange={e => setSecretAccessKey(e.target.value)} placeholder="Enter secret access key" />
      </label>
      <label className="field">
        <span className="field-label">Extra words to mask (comma-separated)</span>
        <input value={customWords} onChange={e => setCustomWords(e.target.value)} placeholder="badword, anotherword" />
      </label>
    </div>
  </div>
)}
      <main className="card">
  {/* Toggle at the very top */}
  <div className="toggle-row">
    <span className="toggle-label">Raw WebSocket</span>
    <button
      className={`toggle-btn ${useSDK ? 'sdk' : 'ws'}`}
      onClick={() => setUseSDK(o => !o)}
    >
      <span className="toggle-thumb" />
    </button>
    <span className="toggle-label">AWS SDK</span>
    <span className={`toggle-badge ${useSDK ? 'sdk' : 'ws'}`}>
      {useSDK ? 'AWS SDK' : 'Raw WebSocket'}
    </span>
  </div>

  {/* Description label inline with textarea */}
  <div className="card-topbar">
    <button
      className={`record-btn ${isRecording ? 'recording' : ''}`}
      onClick={handleRecord}
    >
      <span className={`rec-dot ${isRecording ? 'pulse' : ''}`} />
      {isRecording ? 'Stop Recording' : 'Start Recording'}
    </button>
  </div>

  <div className="waveform-row">
    <Waveform active={isRecording} />
  </div>

  <div className="textarea-wrap">
    <div className="textarea-label-row">
      <span className="field-label">Description</span>
    </div>
    <textarea
      ref={textareaRef}
      className={interim ? 'has-interim' : ''}
      value={text}
      onChange={handleTextChange}
      placeholder="Click 'Start Recording' to transcribe speech, or type directly…"
      rows={10}
    />
    {interim && (
      <div className="interim-overlay" aria-live="polite">
        {interim}▋
      </div>
    )}
  </div>

  <div className="card-footer">
    <div className="status-row">
      <span className={`status-pill status-${status}`}>
        <span className="status-dot" />
        {{ idle: 'Ready', connecting: 'Connecting…', listening: 'Listening' }[status]}
          <span className="mode-tag">{useSDK ? 'SDK' : 'WS'}</span>
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

  {/* Save button at the bottom */}
  <div className="save-row">
    <button className="save-btn" onClick={handleSave}>
      Save
    </button>
  </div>
</main>
      <footer className="page-footer">
  Profanity masking · Amazon Transcribe Streaming
</footer>
    </div>
  )
}