import React, { useState, useEffect } from 'react'
import './App.css'
import ChatWindow from './components/ChatWindow'
import ModelSelector from './components/ModelSelector'
import SidebarIntro from './components/SidebarIntro'

function App() {
    const [backendError, setBackendError] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm John's Career Copilot. Ask me anything about John's professional experience, AI projects, or leadership achievements.",
      sender: 'bot',
      model: 'system'
    }
  ])
  const [selectedModel, setSelectedModel] = useState('deepseek')
  const [isLoading, setIsLoading] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)

  // Check backend connectivity on mount (for mobile warning)
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const url = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/ping`;
        const resp = await fetch(url, { method: 'GET' });
        if (!resp.ok) throw new Error('Backend not reachable');
        setBackendError(false);
      } catch (e) {
        setBackendError(true);
      }
    };
    checkBackend();
  }, []);

  const handleSendMessage = async (userMessage) => {
    // Add user message to chat
    const newUserMessage = {
      id: messages.length + 1,
      text: userMessage,
      sender: 'user'
    }
    setMessages([...messages, newUserMessage])
    setIsLoading(true)

    try {
      // Call backend API
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/${selectedModel}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: userMessage,
            reasoning: showReasoning,
            max_tokens: 1024
          })
        }
      )

      const data = await response.json()

      // Check if answer is empty or contains "unable to answer" indicators
      let responseText = data.answer
      const answerLower = (data.answer || '').toLowerCase()
      
      // Detect phrases indicating LLM cannot answer
      const cannotAnswerPhrases = [
        'no information',
        "don't have information",
        'does not have information',
        'unable to',
        'cannot find',
        'no data about',
        'not mentioned',
        'not provided',
        'not available',
        'resume does not',
        'document does not',
        'focuses exclusively'
      ]
      
      const hasNoAnswer = cannotAnswerPhrases.some(phrase => answerLower.includes(phrase))
      
      if (!data.answer || data.error || hasNoAnswer) {
        responseText = "I don't have information to answer that question.\n\nPlease contact John directly:\n📧 Email: haujon001@gmail.com\n\nJohn will be happy to discuss your questions in detail!"
      }

      // Add bot response to chat
      const botMessage = {
        id: messages.length + 2,
        text: responseText,
        sender: 'bot',
        model: data.model,
        latency: data.latency_ms,
        cost: data.cost_estimate,
        reasoning: data.reasoning_summary,
        fallbackUsed: data.fallbackUsed,
        fallbackReason: data.fallbackReason
      }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      const errorMessage = {
        id: messages.length + 2,
        text: "I encountered an issue processing your question.\n\nPlease contact John directly:\n📧 Email: haujon001@gmail.com",
        sender: 'bot',
        model: 'error'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickPrompt = (prompt) => {
    handleSendMessage(prompt)
  }

  return (
    <div className="app">
      <div className="sidebar">
        <SidebarIntro onQuickPrompt={handleQuickPrompt} />
        <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
        <label className="reasoning-toggle">
          <input
            type="checkbox"
            checked={showReasoning}
            onChange={(e) => setShowReasoning(e.target.checked)}
          />
          <span>Show reasoning</span>
        </label>
        {backendError && (
          <div style={{color: '#ffb3b3', background: '#2a1a1a', padding: 8, borderRadius: 8, marginTop: 12, fontSize: 13}}>
            <b>Warning:</b> Unable to connect to backend.<br/>
            If you are on mobile, make sure the backend is deployed and reachable from your device.<br/>
            <span style={{fontSize: 12, opacity: 0.8}}>Localhost will not work on mobile. Use a public or LAN URL.</span>
          </div>
        )}
      </div>
      <ChatWindow 
        messages={messages} 
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  )
}

export default App
