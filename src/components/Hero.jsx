import React from 'react'
import { useTheme } from '../context/ThemeContext'
import './Hero.css'

function Hero() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="hero-header">
      <div className="hero-container">
        <div className="hero-top">
          <div>
            <h1>🤖 John's Career Copilot</h1>
            <p className="hero-subtitle">
              Explore John Hau's leadership, achievements, and AI innovation through an interactive AI assistant.
            </p>
          </div>
          <div className="hero-links">
            <button 
              onClick={toggleTheme} 
              className="hero-link theme-toggle"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>
            <a href="https://www.linkedin.com/in/john-hau/" target="_blank" rel="noopener noreferrer" className="hero-link">
              💼 LinkedIn
            </a>
            <a href="mailto:haujon001@gmail.com" className="hero-link">
              📧 Email
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Hero
