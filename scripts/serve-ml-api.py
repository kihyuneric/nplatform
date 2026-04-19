"""
NPLatform ML Inference Server (FastAPI)
Phase 2 로드맵 #1 — LightGBM/XGBoost 모델 서빙

배포:
  pip install -r scripts/requirements-ml.txt fastapi uvicorn
  python scripts/serve-ml-api.py   # http://localhost:8000

환경변수:
  MODEL_PATH (기본: ./models/price-xgb.json)
  PORT       (기본: 8000)
  API_KEY    (선택 — 설정 시 X-API-Key 헤더 요구)

Next.js 통합: lib/ml/python-client.ts → ML_SERVICE_URL 이 설정되면 우선 호출.
"""

import json
import logging
import os
import sys
from typing import Optional

import numpy as np
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

try:
    import xgboost as xgb
except ImportError:
    xgb = None

logger = logging.getLogger("ml-api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# ─── Model Loader ────────────────────────────────────────────

MODEL_PATH = os.environ.get("MODEL_PATH", "./models/price-xgb.json")
MODEL_META_PATH = os.environ.get("MODEL_META_PATH", "./models/price-xgb.meta.json")
API_KEY = os.environ.get("API_KEY")
PORT = int(os.environ.get("PORT", "8000"))

_model = None
_meta = {"version": "unknown", "features": [], "trained_at": None}


def load_model() -> None:
    global _model, _meta
    if xgb is None:
        logger.warning("xgboost not installed — inference will use heuristic fallback")
        return
    if os.path.exists(MODEL_PATH):
        try:
            _model = xgb.Booster()
            _model.load_model(MODEL_PATH)
            logger.info(f"Loaded XGBoost model from {MODEL_PATH}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
    else:
        logger.warning(f"Model file missing: {MODEL_PATH} — using heuristic fallback")

    if os.path.exists(MODEL_META_PATH):
        try:
            with open(MODEL_META_PATH, encoding="utf-8") as f:
                _meta = json.load(f)
            logger.info(f"Loaded model metadata version={_meta.get('version')}")
        except Exception as e:
            logger.warning(f"Metadata load failed: {e}")


# ─── Feature Encoding ────────────────────────────────────────

TYPE_MAP = {
    "아파트": 0.9, "오피스": 0.7, "상가": 0.5, "근린생활": 0.5,
    "토지": 0.3, "임야": 0.2, "다세대": 0.6, "다가구": 0.55,
    "공장": 0.35, "창고": 0.4,
}
REGION_MAP = {
    "서울": 0.95, "경기": 0.7, "부산": 0.6, "인천": 0.6,
    "대구": 0.5, "대전": 0.5, "광주": 0.45, "세종": 0.55,
    "강원": 0.35, "충북": 0.35, "충남": 0.4, "경북": 0.4,
    "경남": 0.4, "전북": 0.35, "전남": 0.35, "제주": 0.45,
}


def encode(features: dict) -> np.ndarray:
    return np.array([[
        TYPE_MAP.get(features.get("collateral_type", ""), 0.5),
        REGION_MAP.get(features.get("region", ""), 0.5),
        min(features.get("principal_amount", 0) / 1e10, 1.0),
        min(features.get("appraised_value", 1) / 1.5e10, 1.0),
        features.get("ltv", 70) / 100,
        min(features.get("delinquency_months", 0) / 60, 1.0),
        min(features.get("debtor_count", 1) / 10, 1.0),
        min(features.get("area_sqm", 0) / 500, 1.0),
    ]], dtype=np.float32)


def heuristic_predict(features: dict) -> float:
    """XGBoost 부재 시 폴백 — 선형 회귀 근사."""
    appraised = features.get("appraised_value", 0)
    ltv = features.get("ltv", 70)
    delinq = features.get("delinquency_months", 0)
    base = 0.6
    ratio = base - (ltv * 0.003 / 100) - (delinq * 0.002)
    return max(0.2, min(0.95, ratio)) * appraised


# ─── FastAPI App ─────────────────────────────────────────────

app = FastAPI(title="NPLatform ML API", version="1.0.0")


class PredictRequest(BaseModel):
    collateral_type: str
    region: str
    principal_amount: float = Field(ge=0)
    appraised_value: float = Field(gt=0)
    ltv: float = Field(ge=0, le=100)
    delinquency_months: int = Field(ge=0)
    debtor_count: int = Field(ge=0, default=1)
    area_sqm: float = Field(ge=0, default=0)


class PredictResponse(BaseModel):
    expected_price: float
    price_range: dict
    confidence: float
    discount_rate: float
    model_version: str
    backend: str  # "xgboost" | "heuristic"


def check_auth(x_api_key: Optional[str]) -> None:
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


@app.on_event("startup")
def _startup() -> None:
    load_model()


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model_loaded": _model is not None,
        "model_version": _meta.get("version"),
        "backend": "xgboost" if _model else "heuristic",
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest, x_api_key: Optional[str] = Header(default=None)) -> PredictResponse:
    check_auth(x_api_key)
    features = req.dict()

    if _model is not None and xgb is not None:
        try:
            x = encode(features)
            dm = xgb.DMatrix(x)
            raw = float(_model.predict(dm)[0])
            expected = raw * req.appraised_value if raw < 2 else raw
            confidence = 0.78
            backend = "xgboost"
        except Exception as e:
            logger.warning(f"XGBoost inference failed, falling back: {e}")
            expected = heuristic_predict(features)
            confidence = 0.55
            backend = "heuristic"
    else:
        expected = heuristic_predict(features)
        confidence = 0.55
        backend = "heuristic"

    spread = expected * 0.15
    return PredictResponse(
        expected_price=round(expected),
        price_range={"low": round(expected - spread), "high": round(expected + spread)},
        confidence=confidence,
        discount_rate=round(1 - expected / req.appraised_value, 3) if req.appraised_value else 0.0,
        model_version=_meta.get("version", "heuristic-1.0"),
        backend=backend,
    )


@app.get("/metadata")
def metadata() -> dict:
    return _meta


if __name__ == "__main__":
    try:
        import uvicorn
    except ImportError:
        logger.error("Install uvicorn: pip install uvicorn[standard]")
        sys.exit(1)
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
