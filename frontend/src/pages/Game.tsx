import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Ably from 'ably';
import type { GameState } from '../types/game';
import Board from '../components/Board';
import Piece from '../components/Piece';
import { Dice6, RefreshCw, Trophy } from 'lucide-react';

export default function Game() {
  const { code } = useParams<{ code: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const ablyRef = useRef<Ably.Realtime | null>(null);
  const navigate = useNavigate();

  const fetchState = async () => {
    const sid = localStorage.getItem(`session_${code}`);
    setSessionId(sid);
    
    // First, join/re-sync
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/game/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameCode: code, sessionId: sid }),
    });
    const data = await res.json();
    setGameState(data.gameState);
    setPlayerId(data.playerId);
    
    if (!ablyRef.current) {
      const ably = new Ably.Realtime({ authUrl: `${import.meta.env.VITE_API_URL}/api/realtime/token?sessionId=${data.sessionId}` });
      ablyRef.current = ably;
      const channel = ably.channels.get(`game:${code}`);
      
      channel.subscribe((msg: any) => {
        console.log('Ably Event:', msg.name, msg.data);
        if (msg.name === 'SNAPSHOT' || msg.name === 'GAME_STARTED') {
          setGameState(msg.data);
        } else if (msg.name === 'TURN_CHANGED') {
          setGameState(prev => prev ? { ...prev, currentTurnPlayerId: msg.data.playerId, turn: { ...prev.turn, ...msg.data } } : null);
        } else if (msg.name === 'DICE_ROLL') {
           setGameState(prev => prev ? { ...prev, turn: { ...prev.turn, diceValue: msg.data.value, phase: 'NEED_MOVE' } } : null);
        } else if (msg.name === 'PIECE_MOVED') {
           // We might want to wait for animation here, but simple state update for now
           refreshFullState();
        }
      });
    }
  };

  const refreshFullState = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/game/state?gameCode=${code}`);
    const data = await res.json();
    setGameState(data);
  };

  useEffect(() => {
    fetchState();
    return () => {
      ablyRef.current?.close();
    };
  }, [code]);

  // AI Heartbeat
  useEffect(() => {
    if (!gameState || gameState.status !== 'RUNNING') return;
    
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
    if (currentPlayer && (currentPlayer.kind === 'BOT' || !currentPlayer.connected)) {
      const timer = setTimeout(async () => {
        await fetch(`${import.meta.env.VITE_API_URL}/api/game/ai-step`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameCode: code }),
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.currentTurnPlayerId, gameState?.turn.phase]);

  const roll = async () => {
    if (rolling || !gameState) return;
    setRolling(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/game/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode: code,
          sessionId,
          action: 'ROLL',
          turnNonce: gameState.turn.turnNonce,
        }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setRolling(false);
    }
  };

  const movePiece = async (pieceIndex: number) => {
    if (!gameState) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/game/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode: code,
          sessionId,
          action: 'MOVE',
          turnNonce: gameState.turn.turnNonce,
          payload: { pieceIndex },
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (!gameState) return <div className="flex items-center justify-center min-h-screen text-slate-900">Connecting...</div>;

  const isMyTurn = gameState.currentTurnPlayerId === playerId;
  const currentTurnPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId)!;

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-100 p-4 pb-20">
      {/* Header */}
      <div className="w-full max-w-[600px] flex justify-between items-center mb-4 bg-white p-3 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          <span className="font-mono font-bold text-slate-600">{code}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
             <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Turn</div>
             <div className="font-bold" style={{ color: currentTurnPlayer.color.toLowerCase() }}>
               {isMyTurn ? 'YOUR TURN' : currentTurnPlayer.name}
             </div>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center font-bold overflow-hidden">
            {gameState.turn.diceValue || '?'}
          </div>
        </div>
      </div>

      {/* Board Container */}
      <div className="relative w-full max-w-[600px] aspect-square">
        <Board />
        
        {/* Pieces */}
        {gameState.players.map(player => 
          player.pieces.map((piece, idx) => (
            <Piece
              key={`${player.id}-${idx}`}
              color={player.color}
              index={idx}
              position={piece.position}
              canMove={isMyTurn && gameState.turn.phase === 'NEED_MOVE' && gameState.turn.diceValue !== undefined}
              onClick={() => movePiece(idx)}
            />
          ))
        )}

        {/* Reconnect Overlay */}
        {!gameState.players.find(p => p.id === playerId)?.connected && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50 rounded-lg">
            <RefreshCw className="text-white animate-spin mb-4" size={48} />
            <div className="text-white font-bold text-xl">RECONNECTING...</div>
          </div>
        )}

        {/* Winner Overlay */}
        {gameState.status === 'FINISHED' && (
           <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-50 rounded-lg text-slate-900">
             <Trophy size={80} className="text-yellow-500 mb-4 animate-bounce" />
             <h2 className="text-4xl font-bold mb-2">WINNER!</h2>
             <p className="text-2xl font-bold" style={{ color: gameState.players.find(p => p.id === gameState.winnerId)?.color.toLowerCase() }}>
               {gameState.players.find(p => p.id === gameState.winnerId)?.name}
             </p>
             <button
               onClick={() => navigate('/')}
               className="mt-8 bg-slate-800 text-white px-8 py-3 rounded-full font-bold shadow-lg"
             >
               BACK HOME
             </button>
           </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-2xl flex justify-center items-center z-40">
        <div className="w-full max-w-[600px] flex justify-between items-center">
           <div className="flex gap-2">
             {gameState.players.map(p => (
               <div key={p.id} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${p.connected ? 'border-slate-800' : 'border-slate-200 opacity-50'}`} style={{ backgroundColor: p.color.toLowerCase() }}>
                  {p.kind === 'BOT' && <span className="text-[8px] text-white font-bold">BOT</span>}
               </div>
             ))}
           </div>

           <button
             disabled={!isMyTurn || gameState.turn.phase !== 'NEED_ROLL' || rolling}
             onClick={roll}
             className={`flex items-center gap-2 px-10 py-4 rounded-full font-bold text-white transition-all transform active:scale-90 ${isMyTurn && gameState.turn.phase === 'NEED_ROLL' ? 'bg-red-500 shadow-lg hover:bg-red-600 scale-110' : 'bg-slate-300'}`}
           >
             <Dice6 size={24} className={rolling ? 'animate-spin' : ''} />
             {rolling ? 'ROLLING...' : 'ROLL DICE'}
           </button>

           <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
             {gameState.viewersCount} Viewers
           </div>
        </div>
      </div>
    </div>
  );
}
