
import React from 'react';
import { Reading } from '../types';

interface ReadingDisplayProps {
  reading: Reading;
  onGetClarification: () => void;
  isPaying: boolean;
}

const ReadingSection: React.FC<{ title: string; text: string }> = ({ title, text }) => (
    <div className="bg-white/5 p-6 rounded-lg shadow-xl backdrop-blur-sm border border-white/10 mb-6 transition-all duration-500 hover:bg-white/10 hover:shadow-amber-400/10">
      <h2 className="font-cinzel text-2xl font-bold text-amber-300 mb-3">{title}</h2>
      <p className="text-gray-200 leading-relaxed">{text}</p>
    </div>
);

const ReadingDisplay: React.FC<ReadingDisplayProps> = ({ reading, onGetClarification, isPaying }) => {
  return (
    <div className="w-full max-w-3xl mt-4 animate-fade-in">
        <ReadingSection title="The Past" text={reading.past} />
        <ReadingSection title="The Present" text={reading.present} />
        <ReadingSection title="The Future" text={reading.future} />

        {reading.clarification ? (
            <ReadingSection title="Clarification" text={reading.clarification} />
        ) : (
            <div className="text-center mt-6">
                <button
                    onClick={onGetClarification}
                    disabled={isPaying}
                    className="font-cinzel bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPaying ? 'Processing...' : 'Get Clarification (0.1 WLD)'}
                </button>
            </div>
        )}
    </div>
  );
};

export default ReadingDisplay;
