#!/bin/bash

# 設定專案路徑
PROJECT_DIR="/home/ubuntu/market-regime-monitor"
LOG_FILE="$PROJECT_DIR/update_log.txt"

# 進入專案目錄
cd "$PROJECT_DIR" || { echo "$(date '+%Y-%m-%d %H:%M:%S') - 錯誤: 無法進入目錄 $PROJECT_DIR" >> "$LOG_FILE"; exit 1; }

echo "$(date '+%Y-%m-%d %H:%M:%S') - 開始執行市場資料更新流程..." >> "$LOG_FILE"

# 1. 執行 Python 抓取腳本
python3.11 scripts/fetch_research_data.py >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 資料抓取成功。" >> "$LOG_FILE"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 錯誤: 資料抓取失敗。" >> "$LOG_FILE"
    # 根據 playbook，失敗仍會繼續執行 git 提交（如果有部分更新的話）
fi

# 2. 自動提交與推送到 GitHub
git add -A >> "$LOG_FILE" 2>&1
git commit -m "Auto update market data $(date +%Y-%m-%d)" >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    git push origin main >> "$LOG_FILE" 2>&1
    if [ $? -eq 0 ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Git 提交與推送成功。" >> "$LOG_FILE"
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - 錯誤: Git 推送失敗。" >> "$LOG_FILE"
    fi
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 無新資料需要提交或 Git 提交失敗。" >> "$LOG_FILE"
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - 更新流程執行完畢。" >> "$LOG_FILE"
echo "--------------------------------------------------" >> "$LOG_FILE"
