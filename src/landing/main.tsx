// 落地页入口：在线钢琴 + 产品介绍
import React from 'react'
import ReactDOM from 'react-dom/client'
import { LandingPage } from './LandingPage'
import '../global.css'

// 落地页允许滚动/选中文字（覆盖桌面全屏应用的 overflow:hidden）
document.documentElement.classList.add('landing-page')

ReactDOM.createRoot(document.getElementById('landing')!).render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>,
)
