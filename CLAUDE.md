# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**宝宝钢琴** - Windows 桌面应用，全屏显示钢琴键盘，3 种模式：
- **宝宝模式**（默认启动）：随便按就有声，能量条满触发鼓励音效 + 彩纸飞溅
- **教学模式**：5 首儿歌（小星星/两只老虎/生日快乐/欢乐颂/卡农简化版），高亮引导按键
- **大神模式**：自由弹奏，25 键 (C4-C6 两个八度)

## 构建和运行

```bash
pnpm install              # 安装前端依赖
pnpm run tauri dev        # 开发模式（Vite dev server + Tauri 窗口）
pnpm run tauri build      # 生产构建（生成 NSIS/MSI 安装包）
pnpm run dev              # 仅启动前端开发服务器（端口 5100）
```

本地构建也可使用 `build-local.bat`。

## 架构

**Tauri 2 + React 18 + TypeScript + Vite + Rust**

### 前后端通信

前端通过 `@tauri-apps/api` 的 `invoke()` 调用 Rust 端的 `#[tauri::command]` 函数。当前仅有 `exit_app` 命令（TitleBar X 按钮兜底退出）。

### 前端（src/）

- `src/` 是 Vite root（不是项目根），路径别名 `@` → `./src`
- `App.tsx` - 主入口，挂载 AppStateProvider/TitleBar/ModeSwitch/模式路由
- `state/AppState.tsx` - 全局状态，单 `useReducer` Context（无第三方状态库）
- `data/piano.ts` - 25 键映射表 (音符 ID / 频率 / 物理键字符 / 采样文件名)
- `data/songs.ts` - 5 首教学曲库 (SongNote 序列 + 难度 + BPM)
- `audio/AudioEngine.ts` - Web Audio 单例引擎，预加载采样 + Oscillator 回退
- `hooks/usePianoKeyboard.ts` - window keydown 监听，物理键 → 音符
- `components/PianoKeyboard.tsx` - 25 键展示组件 (15 白键 + 10 黑键叠加)
- `components/{BabyMode,TeachMode,ProMode}.tsx` - 三种模式视图
- `components/Confetti.tsx` - 彩纸飞溅 (纯 DOM)
- `components/{ModeSwitch,TitleBar}.tsx` - 模式切换 + 鼠标退出
- `components/ui/` - Radix UI 基础组件（button, dialog, tabs, select 等，部分未启用）
- `lib/utils.ts` - cn() 工具函数（clsx + tailwind-merge）

### 后端（src-tauri/src/）

| 模块 | 职责 |
|------|------|
| `main.rs` | 应用入口，构建托盘 + 安装键盘钩子 + 暴露 exit_app 命令 |
| `keyboard_hook.rs` | WH_KEYBOARD_LL 低级键盘钩子，专用线程 + GetMessageW 循环 |
| `tray.rs` | 系统托盘菜单（显示/隐藏/退出） |

### 键盘拦截策略

`WH_KEYBOARD_LL` 低级钩子运行在专用线程上，拦截以下组合键：
- `Win` (左右键，永远吞)
- `Alt+F4`
- `Alt+Tab`
- `Ctrl+Esc`
- `Win+Tab`

**字母键和数字键透传**到 webview，由前端 JS（`usePianoKeyboard`）映射为钢琴音符。

不使用 `rdev`：Tauri 2 有已知 focus bug (#14770)，原生 winapi 调用更稳。

### 音频策略

- 采样路径：`src-tauri/resources/samples/{NOTE}.mp3` (25 个音符) + `_cheer/{applause,cheer,tada}.mp3` (3 个鼓励音效)
- 通过 `convertFileSrc("samples/C4.mp3")` 解析运行时 URL，绕开 Vite root=src 的怪异配置
- `bundle.resources` 字段在 `tauri.conf.json` 中声明，确保打包到安装包
- 加载失败的音符自动回退到 `OscillatorNode` + 频率合成（开发期无采样也能运行）

### 物理键映射

25 键覆盖 C4-C6，标准两八度钢琴布局：

- 八度 4 (z s x d c v g b h n j m) → C4 Cs4 D4 Ds4 E4 F4 Fs4 G4 Gs4 A4 As4 B4
- 八度 5 (q 2 w 3 e t 6 y 7 u 8 i) → C5 Cs5 D5 Ds5 E5 F5 Fs5 G5 Gs5 A5 As5 B5
- C6 (o)

### 状态管理

- Rust 端：`lazy_static` + `Mutex<T>` 管理钩子句柄和线程 ID
- React 端：单 `useReducer` Context（无 Redux/Zustand）

## 关键注意事项

- **Windows 专用**：使用 `winapi` crate，`SetWindowsHookExW` 不跨平台
- **Vite root 是 src/**：构建输出到 `../dist`，开发端口 5100
- **窗口配置**：maximized + alwaysOnTop + decorations:false + transparent:false
- **鼠标退出**：Alt+F4 被拦截，退出通道 = TitleBar X 按钮 + 托盘"退出"
- **采样文件**：用户需自行从 [musical-artifacts.com](https://musical-artifacts.com) 下载 CC-BY 钢琴采样包，用 Polyphone 导出 25 个单音符 MP3 放入 `src-tauri/resources/samples/`（详见 plan 文件）

## 音频文件准备（用户操作）

musical-artifacts.com 的钢琴采样多为 `.sf2` (SoundFont) 格式，需要：
1. 下载钢琴采样包（推荐 [Real Piano Soundfont #4819](https://musical-artifacts.com/artifacts/4819) 或 CC-BY 标记的钢琴音源）
2. 用 [Polyphone](https://www.polyphone-soundfonts.com/) 拆分出 25 个单音符 (C4, Cs4, D4, Ds4, ... C6)
3. 导出为 MP3 放入 `src-tauri/resources/samples/`
4. 准备 3 个鼓励音效 → `src-tauri/resources/samples/_cheer/{applause,cheer,tada}.mp3`

在采样到位前，应用会自动用 OscillatorNode 合成音色（音色不如真实采样但完全可用）。
