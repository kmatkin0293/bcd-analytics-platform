import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { answerFrameUrl, rebrand, stageLabel } from './spotter'
import { Icon } from './icons'

/** Spotter's markdown. react-markdown escapes raw HTML by default, so server text is safe to render. */
export function Markdown({ text, className }) {
  return <div className={['md', className].filter(Boolean).join(' ')}><ReactMarkdown remarkPlugins={[remarkGfm]}>{rebrand(text)}</ReactMarkdown></div>
}

function useElapsed(start, end) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (end) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [end])
  return Math.max(0, Math.round(((end ?? now) - start) / 1000))
}

function StepItem({ step, live }) {
  const [showOutput, setShowOutput] = useState(false)
  return (
    <li className={step.running ? 'sp-step is-running' : 'sp-step'}>
      <span className="sp-step-icon" aria-hidden>{step.running ? <span className="sp-dot" /> : <Icon name="check" size={13} strokeWidth={2.6} />}</span>
      <div className="sp-step-body">
        <span className="sp-step-title">{rebrand(step.title)}</span>
        {step.stages.length > 0 && (
          <span className="sp-stages">
            {step.stages.map((code, i) => (
              <span key={code} className={step.running && i === step.stages.length - 1 ? 'sp-stage is-current' : 'sp-stage'}>{stageLabel(code)}</span>
            ))}
          </span>
        )}
        {step.thinking && <Markdown text={step.thinking} className={live && step.running ? 'sp-thinking is-streaming' : 'sp-thinking'} />}
        {step.answer && <span className="sp-step-answer">Answer: <strong>{rebrand(step.answer.title ?? '')}</strong></span>}
        {step.outputs.length > 0 && (
          <>
            <button type="button" className="sp-output-toggle" onClick={() => setShowOutput((v) => !v)}>{showOutput ? 'Hide' : 'Show'} tool output</button>
            {showOutput && <pre className="sp-output">{rebrand(step.outputs.join('\n\n').slice(0, 4000))}</pre>}
          </>
        )}
      </div>
    </li>
  )
}

/** The interactive answer (chart or table). The SDK's frame renderer authenticates the frame once it is in the page. */
function AnswerCard({ answer }) {
  const [url, setUrl] = useState(null)
  useEffect(() => { answerFrameUrl(answer).then(setUrl) }, [answer])
  const title = rebrand(answer.title ?? 'BCD AI answer')
  return (
    <figure className="sp-answer">
      <figcaption>
        <span className="sp-answer-title">{title}</span>
        {answer.sage_query && <code className="sp-answer-query">{answer.sage_query}</code>}
      </figcaption>
      <div className="sp-answer-frame">{url && <iframe src={url} title={title} loading="lazy" />}</div>
    </figure>
  )
}

/** One question to BCD AI, rendered the way Spotter shows its work. */
export function SpotterTurn({ turn, onRetry }) {
  const live = turn.phase === 'starting' || turn.phase === 'working' || turn.phase === 'answering'
  const seconds = useElapsed(turn.startedAt, turn.endedAt)
  // The work log stays open while it works and folds away once the answer arrives, unless the viewer toggled it.
  const [workOpen, setWorkOpen] = useState(null)
  const autoOpen = turn.phase === 'starting' || turn.phase === 'working'
  const open = workOpen ?? autoOpen

  return (
    <div className="sp-turn">
      <span className="sp-label"><span className="sp-mark"><Icon name="sparkles" size={11} strokeWidth={2.4} /></span> BCD AI</span>

      {(turn.steps.length > 0 || live) && (
        <div className={open ? 'sp-work is-open' : 'sp-work'}>
          <button type="button" className="sp-work-head" onClick={() => setWorkOpen(!open)} aria-expanded={open}>
            {live ? <span className="sp-dot" aria-hidden /> : <Icon name="check" size={13} strokeWidth={2.6} />}
            <span>
              {turn.phase === 'starting' ? 'Starting BCD AI' : live ? `Working · ${seconds}s` : `Worked for ${seconds}s · ${turn.steps.length} step${turn.steps.length === 1 ? '' : 's'}`}
            </span>
            <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} className="sp-work-caret" />
          </button>
          {open && (
            <ol className="sp-steps">
              {turn.steps.map((s) => <StepItem key={s.id} step={s} live={live} />)}
              {turn.phase === 'starting' && <li className="sp-step-pending">Connecting to your data…</li>}
            </ol>
          )}
        </div>
      )}

      {turn.answers.map((a) => <AnswerCard key={`${a.session_id}-${a.gen_no}`} answer={a} />)}

      {turn.text && <Markdown text={turn.text} className={turn.phase === 'answering' ? 'sp-text is-streaming' : 'sp-text'} />}

      {turn.phase === 'stopped' && <p className="sp-note">Stopped.</p>}
      {turn.phase === 'error' && (
        <div className="sp-error" role="alert">
          {turn.error}
          {onRetry && <button type="button" onClick={onRetry}>Try again</button>}
        </div>
      )}
    </div>
  )
}

/** An answer from the flight web search: status while it searches, the streamed table, then the sources it read. */
export function WebAnswer({ item, onRetry }) {
  const live = item.phase === 'working'
  return (
    <div className="sp-turn">
      <span className="sp-label"><span className="sp-mark"><Icon name="sparkles" size={11} strokeWidth={2.4} /></span> BCD AI · web search</span>
      {live && !item.text && (
        <div className="sp-work is-open">
          <div className="sp-work-head"><span className="sp-dot" aria-hidden /><span>{item.status || 'Starting search…'}</span></div>
        </div>
      )}
      {item.phase !== 'working' && /\(sample\)/i.test(item.text) && (
        <span className="sp-sample" title="Cells marked (sample) are illustrative, not live fares or times">Includes sample data</span>
      )}
      {item.text && <Markdown text={item.text} className={live ? 'sp-text sp-web is-streaming' : 'sp-text sp-web'} />}
      {live && item.text && <span className="sp-note">{item.status || 'Working…'}</span>}
      {item.sources?.length > 0 && (
        <div className="sp-sources">
          <span className="sp-sources-label">Sources</span>
          {item.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" title={s.title}>{(() => { try { return new URL(s.url).hostname.replace(/^www\./, '') } catch { return s.title } })()}</a>)}
        </div>
      )}
      {item.phase === 'stopped' && <p className="sp-note">Stopped.</p>}
      {item.phase === 'error' && (
        <div className="sp-error" role="alert">{item.error}{onRetry && <button type="button" onClick={onRetry}>Try again</button>}</div>
      )}
    </div>
  )
}
