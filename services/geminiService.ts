
import { GoogleGenAI, Type } from "@google/genai";
import { TarotCardData, Reading } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const readingSchema = {
    type: Type.OBJECT,
    properties: {
      past: {
        type: Type.STRING,
        description: "Interpretation of the first card, representing the querent's past influences."
      },
      present: {
        type: Type.STRING,
        description: "Interpretation of the second card, representing the querent's current situation."
      },
      future: {
        type: Type.STRING,
        description: "Interpretation of the third card, representing the potential outcome or future influences."
      },
    },
    required: ["past", "present", "future"]
};

export const getReading = async (cards: TarotCardData[]): Promise<Reading> => {
  if (cards.length !== 3) {
    throw new Error('A three-card reading requires exactly three cards.');
  }

  const cardDescriptions = cards.map((card, index) => {
    const position = ['Past', 'Present', 'Future'][index];
    const orientation = card.reversed ? 'Reversed' : 'Upright';
    return `${position}: ${card.name} (${orientation}) - ${card.description}`;
  }).join('\n');

  const prompt = `
    You are a mystical and insightful tarot reader. 
    A querent has drawn three cards for a past, present, and future reading.
    Provide a concise, yet profound, interpretation of each card in its respective position.
    Connect the cards into a coherent narrative about the querent's journey.
    Keep each section (past, present, future) to 2-3 sentences.
    
    The drawn cards are:
    ${cardDescriptions}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: readingSchema,
        temperature: 0.8,
      }
    });

    if (!response.text) {
        throw new Error("Received an empty response from the API.");
    }
    
    const reading: Reading = JSON.parse(response.text);
    return reading;

  } catch (error) {
    console.error("Error fetching reading from Gemini API:", error);
    throw new Error("Failed to communicate with the spiritual realm. Please try again.");
  }
};

export const getClarification = async (cards: TarotCardData[]): Promise<string> => {
    const cardDescriptions = cards.map((card, index) => {
        const position = ['Past', 'Present', 'Future'][index];
        const orientation = card.reversed ? 'Reversed' : 'Upright';
        return `${position}: ${card.name} (${orientation})`;
    }).join('\n');

    const prompt = `
        Based on the following three-card tarot spread, provide a single, focused piece of advice or clarification for the querent. 
        This should be a profound, empowering message that synthesizes the energy of the three cards into one actionable insight.
        Keep the response to 2-4 sentences.

        The spread:
        ${cardDescriptions}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.9,
            }
        });
        
        if (!response.text) {
            throw new Error("Received an empty response for clarification.");
        }
        
        return response.text;

    } catch (error) {
        console.error("Error fetching clarification from Gemini API:", error);
        throw new Error("The ether is cloudy. Clarification could not be found.");
    }
};
