# Kanvas React Frontend

## 启动方式

```bash
cd app
npm install
npm run dev
```

## 构建生产版本

```bash
npm run build
```

## 注意

- 后端仍然使用 Python，需要在另一个终端运行 `python main.py`（在项目根目录）
- 后端固定端口为 **8100**
- React 开发服务器配置了代理，会将 `/api` 等请求转发到 Python 后端 8100 端口
- 开发时访问浏览器显示的地址（通常是 `http://127.0.0.1:5173`）

## 目录结构

```
src/
├── components/    # 可复用UI组件（以Comp开头）
├── wins/          # 弹窗组件（以Win开头）
├── pages/         # 页面组件（以Win开头）
├── hooks/         # 自定义 Hooks
├── lib/           # 工具库
├── App.jsx
└── main.jsx
```

## 数据存储架构

### 后端存储（业务数据）
所有业务数据由后端 Python 服务管理：
- 策略配置、回测方案、持仓数据、历史记录等
- 存储位置：`../app/dist/config/` 和 `../app/dist/excels/`
- 访问方式：通过 REST API（`/api/*` 端点）

### 前端存储（UI偏好）
前端仅存储界面偏好到 localStorage：
- `kanvas_app_lang` - 语言
- `kanvas_app_theme` - 主题
- `kanvas_app_page` - 最后访问页面

## 组件命名

- 所有页面和弹窗组件均以 `Win` 开头
- 所有可复用UI组件均以 `Comp` 开头
- 遵循单一职责原则
