# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**宝宝钢琴** - Windows 桌面应用，全屏显示钢琴键盘，单模式（宝宝模式）：
- 随便按就有声：物理键映射 49 键钢琴 (C3-B7 四个八度)，未映射键随机出 C 大调五声音阶
- 全键盘锁定：Rust 钩子吞掉一切按键转发前端出声，系统热键/其他软件快捷键全部失效
- 视觉反馈：琴键按下高亮下压、动物 emoji 跳舞 + 音符上飘
- 能量条满 100 触发鼓励音效（钢琴采样混音合成的 tada/cheer/applause）+ 彩纸飞溅

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

前端通过 `@tauri-apps/api` 的 `invoke()` 调用 Rust 端的 `#[tauri::command]` 函数：
- `exit_app`（TitleBar X 按钮兜底退出）
- `set_keyboard_lock(locked)`（启动即 true；进入锁定时钩子会重装抢回链头，压制后启动的钩子型热键软件）

### 前端（src/）

- `src/` 是 Vite root（不是项目根），路径别名 `@` → `./src`
- `App.tsx` - 主入口，挂载 AppStateProvider/TitleBar/BabyMode，启动即锁键盘
- `state/AppState.tsx` - 全局状态，单 `useReducer` Context（无第三方状态库），仅 PRESS_KEY/RESET_BABY
- `data/piano.ts` - 49 键映射表 (音符 ID / 频率 / 物理键字符 / 采样文件名)
- `audio/AudioEngine.ts` - Web Audio 单例引擎，预加载采样 + Oscillator 回退 + 就绪前待播队列
- `hooks/usePianoKeyboard.ts` - 双通道输入（window keydown + Tauri kb-raw 事件），物理键 → 音符，未映射键随机五声音阶兜底
- `components/PianoKeyboard.tsx` - 49 键展示组件 (29 白键 + 20 黑键叠加)，支持按下高亮反馈
- `components/BabyMode.tsx` - 宝宝模式视图（唯一模式）：能量条/吉祥物/动物跳舞动画/彩纸
- `components/Confetti.tsx` - 彩纸飞溅 (纯 DOM)
- `components/TitleBar.tsx` - 标题栏 + 鼠标退出
- `components/ui/` - Radix UI 基础组件（button, dialog, tabs, select 等，部分未启用）
- `lib/utils.ts` - cn() 工具函数（clsx + tailwind-merge）

### 后端（src-tauri/src/）

| 模块 | 职责 |
|------|------|
| `main.rs` | 应用入口，构建托盘 + 安装键盘钩子 + 暴露 exit_app 命令 |
| `keyboard_hook.rs` | WH_KEYBOARD_LL 低级键盘钩子，专用线程 + GetMessageW 循环 |
| `tray.rs` | 系统托盘菜单（显示/隐藏/退出） |

### 键盘拦截策略

`WH_KEYBOARD_LL` 低级钩子运行在专用线程上，**宝宝模式（LOCK_ALL）吞掉所有按键**，keydown 时把 vkCode 通过 `kb-raw` 事件转发给前端出声。退出前同步卸载（UnhookWindowsHookEx + 等待线程退出），避免 `process::exit` 抢跑。

钩子链注意：LL hook 链后安装者先调用。进入锁定时调用 `reinstall()` 重装钩子抢回链头，可压制后启动的钩子型热键软件（如 Snipaste）；`GetAsyncKeyState` 轮询型热键软件用户态无法拦截（已知限制）。

不使用 `rdev`：Tauri 2 有已知 focus bug (#14770)，原生 winapi 调用更稳。

### 音频策略

- 采样路径：`src-tauri/resources/samples/{NOTE}.mp3` (49 个音符 C3-B7) + `_cheer/{applause,cheer,tada}.mp3` (3 个鼓励音效，由钢琴采样 ffmpeg 混音合成)
- 通过 `convertFileSrc("samples/C4.mp3")` 解析运行时 URL，绕开 Vite root=src 的怪异配置
- `bundle.resources` 字段在 `tauri.conf.json` 中声明，确保打包到安装包
- 加载失败的音符自动回退到 `OscillatorNode` + 频率合成（开发期无采样也能运行）
- AudioContext 就绪前的按键进入待播队列，就绪后补放（不丢弃）

### 物理键映射

49 键覆盖 C3-B7 四个八度；其中 C4-C6 两个八度有物理键，C3-B3 / C7-B7 仅鼠标/触摸点击：

- 八度 4 (z s x d c v g b h n j m) → C4 Cs4 D4 Ds4 E4 F4 Fs4 G4 Gs4 A4 As4 B4
- 八度 5 (q 2 w 3 e t 6 y 7 u 8 i) → C5 Cs5 D5 Ds5 E5 F5 Fs5 G5 Gs5 A5 As5 B5
- C6 (o)
- 未映射的物理键（宝宝模式）→ 随机 C 大调五声音阶 (C3-G6)

### 状态管理

- Rust 端：`lazy_static` + `Mutex<T>` 管理钩子句柄和线程 ID
- React 端：单 `useReducer` Context（无 Redux/Zustand）

## 关键注意事项

- **Windows 专用**：使用 `winapi` crate，`SetWindowsHookExW` 不跨平台
- **Vite root 是 src/**：构建输出到 `../dist`，开发端口 5100
- **窗口配置**：maximized + alwaysOnTop + decorations:false + transparent:false
- **鼠标退出**：Alt+F4 被拦截，退出通道 = TitleBar X 按钮 + 托盘"退出"
- **采样文件**：49 个采样已全部就位（C4-C6 为原始采样，C3-B3/C7-B7 由 ffmpeg 移调合成，鼓励音效由钢琴采样混音合成），无需再手工准备
