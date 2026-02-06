import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, runTransaction } from 'firebase/database';
import { db } from '../firebase';

type Team = 'left' | 'right' | null;
type ValidKey = 'F' | 'G' | 'H' | 'J';

const KEYS: ValidKey[] = ['F', 'G', 'H', 'J'];

const getRandomKey = (): ValidKey => KEYS[Math.floor(Math.random() * KEYS.length)];

export default function TugOfWar() {
  const [score, setScore] = useState<number>(0);
  const [team, setTeam] = useState<Team>(null);
  const [bump, setBump] = useState<'left' | 'right' | null>(null);
  const [currentKey, setCurrentKey] = useState<ValidKey>(getRandomKey());
  const [wrongKey, setWrongKey] = useState(false);

  // Subscribe to score updates
  useEffect(() => {
    const scoreRef = ref(db, 'currentGame/score');
    const unsubscribe = onValue(scoreRef, (snapshot) => {
      const val = snapshot.val();
      setScore(typeof val === 'number' ? val : 0);
    });

    return () => unsubscribe();
  }, []);

  const handlePull = useCallback(async () => {
    if (!team) return;
    
    // Visual feedback
    setBump(team);
    setTimeout(() => setBump(null), 100);

    // Generate next key
    setCurrentKey(getRandomKey());

    try {
        const scoreRef = ref(db, 'currentGame/score');
        await runTransaction(scoreRef, (currentScore) => {
            const safeCurrentScore = (currentScore || 0);
            if (team === 'right') {
                return safeCurrentScore + 1;
            } else {
                return safeCurrentScore - 1;
            }
        });
    } catch (error) {
      console.error("Failed to update score:", error);
    }
  }, [team]);

  // Handle wrong key - subtract point and randomize key
  const handleWrongKey = useCallback(async () => {
    if (!team) return;
    
    setWrongKey(true);
    setTimeout(() => setWrongKey(false), 200);
    
    // Generate new random key
    setCurrentKey(getRandomKey());

    try {
      const scoreRef = ref(db, 'currentGame/score');
      await runTransaction(scoreRef, (currentScore) => {
        const safeCurrentScore = (currentScore || 0);
        // Opposite direction - penalty
        if (team === 'right') {
          return safeCurrentScore - 1;
        } else {
          return safeCurrentScore + 1;
        }
      });
    } catch (error) {
      console.error("Failed to update score:", error);
    }
  }, [team]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!team) return;
      
      const pressedKey = e.key.toUpperCase();
      
      if (KEYS.includes(pressedKey as ValidKey)) {
        e.preventDefault();
        
        if (pressedKey === currentKey) {
          handlePull();
          setWrongKey(false);
        } else {
          // Wrong key - penalty
          handleWrongKey();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [team, currentKey, handlePull, handleWrongKey]);

  const resetGame = async () => {
      try {
        const scoreRef = ref(db, 'currentGame/score');
        await runTransaction(scoreRef, () => 0);
      } catch (e) {
          console.error(e);
      }
   };

  const winner = score <= -100 ? 'Team 1 (Left)' : score >= 100 ? 'Team 2 (Right)' : null;

  const teamColorHex = team === 'left' ? '#f43f5e' : '#10b981';

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-8 overflow-hidden">
      {/* Header */}
      <h1 className="text-5xl md:text-6xl font-bold mb-10 tracking-tight text-white/90">
        Tug of War
      </h1>
      
      {winner ? (
        <div className="text-center">
          <div className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-amber-400 to-yellow-300 text-transparent bg-clip-text">
            {winner} Wins!
          </div>
          <button 
            onClick={resetGame} 
            className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl text-lg font-medium transition-all duration-300 backdrop-blur-sm border border-white/10"
          >
            Play Again
          </button>
        </div>
      ) : (
        <div className="w-full max-w-4xl flex flex-col items-center gap-10">
          {/* Progress Bar */}
          <div className="w-full">
            <div className="flex justify-between text-sm font-medium mb-3 text-slate-400">
              <span>Team 1</span>
              <span>Team 2</span>
            </div>
            
            <div className="relative w-full h-4 bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-sm">
              {/* Center marker */}
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20 -translate-x-1/2 z-10" />
              
              {/* Left Fill */}
              <div 
                className="absolute top-0 bottom-0 bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-500 ease-out"
                style={{ 
                  right: '50%',
                  width: score < 0 ? `${Math.abs(score) / 2}%` : '0%',
                }}
              />
              
              {/* Right Fill */}
              <div 
                className="absolute top-0 bottom-0 bg-gradient-to-l from-emerald-500 to-emerald-400 transition-all duration-500 ease-out"
                style={{ 
                  left: '50%',
                  width: score > 0 ? `${score / 2}%` : '0%',
                }}
              />
              
              {/* Knot */}
              <div 
                className="absolute top-1/2 w-5 h-5 bg-white rounded-full shadow-lg z-20 transition-all duration-500 ease-out -translate-y-1/2"
                style={{ 
                  left: `calc(50% + ${score / 2}%)`,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 20px rgba(255,255,255,0.4)'
                }}
              />
            </div>
          </div>

          {/* Score */}
          <div 
            className={`text-8xl md:text-9xl font-bold transition-all duration-200 ${bump ? 'scale-110' : 'scale-100'}`}
            style={{ 
              color: score > 0 ? '#10b981' : score < 0 ? '#f43f5e' : '#94a3b8',
            }}
          >
            {Math.abs(score)}
          </div>

          {!team ? (
            /* Team Selection */
            <div className="flex flex-col sm:flex-row gap-6 w-full justify-center mt-4">
              <button 
                onClick={() => setTeam('left')}
                className="group px-10 py-6 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 rounded-2xl transition-all duration-300 flex-1 max-w-sm backdrop-blur-sm"
              >
                <div className="text-2xl font-bold text-rose-400 mb-1">Team 1</div>
                <div className="text-sm text-slate-400 group-hover:text-slate-300">Pull Left</div>
              </button>
              
              <button 
                onClick={() => setTeam('right')}
                className="group px-10 py-6 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-2xl transition-all duration-300 flex-1 max-w-sm backdrop-blur-sm"
              >
                <div className="text-2xl font-bold text-emerald-400 mb-1">Team 2</div>
                <div className="text-sm text-slate-400 group-hover:text-slate-300">Pull Right</div>
              </button>
            </div>
          ) : (
            /* Game Controls */
            <div className="text-center w-full">
              <p className="text-lg text-slate-400 mb-8">
                Playing as{' '}
                <span className={`font-bold ${team === 'left' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {team === 'left' ? 'Team 1' : 'Team 2'}
                </span>
              </p>
              
              {/* Key Prompt */}
              <div className="mb-8">
                <p className="text-slate-500 text-sm mb-4 uppercase tracking-widest">Press the key</p>
                <div className="flex justify-center gap-4">
                  {KEYS.map((key) => {
                    const isActive = key === currentKey;
                    const isPressed = isActive && bump;
                    const isWrong = isActive && wrongKey;
                    
                    return (
                      <div
                        key={key}
                        className={`w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center text-2xl md:text-3xl font-bold transition-all duration-200
                          ${isActive ? 'text-white scale-110' : 'bg-slate-800/50 text-slate-600 border border-slate-700/50'}
                          ${isPressed ? 'scale-95' : ''}
                        `}
                        style={isActive ? { 
                          backgroundColor: teamColorHex,
                          boxShadow: `0 10px 40px ${teamColorHex}40`,
                          transform: isPressed ? 'scale(0.95)' : isWrong ? 'translateX(-4px)' : 'scale(1.1)',
                          animation: isWrong ? 'shake 0.2s ease-in-out' : 'none'
                        } : {}}
                      >
                        {key}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <button 
                onClick={() => setTeam(null)}
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors duration-300"
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
