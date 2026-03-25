import React, { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import './ChatWindow.css'

function ChatWindow({ messages, onSendMessage, isLoading }) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input)
      setInput('')
    }
  }

  return (
    <div className="chat-window">
      <div className="messages-container">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="message-bubble bot">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about John's experience..."
          disabled={isLoading}
          className="message-input"
        />
        <button type="submit" disabled={isLoading} className="send-button">
          Send
        </button>
      </form>
    </div>
  )
}

export default ChatWindow
