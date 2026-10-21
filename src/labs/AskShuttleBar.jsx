import { useState } from 'react'
function AskShuttleBar({ scope, questions, onAsk, busy }) {
  const [text, setText] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!text.trim() || busy) return
    onAsk(text)
    setText('')
  }
  return (
    <section className="askbar" aria-label={`Ask BCD AI about ${scope}`}>
      <div className="askbar-head">
        <span className="shuttle-pill" aria-hidden />
        <div>
          <strong>Ask BCD AI about {scope}</strong>
          <span className="mono-label">Answers use the filters above</span>
        </div>
      </div>
      <div className="askbar-chips">
        {questions.map((q) => (
          <button key={q} type="button" onClick={() => onAsk(q)} disabled={busy}>
            {q}
          </button>
        ))}
        <form className="askbar-form" onSubmit={submit}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={busy ? 'BCD AI is answering\u2026' : `Ask your own question about ${scope}\u2026`}
            aria-label={`Ask BCD AI about ${scope}`}
          />
          <button type="submit" disabled={busy || !text.trim()} aria-label="Ask BCD AI">
            →
          </button>
        </form>
      </div>
    </section>
  )
}
export { AskShuttleBar }
