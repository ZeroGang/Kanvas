# Kanvas 个人财务管理

面向个人用户的财务管理工具，提供投资策略配置、财务分析、历史记录与可视化功能。**Web 面板**采用 Python 标准库 `http.server` 后端 + React 前端技术栈。前端使用 Inter 字体、Phosphor Icons、ECharts、Notyf，支持响应式设计。

---

## 项目特性

- 🌐 **跨平台支持**：桌面端 + 移动端响应式布局
- 📱 **移动端适配**：底部Tab导航，PWA支持，可添加到桌面
- 🎨 **深色/浅色主题**：支持主题切换
- 🌍 **多语言**：支持中文/英文切换
- 📊 **财务分析**：多种计算工具和可视化图表
- 💾 **本地存储**：数据本地持久化，安全便捷

---

## 移动端适配

本项目已支持完整的移动端适配，支持：
- **响应式布局**：自动适应桌面端、平板和手机端自动切换
- **底部Tab导航**：移动端使用现代简洁的导航设计
- **PWA支持**：可添加到桌面，获得类似原生应用的体验
- **安全区域适配**：支持刘海屏、灵动岛等设备

### 移动端特性
- 桌面端：侧边栏导航
- 移动端：顶部标题栏 + 底部Tab导航

---

## 目录结构

```
Kanvas/                    # 项目根目录

├── main.py                 # 根入口：默认 Web；--cli 为命令行
├── server/                 # 后端包（所有后端代码）
│   ├── __init__.py
│   ├── web.py             # Web 后端；固定端口 8100
│   ├── cli.py             # 命令行交互入口
│   ├── api/               # API 处理器
│   ├── core/              # calculator、market、backtest、backtest_store
│   ├── services/          # 业务服务
│   └── paths.py           # project_root、dist_config_dir、dist_excels_dir
├── app/                    # Web 前端
│   ├── dist/               # 运行时持久化（勿通过静态 URL 暴露）
│   │   ├── config/         # JSON：config.json、records.json、saved_backtests.json
│   │   └── excels/        # 行情 CSV：spot_hist_*.csv
│   ├── public/             # 静态资源（PWA支持）
│   │   ├── manifest.json  # PWA配置
│   │   ├── app.png       # 应用图标
│   │   └── favicon.svg    # 网站图标
│   ├── src/                # React 源代码
│   │   ├── components/     # Comp 开头的可复用UI组件
│   │   ├── wins/           # Win 开头的弹窗组件
│   │   ├── pages/          # Win 开头的页面组件
│   │   ├── hooks/          # 自定义 Hooks
│   │   ├── lib/            # 工具库
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── style.css
│   ├── package.json
│   └── vite.config.js      # Vite 配置（代理到后端 8100）
├── CLAUDE.md              # 项目文档
├── CHANGELOG.md           # 更新日志
└── requirements.txt        # pandas、akshare
```

---

## 数据存储架构

### 后端存储（`app/dist/config/` 与 `app/dist/excels/`）
所有业务数据完全由后端管理：

| 路径 | 说明 |
|------|------|
| `app/dist/config/config.json` | 策略参数 |
| `app/dist/config/records.json` | 历史测算记录 |
| `app/dist/config/saved_backtests.json` | 已存回测方案 |
| `app/dist/config/holdings.json` | 持仓数据 |
| `app/dist/excels/spot_hist_*.csv` | 现货行情缓存 |
| `app/dist/excels/spot_instruments_akshare.csv` | AkShare 上金所品种表（`spot_symbol_table_sge`）+ XAU，列 id/label_zh/label_en/unit_zh/unit_en |

`dist_config_dir()` / `dist_excels_dir()` 会创建子目录。若 `app/dist` 根下仍有旧版平铺的 json/csv，启动时会自动迁入对应子目录（不覆盖已有文件）。Web 服务对路径 `/dist/*` 返回 403。

### 前端存储（localStorage）
前端仅存储 UI 偏好数据：

| Key | 说明 |
|-----|------|
| `kanvas_app_lang` | 语言偏好（zh/en） |
| `kanvas_app_theme` | 主题偏好（dark/light） |
| `kanvas_app_page` | 最后访问的页面 |

前端通过 REST API 与后端交互业务数据，不直接操作后端 JSON 文件。

---

## 入口与运行

### 启动步骤
1. **先启动后端**：在项目根目录运行 `python main.py`
2. **再启动前端**：在 `app/` 目录运行 `npm install && npm run dev`
3. **访问应用**：在浏览器中打开显示的地址即可使用
4. **命令行模式**：`python main.py --cli` 或 `python server/cli.py --cli`（可选）

### 开发说明
**重要：修改代码后需要重启服务**

- **修改后端代码**（`server/` 目录下的文件）：
  - 需要停止并重新运行后端：`python main.py`
  - 前端开发服务器会自动热重载，不需要重启

- **修改前端代码**（`app/src/` 目录下的文件）：
  - Vite 开发服务器会自动热重载，无需重启
  - 修改 `index.html`、`style.css`、`vite.config.js` 等配置文件时，可能需要刷新浏览器

- **全部修改完成后**：
  - 建议完全重启前后端以确保所有更改生效
  - 停止现有进程（Ctrl+C），然后重新启动后端和前端

---

## 依赖

### 后端
- **Python 标准库**（含 `http.server`）
- **pandas**、**akshare**（见 `requirements.txt`）

### 前端
- **React 19**
- **Vite**
- **ECharts**（图表）
- **echarts-for-react**（React 组件）
- **Phosphor Icons**（图标）
- **Notyf**（通知）

---

## 开发规范

### 1. 组件规范
- 所有可复用的组件都必须有自己的独立文件和类/函数定义
- 组件命名遵循 `Win`（页面/弹窗）或 `Comp`（可复用UI）前缀规范
- 单一职责原则：每个组件只负责一个功能领域

### 2. 文本国际化（i18n）
- **所有固定文本必须通过 i18n 系统管理**，禁止直接在 JSX 中硬编码文本
- 使用 `t('key')` 函数引用翻译文本
- 翻译键值定义在 `src/lib/i18n-data.js` 中
- 支持中文（zh）和英文（en）双语

### 3. 样式规范
- 使用 CSS 变量定义主题色和间距
- 支持深色/浅色主题切换
- 移动端优先的响应式设计

---

## 前端组件

所有组件均以 `Win` 或 `Comp` 开头，遵循单一职责原则：

### 页面组件（Win 开头）
- `WinAccount`：账户（总资产、资产明细）
- `WinSpot`：市场行情
- `WinHoldings`：工具（各类财务计算工具）
- `WinStrategy`：策略配置
- `WinBacktest`：回测

### 导航顺序
1. **行情** - 市场行情查看
2. **工具** - 各类财务计算工具
3. **策略** - 投资策略配置
4. **回测** - 策略历史回测
5. **账户** - 总资产与资产明细

### 移动端页面
移动端采用底部Tab导航，顺序同上。

### 弹窗组件（Win 开头）
- `WinModal`：通用弹窗容器
- `WinTodayCalc`：定投计算器
- `WinReturnCalc`：收益率计算器
- `WinDrawdownCalc`：回撤率计算器
- `WinCompoundCalc`：复利计算器（含图表）
- `WinLoanCalc`：贷款计算器

### 可复用UI组件（Comp 开头）
- `CompInput`：输入框组件（支持标签、后缀等）
- `CompButton`：按钮组件（支持图标、高亮样式）
- `CompFormGrid`：表单网格布局
- `CompResultBox`：结果展示容器
- `CompResultRow`：结果行组件（支持高亮、颜色）
- `CompIndex`：统一导出入口

---

## 回测页指标说明

- **区间收益率**：期末累计收益 ÷ 期末净投入；期末累计收益 = 期末权益 − 期末净投入。
- **年化收益率（近似）**：按回测内交易日数、252 日/年折算。
- **权益最大回撤**：按每日模拟权益序列计算。
- **期末净投入**：累计买入 − 累计卖出回款。
- **期末累计收益（元）**：期末权益 − 期末净投入。

---

## PWA 使用

本项目支持PWA（渐进式Web应用），可以像原生应用一样添加到桌面使用。

### 如何添加到桌面
1. 在浏览器中打开应用
2. 点击浏览器菜单或地址栏的"添加到主屏幕"或"安装应用"选项
3. 确认添加后，桌面上会出现Kanvas图标

### PWA特性
- 桌面快捷方式
- 全屏运行（无浏览器地址栏）
- 应用图标和启动画面
- 响应式设计

---

## 更新日志

详细的更新记录请查看 [CHANGELOG.md](./CHANGELOG.md)。
