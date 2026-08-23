// 落地页入口：在线钢琴 + 产品介绍
import React from 'react'
import ReactDOM from 'react-dom/client'
import { LandingPage } from './LandingPage'
import '../global.css'

ReactDOM.createRoot(document.getElementById('landing')!).render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>,
)
