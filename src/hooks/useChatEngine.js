/**
 * useChatEngine.js — React hook for multi-LLM API orchestration
 */

import { useState } from 'react';

export function useChatEngine() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async (question, model, showReasoning = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use relative URL in production (works through Caddy reverse proxy)
      // Use VITE_BACKEND_URL in development (localhost:3000)
      const isDevelopment = import.meta.env.MODE === 'development';
      const baseUrl = isDevelopment 
        ? (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000')
        : '';  // Empty string = relative URLs (/api/*)
      
      const endpoint = `${baseUrl}/api/${model}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          reasoning: showReasoning,
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { sendMessage, isLoading, error };
}
