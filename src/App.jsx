import { useState, useCallback, useRef, useEffect } from 'react'
import { Game } from 'js-chess-engine'
import enginePkg from 'js-chess-engine/package.json'
import './App.css'

const PIECE_UNICODE = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
}

const FILES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1']

const CUSTOM_DEFAULTS = { depth: 4, extended: 3, quiescence: 4, check: true, ttSizeMB: 20, randomness: 0 }

function isWhite(piece) {
  return piece === piece.toUpperCase()
}

function getMovesForSquare(game, sq) {
  const result = game.moves(sq)
  return result[sq] || []
}

function getAiOpts(mode, level, cust) {
  return mode === 'level'
    ? { level }
    : {
        depth: { base: cust.depth, extended: cust.extended, quiescence: cust.quiescence, check: cust.check },
        ttSizeMB: cust.ttSizeMB,
        randomness: cust.randomness,
      }
}

function moveLabel(from, to) {
  return `${from}-${to}`
}

export default function App() {
  const [game, setGame] = useState(() => new Game())
  const [config, setConfig] = useState(() => new Game().exportJson())
  const [selected, setSelected] = useState(null)
  const [validMoves, setValidMoves] = useState([])
  const [status, setStatus] = useState('Your turn (White)')
  const [aiThinking, setAiThinking] = useState(false)
  const [lastMove, setLastMove] = useState(null)
  const [configMode, setConfigMode] = useState('level')
  const [aiLevel, setAiLevel] = useState(3)
  const [custom, setCustom] = useState(CUSTOM_DEFAULTS)

  // history[0] = start, history[odd] = after white move, history[even>0] = after AI move
  const [history, setHistory] = useState(() => [
    { label: 'Start', snapshot: new Game().exportJson(), lastMove: null },
  ])
  const [currentPly, setCurrentPly] = useState(0)

  const historyListRef = useRef(null)

  useEffect(() => {
    if (historyListRef.current) {
      historyListRef.current.scrollTop = historyListRef.current.scrollHeight
    }
  }, [history.length])

  const doAiMove = useCallback((g, mode, level, cust, prevHistory) => {
    setAiThinking(true)
    setTimeout(() => {
      const result = g.ai(getAiOpts(mode, level, cust))
      const [from, to] = Object.entries(result.move)[0]
      const lm = { from, to }
      const cfg = result.board

      setLastMove(lm)
      setConfig(cfg)
      setAiThinking(false)

      const newHistory = [...prevHistory, { label: moveLabel(from, to), snapshot: cfg, lastMove: lm }]
      setHistory(newHistory)
      setCurrentPly(newHistory.length - 1)

      if (cfg.checkMate) {
        setStatus('Checkmate! AI wins!')
      } else if (cfg.check) {
        setStatus('Check! Your turn (White)')
      } else {
        setStatus('Your turn (White)')
      }
    }, 50)
  }, [])

  const handleSquareClick = useCallback((sq) => {
    if (aiThinking || config.turn !== 'white' || config.checkMate) return

    if (selected) {
      const CASTLE_ROOK_MAP = { H1: 'G1', A1: 'C1' }
      const isKing = config.pieces[selected] === 'K'
      const castleDest = isKing && CASTLE_ROOK_MAP[sq]
      const targetSq = castleDest && validMoves.includes(castleDest) ? castleDest : sq

      if (validMoves.includes(targetSq)) {
        game.move(selected, targetSq)
        const lm = { from: selected, to: targetSq }
        setLastMove(lm)
        setSelected(null)
        setValidMoves([])
        const cfg = game.exportJson()
        setConfig(cfg)

        // Truncate any future history, then append white's move
        const base = history.slice(0, currentPly + 1)
        const afterWhite = [...base, { label: moveLabel(selected, targetSq), snapshot: cfg, lastMove: lm }]
        setHistory(afterWhite)
        setCurrentPly(afterWhite.length - 1)

        if (cfg.checkMate) {
          setStatus('Checkmate! You win!')
        } else {
          setStatus('AI thinking...')
          doAiMove(game, configMode, aiLevel, custom, afterWhite)
        }
      } else {
        const piece = config.pieces[sq]
        if (piece && isWhite(piece)) {
          setSelected(sq)
          setValidMoves(getMovesForSquare(game, sq))
        } else {
          setSelected(null)
          setValidMoves([])
        }
      }
    } else {
      const piece = config.pieces[sq]
      if (piece && isWhite(piece)) {
        setSelected(sq)
        setValidMoves(getMovesForSquare(game, sq))
      }
    }
  }, [aiThinking, config, game, selected, validMoves, doAiMove, configMode, aiLevel, custom, history, currentPly])

  const rollbackTo = useCallback((ply) => {
    if (aiThinking) return
    const entry = history[ply]
    if (!entry) return

    const g = new Game(entry.snapshot)
    setGame(g)
    setConfig(entry.snapshot)
    setLastMove(entry.lastMove)
    setSelected(null)
    setValidMoves([])
    setCurrentPly(ply)

    const cfg = entry.snapshot
    if (cfg.checkMate) {
      const winner = cfg.turn === 'white' ? 'AI' : 'You'
      setStatus(`Checkmate! ${winner} wins!`)
    } else if (cfg.turn === 'black') {
      // AI's turn — let it play from this position, truncating any future history
      setStatus('AI thinking...')
      doAiMove(g, configMode, aiLevel, custom, history.slice(0, ply + 1))
    } else {
      setStatus(cfg.check ? 'Check! Your turn (White)' : 'Your turn (White)')
    }
  }, [aiThinking, history, doAiMove, configMode, aiLevel, custom])

  const resetGame = () => {
    const g = new Game()
    const cfg = g.exportJson()
    setGame(g)
    setConfig(cfg)
    setSelected(null)
    setValidMoves([])
    setStatus('Your turn (White)')
    setAiThinking(false)
    setLastMove(null)
    setHistory([{ label: 'Start', snapshot: cfg, lastMove: null }])
    setCurrentPly(0)
  }

  const updateCustom = (key, val) => setCustom(prev => ({ ...prev, [key]: val }))

  const aiLabel = configMode === 'level' ? `Level ${aiLevel}` : 'Custom'

  // Group history into move rows: each row has a move number, white ply, black ply
  const moveRows = []
  for (let i = 1; i < history.length; i += 2) {
    moveRows.push({
      moveNum: Math.ceil(i / 2),
      whitePly: i,
      blackPly: i + 1 < history.length ? i + 1 : null,
    })
  }

  return (
    <div className="app">
      <h1>js-chess-engine <span className="version">v{enginePkg.version}</span> — Human vs AI ({aiLabel})</h1>

      <div className="main-layout">

        {/* LEFT SIDEBAR — Config */}
        <aside className="sidebar sidebar-left">
          <div className="controls-panel">
            <div className="mode-tabs">
              <label className={`mode-tab ${configMode === 'level' ? 'active' : ''}`}>
                <input
                  type="radio" name="mode" value="level"
                  checked={configMode === 'level'}
                  onChange={() => setConfigMode('level')}
                  disabled={aiThinking}
                />
                Predefined Level
              </label>
              <label className={`mode-tab ${configMode === 'custom' ? 'active' : ''}`}>
                <input
                  type="radio" name="mode" value="custom"
                  checked={configMode === 'custom'}
                  onChange={() => setConfigMode('custom')}
                  disabled={aiThinking}
                />
                Custom Config
              </label>
            </div>

            <div className={`config-section ${configMode !== 'level' ? 'dimmed' : ''}`}>
              <div className="level-select">
                <span>AI Level:</span>
                <div className="level-buttons">
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <button
                      key={lvl}
                      className={`level-btn ${aiLevel === lvl ? 'active' : ''}`}
                      onClick={() => setAiLevel(lvl)}
                      disabled={aiThinking || configMode !== 'level'}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={`config-section ${configMode !== 'custom' ? 'dimmed' : ''}`}>
              {configMode === 'custom' && (
                <div className="custom-warning">
                  ⚠ Running in the browser — high values may freeze or crash the tab.
                </div>
              )}
              <div className="custom-grid">
                <div className="custom-field">
                  <label>Depth</label>
                  <input
                    type="number" min="1" max="8"
                    value={custom.depth}
                    disabled={aiThinking || configMode !== 'custom'}
                    onChange={e => updateCustom('depth', Math.max(1, Math.min(8, Number(e.target.value))))}
                  />
                </div>
                <div className="custom-field">
                  <label>Ext. Depth</label>
                  <input
                    type="number" min="0" max="3"
                    value={custom.extended}
                    disabled={aiThinking || configMode !== 'custom'}
                    onChange={e => updateCustom('extended', Math.max(0, Math.min(3, Number(e.target.value))))}
                  />
                </div>
                <div className="custom-field">
                  <label>Quiescence</label>
                  <input
                    type="number" min="0" max="10"
                    value={custom.quiescence}
                    disabled={aiThinking || configMode !== 'custom'}
                    onChange={e => updateCustom('quiescence', Math.max(0, Math.min(10, Number(e.target.value))))}
                  />
                </div>
                <div className="custom-field custom-check">
                  <label>Check ext.</label>
                  <input
                    type="checkbox"
                    checked={custom.check}
                    disabled={aiThinking || configMode !== 'custom'}
                    onChange={e => updateCustom('check', e.target.checked)}
                  />
                </div>
                <div className="custom-field">
                  <label>TT Memory</label>
                  <div className="custom-field-row">
                    <input
                      type="number" min="1" max="256"
                      value={custom.ttSizeMB}
                      disabled={aiThinking || configMode !== 'custom'}
                      onChange={e => updateCustom('ttSizeMB', Math.max(1, Math.min(256, Number(e.target.value))))}
                    />
                    <span className="unit">MB</span>
                  </div>
                </div>
                <div className="custom-field">
                  <label>Randomness</label>
                  <div className="custom-field-row">
                    <input
                      type="number" min="0" max="500"
                      value={custom.randomness}
                      disabled={aiThinking || configMode !== 'custom'}
                      onChange={e => updateCustom('randomness', Math.max(0, Math.min(500, Number(e.target.value))))}
                    />
                    <span className="unit">cp</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button className="reset-btn" onClick={resetGame} disabled={aiThinking}>New Game</button>
        </aside>

        {/* CENTER — Board */}
        <div className="center-area">
          <div className={`status ${config.checkMate ? 'status-end' : aiThinking ? 'status-ai' : ''}`}>
            {status}
          </div>
          <div className="board-wrap">
            <div className="rank-labels">
              {RANKS.map(r => <div key={r} className="label">{r}</div>)}
            </div>
            <div className="board">
              {RANKS.map((rank, ri) =>
                FILES.map((file, fi) => {
                  const sq = file + rank
                  const piece = config.pieces[sq]
                  const isLight = (ri + fi) % 2 === 0
                  const isSelected = selected === sq
                  const isValid = validMoves.includes(sq)
                  const isLastMove = lastMove && (lastMove.from === sq || lastMove.to === sq)
                  return (
                    <div
                      key={sq}
                      className={[
                        'square',
                        isLight ? 'light' : 'dark',
                        isSelected ? 'selected' : '',
                        isLastMove ? 'last-move' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleSquareClick(sq)}
                    >
                      {isValid && <div className={piece ? 'capture-ring' : 'move-dot'} />}
                      {piece && (
                        <span className={`piece ${isWhite(piece) ? 'white-piece' : 'black-piece'}`}>
                          {PIECE_UNICODE[piece]}
                        </span>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            <div className="file-labels">
              {FILES.map(f => <div key={f} className="label">{f}</div>)}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR — History */}
        <aside className="sidebar sidebar-right">
          <div className="history-panel">
            <div className="history-title">History</div>
            <div className="history-list" ref={historyListRef}>
              <table className="history-table">
                <tbody>
                  <tr>
                    <td className="history-num" />
                    <td
                      colSpan={2}
                      className={`history-cell history-start ${currentPly === 0 ? 'active' : ''}`}
                      onClick={() => rollbackTo(0)}
                    >
                      Start
                    </td>
                  </tr>
                  {moveRows.map(({ moveNum, whitePly, blackPly }) => (
                    <tr key={moveNum}>
                      <td className="history-num">{moveNum}.</td>
                      <td
                        className={`history-cell ${currentPly === whitePly ? 'active' : ''}`}
                        onClick={() => rollbackTo(whitePly)}
                      >
                        {history[whitePly]?.label}
                      </td>
                      <td
                        className={`history-cell ${blackPly !== null && currentPly === blackPly ? 'active' : ''} ${!blackPly ? 'history-empty' : ''}`}
                        onClick={() => blackPly !== null && rollbackTo(blackPly)}
                      >
                        {blackPly !== null ? history[blackPly]?.label : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </aside>

      </div>
    </div>
  )
}
