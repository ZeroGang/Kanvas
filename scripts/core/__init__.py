# Kanvas 核心：计算与行情

from core.calculator import KanvasInvestmentCalculator, DEFAULT_BACKTEST_DAYS, take_profit_base_amount
from core.config_manager import load_config, save_config, get_base_amount, get_ma_period
from core.records_manager import load_records, save_records
from core.market import (
    data_dist_dir,
    fetch_gold_spot_hist,
    fetch_latest_close_and_ma20,
    fetch_sge_spot_hist,
    get_gold_close_last_days,
    get_sge_close_last_days,
    read_gold_data_source,
)

__all__ = [
    "KanvasInvestmentCalculator",
    "DEFAULT_BACKTEST_DAYS",
    "take_profit_base_amount",
    "load_config",
    "save_config",
    "get_base_amount",
    "get_ma_period",
    "load_records",
    "save_records",
    "data_dist_dir",
    "fetch_gold_spot_hist",
    "fetch_latest_close_and_ma20",
    "fetch_sge_spot_hist",
    "get_gold_close_last_days",
    "get_sge_close_last_days",
    "read_gold_data_source",
]
