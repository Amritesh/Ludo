import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { GameState } from '../types/game';
import { Share2, UserPlus, Play } from 'lucide-react';

export default function Lobby() {
  const { code } = useParams<{ code: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchState = async () => {
    try {
      const sessionId = localStorage.getItem(`session_${code}`);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/game/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode: code, sessionId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      localStorage.setItem(`session_${code}`, data.sessionId);
      setGameState(data.gameState);
      
      if (data.gameState.status === 'RUNNING') {
        navigate(`/game/${code}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000); // Polling for lobby
    return () => clearInterval(interval);
  }, [code]);

  const addBot = async () => {
    try {
      const sessionId = localStorage.getItem(`session_${code}`);
      await fetch(`${import.meta.env.VITE_API_URL}/api/game/add-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode: code, sessionId }),
      });
      fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  const startGame = async () => {
    try {
      const sessionId = localStorage.getItem(`session_${code}`);
      await fetch(`${import.meta.env.VITE_API_URL}/api/game/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode: code, sessionId }),
      });
      navigate(`/game/${code}`);
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

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;
  if (!gameState) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <h2 className="text-3xl font-bold text-center mb-2">Lobby</h2>
        <p className="text-center text-slate-500 mb-8 font-mono text-xl tracking-widest">{code}</p>

        <div className="space-y-4 mb-8">
          {gameState.players.map((player) => (
            <div key={player.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: player.color.toLowerCase() }}></div>
                <span className="font-bold text-slate-700">{player.name}</span>
                {player.kind === 'BOT' && <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-500">BOT</span>}
              </div>
              <div className={`w-2 h-2 rounded-full ${player.connected ? 'bg-green-500' : 'bg-slate-300'}`}></div>
            </div>
          ))}
          {Array.from({ length: 4 - gameState.players.length }).map((_, i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center text-slate-400 font-medium">
              Waiting for player...
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={shareGame}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
          >
            <Share2 size={20} /> SHARE
          </button>
          <button
            onClick={addBot}
            disabled={gameState.players.length >= 4}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            <UserPlus size={20} /> ADD BOT
          </button>
          <button
            onClick={startGame}
            disabled={gameState.players.length < 2}
            className="col-span-2 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            <Play size={20} /> START GAME
          </button>
        </div>
      </div>
    </div>
  );
}
