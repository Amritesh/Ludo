import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Ably from 'ably';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameState, DiceBankEntry, Piece as PieceType } from '../types/game';
import Board from '../components/Board';
import Piece from '../components/Piece';
import { Dice6, Trophy, ChevronLeft, Users, Zap, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { playSound } from '../utils/sounds';
import { getSquareOccupants, classifyStack } from '../utils/tactical';

export default function Game() {
  const { code } = useParams<{ code: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [selectedBankDieId, setSelectedBankDieId] = useState<string | null>(null);
  const ablyRef = useRef<Ably.Realtime | null>(null);
  const navigate = useNavigate();

  const fetchState = async () => {
    const sid = localStorage.getItem(`session_${code}`);
    setSessionId(sid);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/game/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode: code, sessionId: sid }),
      });
      const data = await res.json();
      if (data.error) {
        console.error(data.error);
        return;
      }
      setGameState(data.gameState);
      setPlayerId(data.playerId);
      
      if (!ablyRef.current && data.sessionId) {
        const ably = new Ably.Realtime({ 
          authUrl: `${API_BASE_URL}/api/realtime/token?sessionId=${data.sessionId}` 
        });
        ably.connection.on('connected', () => console.log('Ably Connected'));
        ably.connection.on('failed', (err) => console.error('Ably Connection Failed:', err));
        
        ablyRef.current = ably;
        const channel = ably.channels.get(`game:${code}`);
        
        channel.subscribe((msg: any) => {
          if (msg.name === 'SNAPSHOT' || msg.name === 'GAME_STARTED') {
            setGameState(msg.data);
          } else if (msg.name === 'GAME_FINISHED') {
             if (msg.data.winnerId !== playerId) playSound('WIN');
             setGameState(prev => prev ? { ...prev, status: 'FINISHED', winnerId: msg.data.winnerId } : null);
          } else if (msg.name === 'TURN_CHANGED') {
            setGameState(prev => prev ? { ...prev, currentTurnPlayerId: msg.data.playerId, turn: { ...prev.turn, ...msg.data } } : null);
            setSelectedBankDieId(null);
          } else if (msg.name === 'DICE_ROLL') {
             if (msg.data.playerId !== playerId) playSound('ROLL');
             setGameState(prev => prev ? { ...prev, turn: { ...prev.turn, ...msg.data.payload } } : null);
          } else if (msg.name === 'PIECE_MOVED') {
             const event = msg.data;
             if (event?.playerId !== playerId && event?.type === 'PIECE_MOVED') {
               if (event.payload.cut) playSound('CUT');
               else if (event.payload.to === 58) playSound('HOME');
               else playSound('MOVE');
             }
             refreshFullState();
          } else if (msg.name === 'BANK_DISCARDED') {
             playSound('CUT'); // Use cut sound for discard for now
             refreshFullState();
          }
        });
      }
    } catch (err) {
      console.error('Failed to sync state:', err);
    }
  };

  const refreshFullState = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/game/state?gameCode=${code}`);
      const data = await res.json();
      setGameState(data);
    } catch (err) {
      console.error('Failed to refresh state:', err);
    }
  };

  useEffect(() => {
    fetchState();

    const interval = setInterval(() => {
      if (!ablyRef.current || ablyRef.current.connection.state !== 'connected') {
        refreshFullState();
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      ablyRef.current?.close();
    };
  }, [code]);

  // AI Heartbeat
  useEffect(() => {
    if (!gameState || gameState.status !== 'RUNNING') return;
    
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId);
    if (currentPlayer && (currentPlayer.kind === 'BOT' || !currentPlayer.connected)) {
      const timer = setTimeout(async () => {
        try {
          await fetch(`${API_BASE_URL}/api/game/ai-step`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameCode: code }),
          });
        } catch (err) {
          console.error('AI Step failed:', err);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState?.currentTurnPlayerId, gameState?.turn.phase, gameState?.turn.bank.length]);

  const roll = async () => {
    if (rolling || !gameState) return;
    setRolling(true);
    playSound('ROLL');
    try {
      const res = await fetch(`${API_BASE_URL}/api/game/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode: code,
          sessionId,
          action: 'ROLL',
          turnNonce: gameState.turn.turnNonce,
        }),
      });
      const data = await res.json();
      if (data.error) console.warn(data.error);
      else if (data.gameState) setGameState(data.gameState);
    } catch (err) {
      console.error(err);
    } finally {
      setRolling(false);
    }
  };

  const movePiece = async (pieceIndex: number) => {
    if (!gameState) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/game/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode: code,
          sessionId,
          action: 'MOVE',
          turnNonce: gameState.turn.turnNonce,
          payload: { pieceIndex, bankDieId: selectedBankDieId },
        }),
      });
      const data = await res.json();
      if (data.error) console.warn(data.error);
      else if (data.gameState) {
        const event = data.gameState.lastEvent;
        if (event?.type === 'PIECE_MOVED') {
           if (event.payload.cut) playSound('CUT');
           else if (event.payload.to === 58) playSound('HOME');
           else playSound('MOVE');
        }
        if (data.gameState.status === 'FINISHED') playSound('WIN');
        setGameState(data.gameState);
        setSelectedBankDieId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isMyTurn = gameState?.currentTurnPlayerId === playerId;

  const colorMap: Record<string, string> = {
    RED: 'text-red-500',
    GREEN: 'text-green-500',
    YELLOW: 'text-yellow-500',
    BLUE: 'text-blue-500',
  };

  const bgMap: Record<string, string> = {
    RED: 'bg-red-500',
    GREEN: 'bg-green-500',
    YELLOW: 'bg-yellow-500',
    BLUE: 'bg-blue-500',
  };

  if (!gameState) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin mb-4" />
      <p className="text-slate-500 font-bold">CONNECTING TO GAME...</p>
    </div>
  );

  const currentTurnPlayer = gameState.players.find(p => p.id === gameState.currentTurnPlayerId)!;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-8 pb-32">
      <div className="w-full max-w-[600px] flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/')}
          className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-900"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Game Room</div>
          <div className="font-mono font-black text-xl text-slate-900">{code}</div>
        </div>
        <div className="flex -space-x-2">
          {gameState.players.map(p => (
            <div 
              key={p.id} 
              className={`w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${bgMap[p.color]} ${p.connected ? 'opacity-100' : 'opacity-30 grayscale'}`}
            >
              {p.id === playerId && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-[600px] bg-white p-4 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 mb-8">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-4">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${bgMap[currentTurnPlayer.color]} ${isMyTurn ? 'ring-4 ring-offset-2 ring-slate-100' : ''}`}>
               {gameState.turn.phase === 'NEED_ROLL' ? (
                 <Dice6 className="text-white" size={24} />
               ) : (
                 <Zap className="text-white" size={24} fill="currentColor" />
               )}
             </div>
             <div>
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 {isMyTurn ? 'YOUR TURN' : `${currentTurnPlayer.name.toUpperCase()}'S TURN`}
               </div>
               <div className={`text-lg font-black ${colorMap[currentTurnPlayer.color]}`}>
                 {gameState.turn.phase === 'NEED_ROLL' ? 'Waiting for Roll' : 'Tactical Phase'}
               </div>
             </div>
          </div>
        </div>

        {/* Dice Bank UI */}
        <div className="flex flex-wrap gap-2 mb-6 px-2 min-h-[64px] items-center bg-slate-50/50 p-3 rounded-2xl border border-dashed border-slate-200">
           <AnimatePresence mode="popLayout">
             {gameState.turn.bank.map((die) => (
               <motion.button
                 key={die.id}
                 layout
                 initial={{ scale: 0, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 exit={{ scale: 0, opacity: 0 }}
                 whileHover={{ scale: 1.1 }}
                 whileTap={{ scale: 0.9 }}
                 onClick={() => isMyTurn && setSelectedBankDieId(die.id)}
                 className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border-2 transition-all ${
                   selectedBankDieId === die.id 
                     ? 'bg-slate-900 border-slate-900 text-white' 
                     : 'bg-white border-slate-200 text-slate-900'
                 }`}
               >
                 <span className="text-xl font-black">{die.value}</span>
               </motion.button>
             ))}
             {gameState.turn.bank.length === 0 && gameState.turn.phase === 'NEED_MOVE' && (
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Bank Exhausted</div>
             )}
           </AnimatePresence>
           
           {gameState.turn.discardEvent && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100"
              >
                <Trash2 size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">{gameState.turn.discardEvent.reason}</span>
              </motion.div>
           )}
        </div>

        <div className="relative aspect-square rounded-xl overflow-hidden shadow-inner bg-slate-50">
          <Board />
          {gameState.players.map(player => 
            player.pieces.map((piece, idx) => {
              const occupants = getSquareOccupants(gameState.players, piece.position);
              const stackType = classifyStack(occupants, piece.position);
              const stackIndex = occupants.findIndex(o => o.playerId === player.id && o.pieceIndex === idx);
              
              return (
                <Piece
                  key={`${player.id}-${idx}`}
                  color={player.color}
                  index={idx}
                  position={piece.position}
                  stackType={stackType}
                  stackSize={occupants.length}
                  stackIndex={stackIndex >= 0 ? stackIndex : 0}
                  isTurn={gameState.currentTurnPlayerId === player.id}
                  canMove={
                    gameState.currentTurnPlayerId === player.id && 
                    player.id === playerId &&
                    gameState.turn.phase === 'NEED_MOVE' && 
                    gameState.turn.bank.length > 0
                  }
                  onClick={() => movePiece(idx)}
                />
              );
            })
          )}

          <AnimatePresence>
            {gameState.status === 'FINISHED' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0.5, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                >
                  <Trophy size={80} className="text-yellow-400 mb-6 mx-auto" />
                  <h2 className="text-5xl font-black text-white mb-2">WINNER!</h2>
                  <p className={`text-2xl font-black mb-8 ${colorMap[gameState.players.find(p => p.id === gameState.winnerId)!.color]}`}>
                    {gameState.players.find(p => p.id === gameState.winnerId)?.name.toUpperCase()}
                  </p>
                  <button
                    onClick={() => navigate('/')}
                    className="bg-white text-slate-900 px-12 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-transform"
                  >
                    BACK TO HOME
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-[500px] px-4">
        <div className="bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-4 ml-4">
            <div className="flex items-center gap-2 text-white/50">
              <Users size={16} />
              <span className="text-xs font-black">{gameState.viewersCount}</span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={!isMyTurn || gameState.turn.phase !== 'NEED_ROLL' || rolling}
            onClick={roll}
            className={`flex items-center gap-3 px-10 py-5 rounded-[2rem] font-black text-white transition-all ${
              isMyTurn && gameState.turn.phase === 'NEED_ROLL' 
                ? 'bg-red-500 shadow-lg shadow-red-500/20' 
                : 'bg-white/10 opacity-30 grayscale'
            }`}
          >
            <Dice6 size={24} className={rolling ? 'animate-dice' : ''} />
            <span>{rolling ? 'ROLLING...' : 'ROLL DICE'}</span>
          </motion.button>
          
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mr-2">
            <div className={`w-3 h-3 rounded-full ${isMyTurn ? 'bg-green-500 animate-pulse' : 'bg-white/10'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
