import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Ably from 'ably';
import type { GameState } from '../types/game';
import { Share2, UserPlus, Play, ChevronLeft, ShieldCheck, Cpu, Edit2, Check } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function Lobby() {
  const { code } = useParams<{ code: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const ablyRef = useRef<Ably.Realtime | null>(null);
  const navigate = useNavigate();

  const fetchState = async () => {
    try {
      const sessionId = localStorage.getItem(`session_${code}`);
      const res = await fetch(`${API_BASE_URL}/api/game/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode: code, sessionId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      localStorage.setItem(`session_${code}`, data.sessionId);
      setGameState(data.gameState);
      setPlayerId(data.playerId);
      setNewName(data.gameState.players.find((p: any) => p.id === data.playerId)?.name || '');
      
      if (data.gameState.status === 'RUNNING') {
        navigate(`/game/${code}`);
        return;
      }

      if (!ablyRef.current && data.sessionId) {
        const ably = new Ably.Realtime({ 
          authUrl: `${API_BASE_URL}/api/realtime/token?sessionId=${data.sessionId}` 
        });
        ablyRef.current = ably;
        const channel = ably.channels.get(`game:${code}`);
        
        channel.subscribe((msg: any) => {
          if (msg.name === 'SNAPSHOT' || msg.name === 'GAME_STARTED') {
            setGameState(msg.data);
            if (msg.name === 'GAME_STARTED' || msg.data.status === 'RUNNING') {
              navigate(`/game/${code}`);
            }
          }
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    return () => {
      ablyRef.current?.close();
      ablyRef.current = null;
    };
  }, [code]);

  const updateName = async () => {
    if (!newName.trim()) return;
    try {
      const sessionId = localStorage.getItem(`session_${code}`);
      const res = await fetch(`${API_BASE_URL}/api/game/update-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode: code, sessionId, name: newName }),
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else setIsEditingName(false);
    } catch (err) {
      console.error(err);
    }
  };

  const addBot = async () => {
    try {
      const sessionId = localStorage.getItem(`session_${code}`);
      const res = await fetch(`${API_BASE_URL}/api/game/add-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode: code, sessionId }),
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  const startGame = async () => {
    try {
      const sessionId = localStorage.getItem(`session_${code}`);
      const res = await fetch(`${API_BASE_URL}/api/game/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode: code, sessionId }),
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else navigate(`/game/${code}`);
    } catch (err) {
      console.error(err);
    }
  };

  const shareGame = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join my Ludo Game',
        text: `Join my Ludo game with code: ${code}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(code!);
      alert('Code copied to clipboard!');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin mb-4" />
      <p className="text-slate-500 font-bold animate-pulse">PREPARING LOBBY...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6">
        <ShieldCheck size={40} />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>
      <p className="text-slate-500 mb-8 max-w-xs">{error}</p>
      <button onClick={() => navigate('/')} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold">
        GO BACK
      </button>
    </div>
  );

  if (!gameState) return null;

  const colorMap: Record<string, string> = {
    RED: 'bg-red-500',
    GREEN: 'bg-green-500',
    YELLOW: 'bg-yellow-500',
    BLUE: 'bg-blue-500',
  };

  const colorSoftMap: Record<string, string> = {
    RED: 'bg-red-50',
    GREEN: 'bg-green-50',
    YELLOW: 'bg-yellow-50',
    BLUE: 'bg-blue-50',
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-colors mb-8 group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          LEAVE LOBBY
        </button>

        <div className="grid md:grid-cols-[1fr_300px] gap-8">
          <div>
            <div className="mb-8">
              <h1 className="text-4xl font-black text-slate-900 mb-2">Ludo Room</h1>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="font-bold">CODE:</span>
                <span className="font-mono text-xl text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">{code}</span>
                <button onClick={shareGame} className="p-2 hover:bg-white rounded-lg transition-colors text-slate-900">
                  <Share2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Players ({gameState.players.length}/4)</h3>
              <AnimatePresence mode="popLayout">
                {gameState.players.map((player) => (
                  <motion.div 
                    key={player.id}
                    layout
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${colorSoftMap[player.color]} flex items-center justify-center relative`}>
                        <div className={`w-4 h-4 rounded-full ${colorMap[player.color]} shadow-sm`} />
                        {player.kind === 'BOT' && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center text-white border-2 border-white">
                            <Cpu size={10} />
                          </div>
                        )}
                      </div>
                      <div>
                        {isEditingName && player.id === playerId ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 w-32"
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && updateName()}
                            />
                            <button onClick={updateName} className="p-1 hover:bg-slate-100 rounded text-green-600">
                              <Check size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="font-black text-slate-900">{player.name}</div>
                            {player.id === playerId && (
                              <button onClick={() => setIsEditingName(true)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                                <Edit2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-tighter">
                          {player.kind === 'BOT' ? 'Artificial Intelligence' : player.id === playerId ? 'You (Player)' : 'Human Player'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${player.connected ? 'bg-green-500 animate-pulse' : 'bg-slate-200'}`} />
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        {player.connected ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {Array.from({ length: 4 - gameState.players.length }).map((_, i) => (
                <div key={i} className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-200 mb-2 border-dashed" />
                  <span className="text-xs font-bold uppercase tracking-widest">Waiting for player...</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm sticky top-8">
               <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                 Game Controls
               </h3>
               
               <div className="space-y-3">
                 <button
                    onClick={addBot}
                    disabled={gameState.players.length >= 4}
                    className="w-full flex items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold py-4 rounded-2xl transition-all border border-slate-100 disabled:opacity-50"
                  >
                    <UserPlus size={20} />
                    <span>ADD BOT</span>
                  </button>

                  <button
                    onClick={startGame}
                    disabled={gameState.players.length < 2}
                    className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-bold py-5 rounded-2xl transition-all shadow-xl shadow-slate-200 disabled:opacity-30 disabled:grayscale"
                  >
                    <Play size={20} fill="currentColor" />
                    <span>START GAME</span>
                  </button>
               </div>

               <div className="mt-8 pt-8 border-t border-slate-100">
                 <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                   * NEED AT LEAST 2 PLAYERS TO START.<br/>
                   * ONLY THE CREATOR CAN ADD BOTS OR START.
                 </p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
