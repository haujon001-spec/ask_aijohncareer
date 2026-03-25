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
      // Use relative URL - works in both dev and production
      const endpoint = `/api/${model}`;
      const requestBody = {
        question,
        reasoning: showReasoning,
        max_tokens: 1024
      };

      console.log('📤 [useChatEngine] Sending request:');
      console.log('   Endpoint:', endpoint);
      console.log('   Model:', model);
      console.log('   Body:', requestBody);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 [useChatEngine] Response received:');
      console.log('   Status:', response.status, response.statusText);
      console.log('   Headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [useChatEngine] API error response:', errorText);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ [useChatEngine] Parsed response:', data);
      return data;
    } catch (err) {
      console.error('❌ [useChatEngine] Error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { sendMessage, isLoading, error };
}
