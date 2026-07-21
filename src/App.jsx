import React, { useState, useEffect } from 'react'
import './App.css'
import Hero from './components/Hero'
import ChatWindow from './components/ChatWindow'
import ModelSelector from './components/ModelSelector'
import SidebarIntro from './components/SidebarIntro'
import TabBar from './components/TabBar'
import JDPortal from './components/JDPortal/JDPortal'

function App() {
    const [activeTab, setActiveTab] = useState('chat')
    const [backendError, setBackendError] = useState(false)
  
  // Model name mapping for display
  const modelNames = {
    deepseek: 'Gemini 3.1 Flash Lite',
    nemotron: 'DeepSeek R1'
  }
  
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
        // Use relative URL - works in both dev and production
        const url = '/api/health';
        console.log('🔍 [App] Checking backend at:', url);
        const resp = await fetch(url, { method: 'GET' });
        console.log('✅ [App] Backend health check response:', resp.status);
        if (!resp.ok) throw new Error('Backend not reachable');
        setBackendError(false);
      } catch (e) {
        console.error('❌ [App] Backend health check failed:', e);
        setBackendError(true);
      }
    };
    checkBackend();
  }, []);

  const handleSendMessage = async (userMessage) => {
    console.log('📝 [App] User message:', userMessage);
    console.log('📝 [App] Selected model:', selectedModel);
    
    // Add user message to chat
    const newUserMessage = {
      id: messages.length + 1,
      text: userMessage,
      sender: 'user'
    }
    setMessages([...messages, newUserMessage])
    setIsLoading(true)

    try {
      // Use relative URL - works in both dev and production
      const endpoint = `/api/${selectedModel}`;
      const requestPayload = {
        question: userMessage,
        reasoning: showReasoning,
        max_tokens: 1024
      };

      console.log('🚀 [App] Sending request to backend:');
      console.log('   Endpoint:', endpoint);
      console.log('   Payload:', requestPayload);

      // Call backend API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      console.log('📥 [App] Response received:');
      console.log('   Status:', response.status, response.statusText);
      console.log('   Content-Type:', response.headers.get('content-type'));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [App] HTTP error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      console.log('✅ [App] Parsed response:', {
        model: data.model,
        answerLength: data.answer?.length,
        latency: data.latency_ms,
        cost: data.cost_estimate,
        error: data.error
      });

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
        console.warn('⚠️ [App] No valid answer from LLM. Error:', data.error, 'HasNoAnswer:', hasNoAnswer);
        responseText = "I don't have information to answer that question.\n\nPlease contact John directly:\n📧 Email: haujon001@gmail.com\n\nJohn will be happy to discuss your questions in detail!"
      }

      // Add bot response to chat
      const botMessage = {
        id: messages.length + 2,
        text: responseText,
        sender: 'bot',
        model: data.model,
        displayModel: modelNames[selectedModel] || data.model,
        latency: data.latency_ms,
        cost: data.cost_estimate,
        reasoning: data.reasoning_summary,
        fallbackUsed: data.fallbackUsed,
        fallbackReason: data.fallbackReason
      }
      setMessages(prev => [...prev, botMessage])
      console.log('✅ [App] Message added to chat');
    } catch (error) {
      console.error('❌ [App] Error in handleSendMessage:', error);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
      
      const errorMessage = {
        id: messages.length + 2,
        text: `I encountered an issue processing your question: ${error.message}\n\nPlease contact John directly:\n📧 Email: haujon001@gmail.com`,
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
    <div className="app-container">
      <Hero />
      <TabBar
        tabs={[
          { id: 'chat', label: '💬 Chat' },
          { id: 'jdPortal', label: '📋 JD Portal' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />
      {activeTab === 'chat' && (
        <div className="app">
          <div className="sidebar">
            <SidebarIntro onQuickPrompt={handleQuickPrompt} />
            <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
            <label className="reasoning-toggle" title={selectedModel === 'nemotron' ? 'Show extended reasoning' : 'Only available with DeepSeek R1'}>
              <input
                type="checkbox"
                checked={showReasoning}
                onChange={(e) => setShowReasoning(e.target.checked)}
                disabled={selectedModel !== 'nemotron'}
              />
              <span>Show reasoning {selectedModel !== 'nemotron' ? '(DeepSeek only)' : ''}</span>
            </label>
            {backendError && (
              <div style={{color: '#b91c1c', background: '#fee2e2', padding: 8, borderRadius: 8, marginTop: 12, fontSize: 13}}>
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
      )}
      {activeTab === 'jdPortal' && <JDPortal />}
    </div>
  )
}

export default App
