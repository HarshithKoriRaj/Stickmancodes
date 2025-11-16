
import { GoogleGenAI } from "@google/genai";

export const getHint = async (): Promise<string> => {
  try {
    // FIX: Initialize GoogleGenAI with API key directly from environment variable.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `You are an AI assistant for a coding game. The user needs to write a JavaScript for-loop to control how many times a 'throwWater()' function is called to extinguish a fire. Generate a simple, classic for-loop that throws between 10 and 25 times. Provide ONLY the code snippet inside a javascript markdown block. The comment inside the loop should be '{ throwWater(); }'. Example: for (let i = 0; i < 15; i++) { throwWater(); }`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "// Sorry, I couldn't generate a hint right now.\n// Please check your API key and network connection.";
  }
};
