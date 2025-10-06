# main.py (patch snippet)
import threading
from header_api import advdec_updater
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# allow your dev frontend origin. Be specific in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # update if your frontend runs on another port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# import and include our header routes
from header_api import router as header_router
app.include_router(header_router)

from indices_api import router as indices_router
app.include_router(indices_router)

from treemap_api import router as treemap_router
app.include_router(treemap_router)

from datatable_api import router as datatable_router
app.include_router(datatable_router)



@app.on_event("startup")
def start_background_tasks():
    # run advdec_updater in a daemon thread so it doesn't block shutdown
    t = threading.Thread(target=advdec_updater, kwargs={"loop_delay": 15, "exchange": "NSE", "sample_limit": 800}, daemon=True)
    t.start()