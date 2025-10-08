from fastapi import APIRouter, Request, HTTPException
from typing import List
from .market_screener_api import get_predictions
from ..dependencies import get_user_from_token, db

router = APIRouter()

@router.get("/api/watchlist/predictions")
async def get_watchlist_predictions(
    request: Request,
    date: str = 'latest',
    trend: str = 'all',
    ohlc: str = 'close'
):
    """
    Fetches prediction data for stocks in the authenticated user's watchlist.
    The user is identified from the Authorization token.
    """
    user = get_user_from_token(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Fetch watchlist symbols from Firestore for the user
    watchlist_ref = db.collection('users', user['uid'], 'watchlist', 'default', 'items')
    docs = watchlist_ref.stream()
    symbols = [doc.to_dict().get('symbol') for doc in docs if doc.to_dict().get('symbol')]

    if not symbols:
        return {"items": [], "date": date}

    try:
        # Get all predictions first, using the same function as the market screener
        # The exchange is 'all' because a watchlist can contain stocks from any exchange.
        all_predictions_data = await get_predictions('all', date, trend, ohlc)
        all_predictions = all_predictions_data.get("items", [])

        # Filter the predictions to include only the symbols in the user's watchlist
        watchlist_set = set(symbols)
        watchlist_predictions = [
            stock for stock in all_predictions if stock['symbol'] in watchlist_set
        ]

        return {
            "items": watchlist_predictions,
            "date": all_predictions_data.get("date", date)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")