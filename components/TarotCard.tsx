import React from 'react';
import { TarotCardData } from '../types';

interface TarotCardProps {
  card: TarotCardData;
  isFlipped: boolean;
}

const TarotCard: React.FC<TarotCardProps> = ({ card, isFlipped }) => {
  const cardImage = `/images/cards/${card.image}`;
  const cardBackImage = '/images/cards/back.jpg';

  return (
    <div className={`card-container w-full h-full ${isFlipped ? 'flipped' : ''}`}>
      <div className="card-inner">
        {/* Card Back */}
        <div className="card-back overflow-hidden shadow-lg shadow-black/50">
          <img src={cardBackImage} alt="Card Back" className="w-full h-full object-cover" />
        </div>
        
        {/* Card Front */}
        <div className="card-front bg-gray-800 border-2 border-amber-300/50 shadow-lg shadow-amber-400/20 flex flex-col justify-between p-2">
            <img 
                src={cardImage} 
                alt={card.name} 
                className={`w-full h-4/5 object-cover rounded-sm transition-transform duration-500 ${card.reversed ? 'rotate-180' : ''}`} 
            />
            <div className="text-center mt-1">
                <p className="font-cinzel text-xs sm:text-sm font-bold text-amber-200">{card.name}</p>
                {card.reversed && <p className="text-xs text-gray-400">(Reversed)</p>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default TarotCard;