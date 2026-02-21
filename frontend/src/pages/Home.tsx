import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Trophy, Users } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function Home() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createGame = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/game/create`, {
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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-12"
      >
        <h1 className="text-7xl font-black text-slate-900 mb-2 tracking-tighter">
          LUDO<span className="text-red-500">.</span>
        </h1>
        <p className="text-slate-500 font-medium">Classic board game, reimagined.</p>
      </motion.div>

      <div className="w-full max-w-md space-y-4">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100"
        >
          <button
            onClick={createGame}
            disabled={loading}
            className="w-full group relative bg-slate-900 hover:bg-slate-800 text-white font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 overflow-hidden disabled:opacity-50"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 opacity-0 group-hover:opacity-10 transition-opacity" />
            <Play size={24} fill="currentColor" />
            <span>{loading ? 'CREATING...' : 'CREATE NEW GAME'}</span>
          </button>

          <div className="relative flex items-center my-8">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-xs font-bold uppercase tracking-widest">or join existing</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="ENTER GAME CODE"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full text-center text-3xl font-black tracking-[0.2em] border-2 border-slate-100 rounded-2xl py-4 focus:outline-none focus:border-red-500/20 focus:ring-4 focus:ring-red-500/5 transition-all text-slate-900 placeholder:text-slate-200"
            />
            <button
              onClick={joinGame}
              disabled={code.length !== 6}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-5 rounded-2xl transition-all disabled:opacity-30 disabled:grayscale"
            >
              JOIN GAME
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
               <Users size={20} />
             </div>
             <div>
               <div className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Active</div>
               <div className="font-bold text-slate-900">2.4k Players</div>
             </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-500">
               <Trophy size={20} />
             </div>
             <div>
               <div className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Today</div>
               <div className="font-bold text-slate-900">482 Winners</div>
             </div>
          </div>
        </div>
      </div>

      <footer className="mt-12 text-slate-400 text-sm font-medium">
        v1.0.0 &bull; Built with ❤️ for fun
      </footer>
    </div>
  );
}
