import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createGame = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/game/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seats: 4, allowBots: true }),
      });
      const data = await res.json();
      localStorage.setItem(`session_${data.gameCode}`, data.sessionId);
      navigate(`/lobby/${data.gameCode}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const joinGame = () => {
    if (code.length === 6) {
      navigate(`/lobby/${code.toUpperCase()}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-5xl font-bold text-red-600 mb-8 drop-shadow-md">LUDO</h1>
      
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <button
          onClick={createGame}
          disabled={loading}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl mb-6 transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'CREATE NEW GAME'}
        </button>

        <div className="relative flex items-center mb-6">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-slate-400 font-medium">OR</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="ENTER 6-DIGIT CODE"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="w-full text-center text-2xl font-mono tracking-widest border-2 border-slate-200 rounded-xl py-3 focus:outline-none focus:border-red-400 transition-colors text-slate-900"
          />
          <button
            onClick={joinGame}
            disabled={code.length !== 6}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:scale-100"
          >
            JOIN GAME
          </button>
        </div>
      </div>
      
      <p className="mt-8 text-slate-400 text-sm">Play Ludo instantly with friends.</p>
    </div>
  );
}
