/*
 * @Author: oliver
 * @Date: 2026-01-19 22:28:31
 * @LastEditors: oliver
 * @LastEditTime: 2026-01-19 22:28:33
 * @Description: 
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './global.css'

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)