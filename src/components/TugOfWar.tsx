import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, runTransaction, onDisconnect, remove, set } from 'firebase/database';
import { db } from '../firebase';

type Team = 'left' | 'right' | null;
type ValidKey = 'D' | 'F' | 'K' | 'J';

const KEYS: ValidKey[] = ['D', 'F', 'K', 'J'];

const getRandomKey = (): ValidKey => KEYS[Math.floor(Math.random() * KEYS.length)];
const generateInitialQueue = () => Array.from({ length: 6 }, getRandomKey);

export default function TugOfWar() {
  const [nickname, setNickname] = useState<string>('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [team, setTeam] = useState<Team>(null);
  const [players, setPlayers] = useState<Record<string, { nickname: string, team: Team }>>({});
  const [bump, setBump] = useState<'left' | 'right' | null>(null);
  const [keyQueue, setKeyQueue] = useState<ValidKey[]>(generateInitialQueue());
  const [history, setHistory] = useState<ValidKey[]>([]);
  const [hearts, setHearts] = useState(3);
  const [wrongKey, setWrongKey] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const currentKey = keyQueue[0];

  useEffect(() => {
    const scoreRef = ref(db, 'currentGame/score');
    const unsubscribeScore = onValue(scoreRef, (snapshot) => {
      const val = snapshot.val();
      setScore(typeof val === 'number' ? val : 0);
    });

    const playersRef = ref(db, 'currentGame/players');
    const unsubscribePlayers = onValue(playersRef, (snapshot) => {
      const currentPlayers = snapshot.val() || {};
      setPlayers(currentPlayers);

      if (playerId && !currentPlayers[playerId]) {
        setTeam(null);
        setPlayerId(null);
        setHearts(3);
        setIsLocked(false);
      }
    });

    return () => {
      unsubscribeScore();
      unsubscribePlayers();
    };
  }, [playerId]);

  const joinGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      setIsJoined(true);
    }
  };

  const selectTeam = async (selectedTeam: Team) => {
    setTeam(selectedTeam);
    const newPlayerId = nickname + Math.random().toString(36).substring(7);
    setPlayerId(newPlayerId);
    
    const playerRef = ref(db, `currentGame/players/${newPlayerId}`);
    
    await set(playerRef, {
      nickname,
      team: selectedTeam
    });

    // Remove player when they disconnect
    onDisconnect(playerRef).remove();
  };

  const leaveTeam = async () => {
    if (playerId) {
      const playerRef = ref(db, `currentGame/players/${playerId}`);
      await remove(playerRef);
    }
    setTeam(null);
    setPlayerId(null);
  };

  const handlePull = useCallback(async () => {
    if (!team || isLocked) return;
    
    setBump(team);
    setTimeout(() => setBump(null), 100);

    const pulledKey = keyQueue[0];
    setHistory(prev => [...prev.slice(-1), pulledKey]);
    setKeyQueue(prev => [...prev.slice(1), getRandomKey()]);

    try {
      const scoreRef = ref(db, 'currentGame/score');
      await runTransaction(scoreRef, (currentScore) => {
        const safeCurrentScore = (currentScore || 0);
        return team === 'right' ? safeCurrentScore + 1 : safeCurrentScore - 1;
      });
    } catch (error) {
      console.error("Failed to update score:", error);
    }
  }, [team, isLocked, keyQueue]);

  const handleWrongKey = useCallback(() => {
    if (!team || isLocked) return;

    setWrongKey(true);
    setIsLocked(true);

    const newHearts = hearts - 1;
    setHearts(newHearts);

    setTimeout(() => setWrongKey(false), 200);
    
    setKeyQueue(prev => [...prev.slice(1), getRandomKey()]);

    if (newHearts <= 0) {
      setTimeout(() => {
        setIsLocked(false);
        setHearts(3);
      }, 2500);
    } else {
      setTimeout(() => {
        setIsLocked(false);
      }, 1000);
    }
  }, [team, isLocked, hearts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!team || isLocked) return;

      const pressedKey = e.key.toUpperCase();

      if (KEYS.includes(pressedKey as ValidKey)) {
        e.preventDefault();

        if (pressedKey === currentKey) {
          handlePull();
        } else {
          handleWrongKey();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [team, currentKey, handlePull, handleWrongKey, isLocked]);

  const resetGame = async () => {
    try {
      const gameRef = ref(db, 'currentGame');
      await set(gameRef, {
        score: 0,
        players: {}
      });
    } catch (e) {
      console.error(e);
    }
  };

  const winner = score <= -100 ? 'Team 1 (Left)' : score >= 100 ? 'Team 2 (Right)' : null;

  const teamColorHex = team === 'left' ? '#f43f5e' : '#10b981';

  const leftPlayers = Object.values(players).filter(p => p.team === 'left');
  const rightPlayers = Object.values(players).filter(p => p.team === 'right');

  if (!isJoined) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-screen bg-slate-950 text-white p-8">
        <h1 className="text-4xl font-bold mb-8">Enter nickname</h1>
        <form onSubmit={joinGame} className="flex flex-col gap-4">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="px-6 py-3 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-colors"
            placeholder="Your nickname..."
            autoFocus
          />
          <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors">
            Start Game
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-slate-950 text-white p-8 overflow-hidden">
      <h1 className="text-5xl md:text-6xl font-bold mb-10 tracking-tight text-white/90">
        Ropemaxxing
      </h1>

      {winner ? (
        <div className="text-center">
          <div className="text-6xl md:text-8xl font-bold mb-6 text-yellow-500">
            {winner} Wins!
          </div>
          <button 
            onClick={resetGame} 
            className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl text-lg font-medium transition-all duration-300 border border-white/10"
          >
            Play Again
          </button>
        </div>
      ) : (
        <div className="w-full max-w-4xl flex flex-col items-center gap-10">
          <div className="w-full">
            <div className="flex justify-between text-sm font-medium mb-3 text-slate-400">
              <div className="flex flex-col items-start gap-1">
                <span>Team 1</span>
                <div className="flex flex-wrap gap-1">
                  {leftPlayers.map((p, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded-full">{p.nickname}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span>Team 2</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {rightPlayers.map((p, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">{p.nickname}</span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="relative w-full h-4 bg-slate-800 rounded-full overflow-hidden">
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20 -translate-x-1/2 z-10" />
              
              <div 
                className="absolute top-0 bottom-0 bg-rose-500 transition-all duration-500 ease-out"
                style={{ 
                  right: '50%',
                  width: score < 0 ? `${Math.abs(score) / 2}%` : '0%',
                }}
              />
              
              <div 
                className="absolute top-0 bottom-0 bg-emerald-500 transition-all duration-500 ease-out"
                style={{ 
                  left: '50%',
                  width: score > 0 ? `${score / 2}%` : '0%',
                }}
              />
              
              <div 
                className="absolute top-1/2 w-5 h-5 bg-white rounded-full shadow-lg z-20 transition-all duration-500 ease-out -translate-y-1/2"
                style={{
                  left: `calc(50% + ${score / 2}%)`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>
          </div>

          <div 
            className={`text-8xl md:text-9xl font-bold transition-all duration-200 ${bump ? 'scale-110' : 'scale-100'}`}
            style={{
              color: score > 0 ? '#10b981' : score < 0 ? '#f43f5e' : '#94a3b8',
            }}
          >
            {Math.abs(score)}
          </div>

          {!team ? (
            <div className="flex flex-col sm:flex-row gap-6 w-full justify-center mt-4">
              <button 
                onClick={() => selectTeam('left')}
                className="group px-10 py-6 bg-slate-900 border border-rose-500/30 hover:border-rose-500 rounded-2xl transition-all duration-300 flex-1 max-w-sm"
              >
                <div className="text-2xl font-bold text-rose-500 mb-1">Team 1</div>
                <div className="text-sm text-slate-400">Pull Left</div>
              </button>
              
              <button 
                onClick={() => selectTeam('right')}
                className="group px-10 py-6 bg-slate-900 border border-emerald-500/30 hover:border-emerald-500 rounded-2xl transition-all duration-300 flex-1 max-w-sm"
              >
                <div className="text-2xl font-bold text-emerald-500 mb-1">Team 2</div>
                <div className="text-sm text-slate-400">Pull Right</div>
              </button>
            </div>
          ) : (
            <div className="text-center w-full relative">
              <div className="flex justify-center items-center gap-2 mb-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={`text-2xl transition-all duration-300 ${i < hearts ? 'text-rose-500 scale-100 opacity-100' : 'text-slate-800 scale-75 opacity-30'}`}
                  >
                    ❤️
                  </div>
                ))}
              </div>

              {isLocked && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
                  <div className="px-6 py-3 bg-red-600 text-white rounded-full font-black text-xl animate-pulse shadow-2xl">
                    LOCKED {hearts === 0 ? '2.5s' : '1s'}
                  </div>
                </div>
              )}

              <p className="text-sm text-slate-500 mb-8 uppercase tracking-[0.3em]">
                {nickname} pulling for {team === 'left' ? 'Team 1' : 'Team 2'}
              </p>
              
              <div className="flex items-center justify-center gap-4 md:gap-8 min-h-[160px]">
                <div className="flex gap-3 opacity-30 grayscale items-center">
                  {history.map((key, i) => (
                    <div key={`hist-${i}`} className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg md:text-xl font-bold text-slate-400 scale-90">
                      {key}
                    </div>
                  ))}
                </div>

                <div className="relative flex flex-col items-center mx-4">
                  <div
                    className={`w-24 h-24 md:w-32 md:h-32 rounded-3xl flex items-center justify-center text-4xl md:text-5xl font-black transition-all duration-100 ring-4 ring-offset-4 ring-offset-slate-950
                      ${bump ? 'scale-90 opacity-80' : 'scale-100'}
                      ${isLocked ? 'grayscale opacity-50 ring-slate-800' : (wrongKey ? 'ring-rose-500' : (team === 'left' ? 'ring-rose-500' : 'ring-emerald-500'))}
                    `}
                    style={{
                      backgroundColor: isLocked ? '#1e293b' : teamColorHex,
                      color: 'white',
                      transform: wrongKey ? 'translateX(-8px)' : (isLocked ? 'scale(0.95)' : (bump ? 'scale(0.9)' : 'scale(1.1)')),
                      animation: wrongKey ? 'shake 0.2s ease-in-out' : 'none'
                    }}
                  >
                    {currentKey}
                  </div>
                  <div className={`mt-4 text-xs font-black uppercase tracking-[0.2em] ${wrongKey ? 'text-rose-500' : (isLocked ? 'text-slate-600' : 'text-slate-400')}`}>
                    {wrongKey ? 'MISS!' : (isLocked ? 'WAIT' : 'NOW!')}
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  {keyQueue.slice(1, 4).map((key, i) => (
                    <div 
                      key={`next-${i}`} 
                      className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl md:text-3xl font-bold text-white shadow-lg transition-transform"
                      style={{ opacity: 0.8 - (i * 0.2), transform: `scale(${0.95 - (i * 0.05)})` }}
                    >
                      {key}
                    </div>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={leaveTeam}
                className="mt-12 text-slate-600 hover:text-slate-400 text-xs transition-colors duration-300 uppercase tracking-widest"
              >
                Leave Team
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
