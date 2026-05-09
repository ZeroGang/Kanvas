#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kanvas 命令行入口（可选）。
Web 面板请运行项目根目录: python main.py

项目结构:
    - server/core/   计算与行情
    - server/cli.py 本文件（仅 --cli）
    - app/dist/config/  JSON（config、records、saved_backtests、holdings）
    - app/dist/excels/  行情 CSV（spot_hist_*.csv）
"""

import sys


def run_cli():
    """命令行交互。"""
    import traceback
    from datetime import datetime

    from core.calculator import KanvasInvestmentCalculator

    calc = KanvasInvestmentCalculator()

    while True:
        print("\n" + "=" * 40)
        print("Kanvas (命令行版)")
        print("=" * 40)
        print("\n  [1] 开始计算")
        print("  [2] 查看当前策略参数")
        print("  [3] 查看历史记录")
        print("  [4] 退出")

        choice = input("\n请选择 (1-4): ").strip()

        if choice == "1":
            print("\n" + "=" * 40)
            print("Kanvas")
            print("=" * 40)
            print(f"\n当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

            try:
                gold_price = float(input("\n请输入当日金价（美元/盎司）: ").strip())
                mp = calc.get_ma_period()
                ma20 = float(input(f"请输入当日 MA{mp} 均线价（美元/盎司）: ").strip())

                if gold_price <= 0 or ma20 <= 0:
                    print("请输入正数！")
                    continue

                result = calc.calculate(gold_price, ma20)

                print("\n" + "=" * 40)
                print("计算结果")
                print("=" * 40)
                print(f"  金价:      {result['gold_price']} 美元")
                print(f"  MA{mp}:     {result['ma20']} 美元")
                print(f"  偏离度:    {float(result['deviation']):.2f}%")
                print(f"\n  定投倍数:  {result['multiplier']} 倍")
                print(f"  基础日额:  {calc.base_amount} 元")
                print(f"  当日买入:  {result['amount']} 元")
                print(f"\n  操作建议:  {result['action']}")
                print("=" * 40)
                print("\n" + calc.get_take_profit_text())

                calc.save_record(result)
                print("\n记录已保存")

            except ValueError:
                print("请输入有效的数字！")

            input("\n按回车键继续...")

        elif choice == "2":
            print("\n" + calc.get_strategy_text())
            input("\n按回车键继续...")

        elif choice == "3":
            print("\n" + calc.get_history())
            input("\n按回车键继续...")

        elif choice == "4":
            print("感谢使用，再见！")
            break
        else:
            print("\n无效选择！")
            input("按回车键继续...")


def main():
    args = sys.argv[1:]
    if args and args[0] in ("-h", "--help"):
        print("Web 面板: python main.py")
        print("命令行:    python main.py --cli  或  python server/cli.py --cli")
        return
    if args and args[0] != "--cli":
        print("未知参数。Web: python main.py  CLI: python server/cli.py --cli", file=sys.stderr)
        sys.exit(1)
    run_cli()


if __name__ == "__main__":
    main()
