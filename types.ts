
export interface TarotCardInfo {
  name: string;
  description: string;
  image: string; 
}

export interface TarotCardData extends TarotCardInfo {
  reversed: boolean;
}

export interface Reading {
  past: string;
  present: string;
  future: string;
  clarification?: string;
}

export interface SavedReading {
  reading: Reading;
  drawnCards: TarotCardData[];
  date: string; // YYYY-MM-DD
  walletAddress?: string | null;
  username?: string | null;
}
