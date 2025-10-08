from fastapi import APIRouter, HTTPException, Query
from typing import List
import requests
from datetime import datetime, timedelta
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from nltk import download

download('vader_lexicon', quiet=True)

router = APIRouter()

class SentimentAnalyzer:
    def __init__(self):
        self.sid = SentimentIntensityAnalyzer()
        self.news_api_key = "f7eaf71c67114d89bc11bc523751af04"

    def fetch_news(self, ticker: str):
        company_map = {
            "RELIANCE": "Reliance Industries",
            "TCS": "Tata Consultancy Services",
            "INFY": "Infosys",
            "HDFCBANK": "HDFC Bank",
            "ICICIBANK": "ICICI Bank",
            "NIFTY": "NIFTY 50"
        }
        company_name = company_map.get(ticker.upper(), ticker.upper())
        url = "https://newsapi.org/v2/everything"
        params = {
            "q": company_name,
            "apiKey": self.news_api_key,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": 10,
            "from": (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        }
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            articles = data.get("articles", [])
            return [{"title": a["title"], "url": a["url"]} for a in articles if a.get("title") and a.get("url")]
        except Exception as e:
            return []

    def analyze_sentiment(self, text: str):
        score = self.sid.polarity_scores(text)["compound"]
        if score >= 0.05:
            return "positive", score
        elif score <= -0.05:
            return "negative", score
        return "neutral", score

    def get_sentiment_data(self, ticker: str):
        articles = self.fetch_news(ticker)
        result = []
        for a in articles[:5]:
            sentiment, score = self.analyze_sentiment(a["title"])
            result.append({
                "text": a["title"],
                "sentiment": sentiment,
                "score": score,
                "source": "News",
                "ticker": ticker.upper(),
                "url": a["url"]
            })
        return result

analyzer = SentimentAnalyzer()

@router.get("/news/trending")
def get_trending_news():
    tickers = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "NIFTY"]
    all_data = []
    for ticker in tickers:
        all_data.extend(analyzer.get_sentiment_data(ticker))
    return {"news": all_data}

@router.get("/news/search")
def search_news(ticker: str = Query(..., min_length=1, max_length=10)):
    try:
        data = analyzer.get_sentiment_data(ticker)
        if not data:
            return {"news": [], "message": "No news found for ticker"}
        return {"news": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
