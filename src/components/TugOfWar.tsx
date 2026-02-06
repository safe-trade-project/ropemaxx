import { useState, useEffect } from 'react';
import { ref, onValue, runTransaction } from 'firebase/database';
// import { httpsCallable } from 'firebase/functions';
import { db } from '../firebase';

type Team = 'left' | 'right' | null;

export default function TugOfWar() {
  const [score, setScore] = useState<number>(0);
  const [team, setTeam] = useState<Team>(null);
  const [bump, setBump] = useState<'left' | 'right' | null>(null);

  // Subscribe to score updates
  useEffect(() => {
    const scoreRef = ref(db, 'currentGame/score');
    const unsubscribe = onValue(scoreRef, (snapshot) => {
      const val = snapshot.val();
      setScore(typeof val === 'number' ? val : 0);
    });

    return () => unsubscribe();
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && team) {
        e.preventDefault();
        handlePull();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [team]);

  const handlePull = async () => {
    if (!team) return;
    
    // Visual feedback
    setBump(team);
    setTimeout(() => setBump(null), 100);

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
  };

  const resetGame = async () => {
      try {
        const scoreRef = ref(db, 'currentGame/score');
        await runTransaction(scoreRef, () => 0);
      } catch (e) {
          console.error(e);
      }
   };

  const winner = score <= -100 ? 'Team 1 (Left)' : score >= 100 ? 'Team 2 (Right)' : null;

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-gray-900 text-white p-4 overflow-hidden">
      <h1 className="text-6xl font-black mb-12 tracking-tighter uppercase italic bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 text-transparent bg-clip-text">
        Tug of War
      </h1>
      
      {winner ? (
        <div className="text-center mb-8 animate-bounce">
          <h2 className="text-7xl font-extrabold text-yellow-400 mb-4 drop-shadow-lg">{winner} Wins!</h2>
          <p className="text-2xl text-gray-300">
            <button onClick={resetGame} className="underline hover:text-white cursor-pointer">
                Restart Game
            </button>
          </p>
        </div>
      ) : (
        <div className="w-full max-w-6xl flex flex-col items-center">
          {/* Progress Bar Container */}
          <div className="w-full mb-16 relative">
             <div className="flex justify-between text-4xl font-bold mb-4 font-mono">
                <span className="text-red-500">-100</span>
                <span className="text-green-500">100</span>
             </div>
             
             <div className="relative w-full h-16 bg-gray-800 rounded-full overflow-hidden border-4 border-gray-700 shadow-2xl">
                {/* Center marker */}
                <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white opacity-30 -translate-x-1/2 z-10"></div>
                
                {/* Left Fill */}
                <div 
                    className="absolute top-0 bottom-0 bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300 ease-out"
                    style={{ 
                        right: '50%',
                        width: score < 0 ? `${Math.abs(score) / 2}%` : '0%',
                    }}
                />
                
                {/* Right Fill */}
                <div 
                    className="absolute top-0 bottom-0 bg-gradient-to-l from-green-600 to-green-400 transition-all duration-300 ease-out"
                    style={{ 
                        left: '50%',
                        width: score > 0 ? `${score / 2}%` : '0%',
                    }}
                />
                
                {/* The Rope/Knot */}
                <div 
                    className="absolute top-0 bottom-0 w-4 bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)] z-20 transition-all duration-300 ease-out"
                    style={{ 
                        left: `calc(50% + ${score / 2}%)`,
                        transform: 'translateX(-50%)'
                    }}
                />
             </div>
          </div>

          <div className={`text-9xl font-black mb-16 transition-transform duration-100 ${bump ? 'scale-110' : 'scale-100'}`} 
               style={{ color: score > 0 ? '#4ade80' : score < 0 ? '#f87171' : 'white', textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            {score}
          </div>

          {!team ? (
            <div className="flex flex-col md:flex-row gap-8 w-full justify-center">
              <button 
                onClick={() => setTeam('left')}
                className="group relative px-12 py-8 bg-red-600 hover:bg-red-700 rounded-2xl transition-all hover:scale-105 shadow-xl hover:shadow-red-900/50 flex-1 max-w-md"
              >
                <div className="text-4xl font-black mb-2">TEAM 1</div>
                <div className="text-xl opacity-80 group-hover:opacity-100">PULL LEFT (Decrement)</div>
              </button>
              
              <div className="flex items-center justify-center text-2xl font-bold text-gray-500">VS</div>
              
              <button 
                onClick={() => setTeam('right')}
                className="group relative px-12 py-8 bg-green-600 hover:bg-green-700 rounded-2xl transition-all hover:scale-105 shadow-xl hover:shadow-green-900/50 flex-1 max-w-md"
              >
                <div className="text-4xl font-black mb-2">TEAM 2</div>
                <div className="text-xl opacity-80 group-hover:opacity-100">PULL RIGHT (Increment)</div>
              </button>
            </div>
          ) : (
            <div className="text-center w-full max-w-3xl">
              <p className="text-3xl mb-8 font-light">
                You are pulling for <span className={`font-black ${team === 'left' ? 'text-red-500' : 'text-green-500'}`}>
                  {team === 'left' ? 'TEAM 1' : 'TEAM 2'}
                </span>
              </p>
              
              <div 
                className={`p-12 border-8 border-dashed rounded-3xl bg-gray-800 transition-all duration-100 transform cursor-pointer select-none
                  ${team === 'left' ? 'border-red-500/30' : 'border-green-500/30'}
                  ${bump === team ? 'scale-95 bg-gray-700 border-opacity-100' : 'scale-100 hover:bg-gray-750'}
                `}
                onClick={handlePull}
              >
                <p className="text-6xl font-black mb-4">PRESS SPACE</p>
                <p className="text-2xl text-gray-400">or click here to PULL!</p>
              </div>
              
              <button 
                onClick={() => setTeam(null)}
                className="mt-12 text-gray-500 hover:text-white underline text-lg transition-colors"
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
