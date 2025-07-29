import { TarotCardData, Reading } from '../types';

const API_BASE_URL = 'http://localhost:3000/api/v1'; // Adjust if your Rails server runs elsewhere

interface User {
  id: number;
  wallet_address: string;
  username: string | null;
  is_verified: boolean;
}

interface TodaysReadingResponse {
  reading: Reading;
  drawnCards: TarotCardData[];
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'An unknown error occurred.' }));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }
  if (response.status === 204) { // No Content
    return null;
  }
  return response.json();
};

export const signIn = async (walletAddress: string, username: string | null): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet_address: walletAddress, username }),
  });
  return handleResponse(response);
};

export const verifyWorldId = async (walletAddress: string, proof: any): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/verify`, {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'X-Wallet-Address': walletAddress
    },
    body: JSON.stringify({ proof }),
  });
  return handleResponse(response);
};

export const getTodaysReading = async (walletAddress: string): Promise<TodaysReadingResponse | null> => {
  const response = await fetch(`${API_BASE_URL}/readings/today`, {
    headers: { 'X-Wallet-Address': walletAddress }
  });
  if (response.status === 404) {
      return null; // This is an expected outcome if no reading exists
  }
  return handleResponse(response);
};

export const createNewReading = async (walletAddress: string, drawnCards: TarotCardData[]): Promise<Reading> => {
  const response = await fetch(`${API_BASE_URL}/readings`, {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'X-Wallet-Address': walletAddress
    },
    body: JSON.stringify({ cards: drawnCards }),
  });
  return handleResponse(response);
};

export const getClarification = async (walletAddress: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/readings/clarification`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Wallet-Address': walletAddress
    },
    body: JSON.stringify({}) // Can add payment proof here in a real scenario
  });
  const data = await handleResponse(response);
  return data.clarification;
};
