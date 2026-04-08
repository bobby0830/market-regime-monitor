import sys
import os
from pathlib import Path

# Add project root to sys.path
sys.path.append('/home/ubuntu/market-regime-monitor')

print("Starting debug fetch...")
from scripts.fetch_research_data import *

def debug_main():
    print("Fetching AAII data...")
    aaii_snapshot, aaii_history = fetch_aaii_bearish()
    print("AAII data fetched.")
    
    print("Fetching Reddit sentiment...")
    reddit_snapshot, reddit_posts = fetch_reddit_sentiment()
    print("Reddit sentiment fetched.")
    
    print("Building liquidity module...")
    liquidity_history, liquidity_summary, liquidity_snapshot = build_liquidity_module()
    print("Liquidity module built.")
    
    print("Building correlation module...")
    corr_summary, corr_matrix, corr_meta = build_correlation_module()
    print("Correlation module built.")
    
    print("Building sector module...")
    sector_scores, sector_history, update_policy, sector_snapshot = build_sector_module()
    print("Sector module built.")
    
    print("Done.")

if __name__ == "__main__":
    debug_main()
