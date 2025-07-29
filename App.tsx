import React, { useState, useCallback, useEffect } from 'react';
import { TarotCardData, Reading } from './types';
import { TAROT_DECK } from './constants';
import * as apiService from './services/apiService';
import TarotCard from './components/TarotCard';
import ReadingDisplay from './components/ReadingDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import { MiniKit, VerificationLevel, PayCommandInput, Tokens, tokenToDecimals } from '@worldcoin/minikit-js';

const App: React.FC = () => {
  const [drawnCards, setDrawnCards] = useState<TarotCardData[]>([]);
  const [reading, setReading] = useState<Reading | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'initial' | 'drawn' | 'reading' | 'finished'>('initial');
  const [flippedCards, setFlippedCards] = useState<boolean[]>([false, false, false]);
  
  const [isMiniKit, setIsMiniKit] = useState(false);
  const [authState, setAuthState] = useState<'unauthenticated' | 'authenticating' | 'authenticated'>('unauthenticated');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isPaying, setIsPaying] = useState<boolean>(false);

  useEffect(() => {
    MiniKit.install();
    setIsMiniKit(MiniKit.isInstalled());
  }, []);
  
  const checkTodaysReading = useCallback(async (address: string) => {
    setIsLoading(true);
    try {
      const data = await apiService.getTodaysReading(address);
      if (data && data.reading) {
        setReading(data.reading);
        setDrawnCards(data.drawnCards);
        setGameState('finished');
        setFlippedCards([true, true, true]);
        setIsVerified(true);
      }
    } catch (e: any) {
      if (e.message.includes('404')) {
        // No reading for today, which is fine.
      } else {
        console.error("Failed to check today's reading:", e);
        setError("Could not check for an existing reading. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);


  const handleSignIn = async () => {
    if (!isMiniKit) return;
    setAuthState('authenticating');
    setError(null);
    try {
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce: `tarot-login-${Date.now()}`
      });

      if (finalPayload.status === 'success') {
        const user = await apiService.signIn(finalPayload.address, MiniKit.user.username);
        setWalletAddress(user.wallet_address);
        setUsername(user.username);
        setIsVerified(user.is_verified);
        setAuthState('authenticated');
        if (user.is_verified) {
           await checkTodaysReading(user.wallet_address);
        }
      } else {
        throw new Error(finalPayload.error_code || 'Wallet authentication failed.');
      }
    } catch (e: any) {
      console.error("Sign-in failed:", e);
      setError("Could not sign in with wallet. Please try again.");
      setAuthState('unauthenticated');
    }
  };


  const handleVerification = async () => {
    if (!walletAddress) return;
    setIsVerifying(true);
    setError(null);
    try {
      const { finalPayload } = await MiniKit.commandsAsync.verify({
        action: 'daily_tarot_reading',
        verification_level: VerificationLevel.Orb,
      });

      if (finalPayload.status === 'success') {
        await apiService.verifyWorldId(walletAddress, finalPayload);
        setIsVerified(true);
      } else {
        throw new Error(finalPayload.error_code || 'Verification was not successful.');
      }
    } catch (e: any) {
      console.error("Verification failed:", e);
      setError("World ID verification failed. You may have already verified for this action.");
    } finally {
      setIsVerifying(false);
    }
  };

  const shuffleAndDraw = useCallback(() => {
    setError(null);
    setReading(null);
    setDrawnCards([]);
    setFlippedCards([false, false, false]);
    setGameState('initial');
    const shuffled = [...TAROT_DECK].sort(() => 0.5 - Math.random());
    const newDrawnCards = shuffled.slice(0, 3).map(card => ({
      ...card,
      reversed: Math.random() > 0.5,
    }));
    setDrawnCards(newDrawnCards);
    setGameState('drawn');
  }, []);

  useEffect(() => {
    if (gameState === 'drawn' && drawnCards.length === 3) {
      const timers = [
        setTimeout(() => setFlippedCards(prev => [true, prev[1], prev[2]]), 500),
        setTimeout(() => setFlippedCards(prev => [prev[0], true, prev[2]]), 1000),
        setTimeout(() => setFlippedCards(prev => [prev[0], prev[1], true]), 1500),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [gameState, drawnCards]);

  const fetchReading = useCallback(async () => {
    if (drawnCards.length < 3 || !walletAddress) return;
    setIsLoading(true);
    setError(null);
    setGameState('reading');
    try {
      const result = await apiService.createNewReading(walletAddress, drawnCards);
      setReading(result);
      setGameState('finished');
    } catch (e) {
      console.error(e);
      setError('Failed to get your reading. The stars may not be aligned. Please try again.');
      setGameState('initial');
    } finally {
      setIsLoading(false);
    }
  }, [drawnCards, walletAddress]);

  const handleGetClarification = async () => {
    if (!walletAddress) return;
    setIsPaying(true);
    setError(null);
    try {
       const payload: PayCommandInput = {
        reference: `tarot-clarification-${walletAddress}-${Date.now()}`,
        to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        tokens: [{
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(0.1, Tokens.WLD).toString(),
        }],
        description: "Premium Tarot Clarification",
      };
      const { finalPayload } = await MiniKit.commandsAsync.pay(payload);
      if (finalPayload.status === 'success') {
        const clarificationText = await apiService.getClarification(walletAddress);
        setReading(prev => prev ? { ...prev, clarification: clarificationText } : null);
      } else {
        throw new Error(finalPayload.error_code || 'Payment was not successful.');
      }
    } catch(e: any) {
      console.error("Payment/Clarification failed:", e);
      setError("Payment failed. Could not get clarification.");
    } finally {
      setIsPaying(false);
    }
  };

  const resetForNewDay = () => {
    setDrawnCards([]);
    setReading(null);
    setFlippedCards([false, false, false]);
    setGameState('initial');
    setError(null);
    if(isMiniKit && walletAddress && isVerified) {
        checkTodaysReading(walletAddress);
    }
  };
  
  const renderInitialView = () => (
    <div className="text-center p-8 border-2 border-dashed border-white/20 rounded-lg">
        <p className="font-cinzel text-xl text-amber-200">The cards await your command.</p>
    </div>
  );

  const renderCardView = () => (
    <div className="grid grid-cols-3 gap-4 sm:gap-8 w-full max-w-md sm:max-w-xl">
      {drawnCards.map((card, index) => (
        <TarotCard key={index} card={card} isFlipped={flippedCards[index]} />
      ))}
    </div>
  );

  const renderActionButtons = () => {
    if (gameState === 'finished') return null;

    if (!isMiniKit) {
      if (gameState === 'initial') return <button onClick={shuffleAndDraw} className="font-cinzel bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105">Draw Three Cards (Browser Mode)</button>;
      if (gameState === 'drawn' && flippedCards[2] && !isLoading) return <button onClick={() => alert("Please implement a non-World ID reading flow for browser mode.")} className="font-cinzel bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 animate-pulse">Reveal My Fate</button>;
      return null;
    }

    if (authState !== 'authenticated') return <button onClick={handleSignIn} disabled={authState === 'authenticating'} className="font-cinzel bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">Sign In with Wallet</button>;
    if (!isVerified) return <button onClick={handleVerification} disabled={isVerifying} className="font-cinzel bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">Verify with World ID</button>;
    if (gameState === 'initial') return <button onClick={shuffleAndDraw} className="font-cinzel bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105">Draw Three Cards</button>;
    if (gameState === 'drawn' && flippedCards[2] && !isLoading) return <button onClick={fetchReading} className="font-cinzel bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 animate-pulse">Reveal My Fate</button>;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-black text-white p-4 sm:p-8 flex flex-col items-center">
      <header className="text-center mb-8 w-full">
        <h1 className="font-cinzel text-4xl sm:text-6xl font-bold text-amber-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">Gemini Tarot</h1>
        <p className="text-gray-300 mt-2 text-lg">Unveil the mysteries of your path.</p>
        
        {!isMiniKit && <p className="text-sm text-cyan-300 mt-4 p-2 bg-cyan-900/50 rounded-md">Note: Running in browser mode. Open in World App for the full experience.</p>}

        {isMiniKit && authState === 'authenticated' && (
          <p className="text-gray-400 mt-2 text-sm truncate">
            Welcome, {username || (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Seeker')}
          </p>
        )}
      </header>
      
      <main className="flex flex-col items-center w-full max-w-5xl">
        <div className="h-64 sm:h-96 w-full flex justify-center items-center my-4">
          {gameState === 'initial' && !reading && renderInitialView()}
          {drawnCards.length > 0 && renderCardView()}
        </div>
        
        <div className="my-8 h-20 flex flex-col items-center justify-center">
            {renderActionButtons()}
            {(isLoading || isVerifying || authState === 'authenticating' || isPaying) && <LoadingSpinner />}
            {error && <p className="text-red-400 text-center mt-4">{error}</p>}
        </div>

        {reading && gameState === 'finished' && (
            <>
                <ReadingDisplay 
                    reading={reading} 
                    onGetClarification={handleGetClarification}
                    isPaying={isPaying}
                />
                 <button
                    onClick={resetForNewDay}
                    className="mt-8 font-cinzel bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105"
                >
                    New Reading
                </button>
            </>
        )}
      </main>
      
      <footer className="mt-auto pt-8 text-center text-gray-500 text-sm">
        <p>Tarot readings are for entertainment purposes only.</p>
        <p>&copy; {new Date().getFullYear()} Gemini Tarot. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
