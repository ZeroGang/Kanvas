# Kanvas 项目说明

面向黄金定投策略的参数配置、历史记录与可视化。**Web 面板**与 [CCDash](https://github.com/zihenghe04/CCDash) 同类技术栈（Python 标准库 `http.server` + `app/` 静态页：Inter 字体、Phosphor Icons、ApexCharts、Notyf、侧栏布局）。行情拉取依赖 **AkShare** 与 **pandas**。

---

## 目录结构

```
Kanvas/                    # 本地目录名可仍为 Gold 等，不影响运行

├── main.py                 # 根入口：默认 Web；--cli 为命令行
├── server.py               # Web 后端；端口由系统分配（绑定 0）
├── app/                    # Web 前端
│   ├── dist/               # 运行时持久化（勿通过静态 URL 暴露）
│   │   ├── config/         # JSON：config.json、records.json、saved_backtests.json
│   │   └── excels/        # 行情 CSV：spot_hist_*.csv
│   ├── index.html
│   ├── favicon.svg
│   ├── js/                 # ES Module
│   └── style.css
├── PROJECT.md
├── scripts/
│   ├── paths.py            # project_root、dist_config_dir、dist_excels_dir
│   ├── main.py             # 仅 --cli 命令行交互
│   └── core/               # calculator、market、backtest、backtest_store
└── requirements.txt        # pandas、akshare
```

---

## 持久化（`app/dist/config/` 与 `app/dist/excels/`）

| 路径 | 说明 |
|------|------|
| `app/dist/config/config.json` | 策略参数 |
| `app/dist/config/records.json` | 历史测算记录 |
| `app/dist/config/saved_backtests.json` | 已存回测方案 |
| `app/dist/excels/spot_hist_*.csv` | 现货行情缓存 |
| `app/dist/excels/spot_instruments_akshare.csv` | AkShare 上金所品种表（`spot_symbol_table_sge`）+ XAU，列 id/label_zh/label_en/unit_zh/unit_en |

`dist_config_dir()` / `dist_excels_dir()` 会创建子目录。若 `app/dist` 根下仍有旧版平铺的 json/csv，启动时会自动迁入对应子目录（不覆盖已有文件）。Web 服务对路径 `/dist/*` 返回 403。

---

## 入口与运行

- `python server.py` 或 `python main.py`：启动 **Web**，控制台会打印本机地址（含端口）。
- `python main.py --cli` 或 `python scripts/main.py --cli`：命令行交互（可选）。

---

## 依赖

- **Python 标准库**（含 `http.server`）
- **pandas**、**akshare**（见 `requirements.txt`）

---

## 回测页指标说明

- **区间收益率**：期末累计收益 ÷ 期末净投入；期末累计收益 = 期末权益 − 期末净投入。
- **年化收益率（近似）**：按回测内交易日数、252 日/年折算。
- **权益最大回撤**：按每日模拟权益序列计算。
- **期末净投入**：累计买入 − 累计卖出回款。
- **期末累计收益（元）**：期末权益 − 期末净投入。
