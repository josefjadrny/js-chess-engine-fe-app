import { useState, useCallback } from 'react'
import { Game } from 'js-chess-engine'
import './App.css'

const PIECE_UNICODE = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
}

const FILES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1']

function isWhite(piece) {
  return piece === piece.toUpperCase()
}

function getMovesForSquare(game, sq) {
  const result = game.moves(sq)
  return result[sq] || []
}

export default function App() {
  const [game, setGame] = useState(() => new Game())
  const [config, setConfig] = useState(() => new Game().exportJson())
  const [selected, setSelected] = useState(null)
  const [validMoves, setValidMoves] = useState([])
  const [status, setStatus] = useState('Your turn (White)')
  const [aiThinking, setAiThinking] = useState(false)
  const [lastMove, setLastMove] = useState(null)
  const [aiLevel, setAiLevel] = useState(3)
  const [ttSizeMB, setTtSizeMB] = useState(16)
  const [warnDismissed, setWarnDismissed] = useState(false)

  const doAiMove = useCallback((g, level, tt) => {
    setAiThinking(true)
    setTimeout(() => {
      const result = g.ai({ level, ttSizeMB: tt })
      const [from, to] = Object.entries(result.move)[0]
      setLastMove({ from, to })
      const cfg = result.board
      setConfig(cfg)
      setAiThinking(false)
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
        setLastMove({ from: selected, to: targetSq })
        setSelected(null)
        setValidMoves([])
        const cfg = game.exportJson()
        setConfig(cfg)
        if (cfg.checkMate) {
          setStatus('Checkmate! You win!')
        } else {
          setStatus('AI thinking...')
          doAiMove(game, aiLevel, ttSizeMB)
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
  }, [aiThinking, config, game, selected, validMoves, doAiMove, aiLevel, ttSizeMB])

  const resetGame = () => {
    const g = new Game()
    setGame(g)
    setConfig(g.exportJson())
    setSelected(null)
    setValidMoves([])
    setStatus('Your turn (White)')
    setAiThinking(false)
    setLastMove(null)
  }

  return (
    <div className="app">
      {!warnDismissed && (
        <div className="banner">
          <span>
            Browser AI search uses a transposition table — defaults: L1=0.5 MB, L2=1 MB, L3=4 MB, L4=16 MB, L5=40 MB.
            Browsers may cap available memory, weakening play at higher levels. Raise the TT limit below if needed.
          </span>
          <button className="banner-close" onClick={() => setWarnDismissed(true)}>✕</button>
        </div>
      )}
      <h1>Chess — Human vs AI (Level {aiLevel})</h1>
      <div className={`status ${config.checkMate ? 'status-end' : aiThinking ? 'status-ai' : ''}`}>
        {status}
      </div>
      <div className="controls">
        <div className="level-select">
          <span>AI Level:</span>
          {[1, 2, 3, 4, 5].map(lvl => (
            <button
              key={lvl}
              className={`level-btn ${aiLevel === lvl ? 'active' : ''}`}
              onClick={() => setAiLevel(lvl)}
              disabled={aiThinking}
            >
              {lvl}
            </button>
          ))}
        </div>
        <div className="tt-select">
          <label htmlFor="tt">TT memory:</label>
          <input
            id="tt"
            type="number"
            min="1"
            max="256"
            value={ttSizeMB}
            disabled={aiThinking}
            onChange={e => setTtSizeMB(Math.max(1, Math.min(256, Number(e.target.value))))}
          />
          <span>MB</span>
        </div>
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
      <button className="reset-btn" onClick={resetGame}>New Game</button>
    </div>
  )
}
