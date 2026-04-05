#!/usr/bin/env python3
"""
scripts/train-price-model.py

NPlatform XGBoost 낙찰가율 예측 모델 학습 파이프라인

사용법:
  pip install -r scripts/requirements-ml.txt
  python scripts/train-price-model.py

환경변수 (또는 .env.local):
  SUPABASE_URL              — Supabase 프로젝트 URL
  SUPABASE_SERVICE_ROLE_KEY — 서비스 롤 키 (읽기 전용도 가능)
  MODEL_OUTPUT_DIR          — 모델 출력 디렉토리 (기본: public/models)

학습 기준:
  - ml_training_samples 테이블에서 샘플 로드
  - split='train' / split='val' 으로 훈련/검증 분리
  - XGBoostRegressor로 낙찰가율 예측
  - ONNX 변환 후 public/models/price_v2.onnx 저장
  - 모델 메타데이터 → public/models/price_v2_meta.json
"""

import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

# ─── 로깅 설정 ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
log = logging.getLogger(__name__)

# ─── 의존성 임포트 ──────────────────────────────────────────
try:
    import xgboost as xgb
    from sklearn.preprocessing import LabelEncoder
    from sklearn.metrics import mean_absolute_percentage_error, r2_score
    import onnx
    import onnxmltools
    from onnxmltools.convert import convert_xgboost
    from onnxconverter_common.data_types import FloatTensorType
    HAS_ONNX = True
except ImportError as e:
    log.warning(f"ONNX 변환 불가 (라이브러리 미설치): {e}")
    HAS_ONNX = False

try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False
    log.warning("supabase-py 미설치 — CSV 폴백 사용")

# ─── 설정 ────────────────────────────────────────────────────
FEATURE_COLS = [
    'appraised_value',      # 감정가 (원)
    'ltv',                  # LTV (0~1)
    'delinquency_months',   # 연체 개월
    'floor_no',             # 층수
    'building_age_years',   # 건축연수
    'area_sqm',             # 면적 (㎡)
    'senior_claims_ratio',  # 선순위 채권 비율
    'tenant_risk_score',    # 임차인 리스크 점수
    'legal_complexity',     # 법적 복잡도
    'nbi_index',            # NBI 지수
    'avg_bid_ratio_region', # 지역 평균 낙찰가율
    'avg_rent_per_sqm',     # 평균 임대료 (만원/㎡)
    'vacancy_rate',         # 공실률
    # 범주형 (인코딩 후)
    'region_enc',
    'property_type_enc',
    'area_category_enc',
]

TARGET_COL = 'actual_bid_ratio'

MIN_SAMPLES = 100      # 최소 학습 샘플 수
ACTIVATION_THRESHOLD = 1000  # 이 수 이상이면 모델 status를 shadow → active로 변경 권고

# ─── Supabase 데이터 로드 ────────────────────────────────────

def load_from_supabase() -> pd.DataFrame:
    """Supabase ml_training_samples 테이블에서 데이터 로드"""
    url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL', '')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')

    if not url or not key:
        raise ValueError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수 필요")

    supabase: Client = create_client(url, key)
    log.info("Supabase에서 학습 데이터 로드 중...")

    all_rows = []
    page_size = 1000
    offset = 0

    while True:
        res = supabase.table('ml_training_samples') \
            .select('*') \
            .range(offset, offset + page_size - 1) \
            .execute()
        rows = res.data or []
        all_rows.extend(rows)
        log.info(f"  로드: {len(all_rows)}건")
        if len(rows) < page_size:
            break
        offset += page_size

    return pd.DataFrame(all_rows)


def load_from_csv(path: str) -> pd.DataFrame:
    """CSV 폴백 (supabase-py 미설치 시)"""
    log.info(f"CSV 파일 로드: {path}")
    return pd.read_csv(path)


def generate_synthetic_samples(n: int = 500) -> pd.DataFrame:
    """
    합성 학습 샘플 생성 (실데이터 수집 전 초기 학습용)
    실제 한국 경매 통계 기반 파라미터 사용
    """
    log.info(f"합성 샘플 {n}건 생성 중...")
    rng = np.random.default_rng(42)

    regions = ['서울', '경기', '부산', '인천', '대구', '광주', '대전']
    region_bias = {'서울': 0.08, '경기': 0.04, '부산': 0.02,
                   '인천': 0.01, '대구': -0.02, '광주': -0.03, '대전': 0.0}

    ptypes = ['아파트', '상가', '오피스텔', '토지']
    ptype_bias = {'아파트': 0.06, '상가': -0.12, '오피스텔': 0.02, '토지': -0.08}

    rows = []
    for _ in range(n):
        region = rng.choice(regions)
        ptype = rng.choice(ptypes)

        appraised_value = rng.integers(50_000_000, 2_000_000_000)
        ltv = rng.uniform(0.4, 0.95)
        delinquency = rng.integers(3, 48)
        floor_no = rng.integers(1, 30) if ptype in ['아파트', '오피스텔'] else 1
        building_age = rng.integers(0, 35)
        area_sqm = rng.uniform(20, 300)
        senior_ratio = rng.uniform(0.0, 0.5)
        tenant_risk = rng.uniform(0.0, 1.0)
        legal_complexity = rng.uniform(0.0, 1.0)
        nbi = rng.uniform(85, 115)
        avg_bid_ratio_region = 0.85 + region_bias[region] + ptype_bias[ptype] + rng.uniform(-0.05, 0.05)
        avg_rent = rng.uniform(2, 30)
        vacancy = rng.uniform(0.02, 0.25)

        # 낙찰가율 시뮬레이션 (실제 경매 패턴 반영)
        base = 0.82
        base += region_bias[region] + ptype_bias[ptype]
        base += (1 - ltv) * 0.1
        base -= delinquency * 0.003
        base -= legal_complexity * 0.05
        base -= tenant_risk * 0.03
        base += (nbi - 100) * 0.001
        noise = rng.normal(0, 0.04)
        bid_ratio = float(np.clip(base + noise, 0.30, 1.30))

        area_category = (
            'small' if area_sqm < 40 else
            'medium' if area_sqm < 85 else
            'large' if area_sqm < 135 else 'xlarge'
        )

        rows.append({
            'appraised_value': appraised_value,
            'ltv': ltv,
            'delinquency_months': delinquency,
            'floor_no': floor_no,
            'building_age_years': building_age,
            'area_sqm': area_sqm,
            'senior_claims_ratio': senior_ratio,
            'tenant_risk_score': tenant_risk,
            'legal_complexity': legal_complexity,
            'nbi_index': nbi,
            'avg_bid_ratio_region': avg_bid_ratio_region,
            'avg_rent_per_sqm': avg_rent,
            'vacancy_rate': vacancy,
            'region': region,
            'property_type': ptype,
            'area_category': area_category,
            'actual_bid_ratio': bid_ratio,
            'split': 'train' if rng.random() > 0.15 else ('val' if rng.random() > 0.5 else 'test'),
            'source': 'synthetic',
        })

    return pd.DataFrame(rows)


# ─── 전처리 ─────────────────────────────────────────────────

def preprocess(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """결측치 처리 + 범주형 인코딩"""
    encoders = {}

    # 결측치 기본값
    defaults = {
        'ltv': 0.7,
        'delinquency_months': 12,
        'floor_no': 5,
        'building_age_years': 10,
        'area_sqm': 85.0,
        'senior_claims_ratio': 0.2,
        'tenant_risk_score': 0.3,
        'legal_complexity': 0.3,
        'nbi_index': 100.0,
        'avg_bid_ratio_region': 0.82,
        'avg_rent_per_sqm': 10.0,
        'vacancy_rate': 0.10,
    }
    for col, val in defaults.items():
        if col in df.columns:
            df[col] = df[col].fillna(val)

    # 범주형 인코딩
    for cat_col, enc_col in [('region', 'region_enc'), ('property_type', 'property_type_enc'), ('area_category', 'area_category_enc')]:
        if cat_col in df.columns:
            le = LabelEncoder()
            df[enc_col] = le.fit_transform(df[cat_col].fillna('unknown'))
            encoders[cat_col] = le
        else:
            df[enc_col] = 0

    # appraised_value 로그 스케일
    df['appraised_value'] = np.log1p(df['appraised_value'])

    return df, encoders


# ─── 학습 ────────────────────────────────────────────────────

def train_model(X_train: np.ndarray, y_train: np.ndarray,
                X_val: np.ndarray, y_val: np.ndarray) -> xgb.XGBRegressor:
    log.info(f"XGBoost 학습 시작 (train={len(X_train)}, val={len(X_val)})")

    model = xgb.XGBRegressor(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        gamma=0.1,
        reg_alpha=0.1,
        reg_lambda=1.0,
        objective='reg:squarederror',
        eval_metric='mape',
        early_stopping_rounds=50,
        random_state=42,
        n_jobs=-1,
        device='cpu',
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=50,
    )

    log.info(f"최적 이터레이션: {model.best_iteration}")
    return model


# ─── 평가 ────────────────────────────────────────────────────

def evaluate(model: xgb.XGBRegressor, X: np.ndarray, y: np.ndarray, split: str) -> dict:
    preds = model.predict(X)
    mape = mean_absolute_percentage_error(y, preds) * 100
    r2 = r2_score(y, preds)
    mae = float(np.mean(np.abs(preds - y)))
    log.info(f"[{split}] MAPE={mape:.2f}%  R²={r2:.4f}  MAE={mae:.4f}")
    return {'mape': round(mape, 4), 'r2': round(r2, 4), 'mae': round(mae, 4), 'n': len(y)}


# ─── ONNX 변환 ───────────────────────────────────────────────

def convert_to_onnx(model: xgb.XGBRegressor, n_features: int, output_path: str) -> bool:
    if not HAS_ONNX:
        log.warning("ONNX 라이브러리 미설치 — 변환 스킵")
        return False
    try:
        initial_type = [('float_input', FloatTensorType([None, n_features]))]
        onnx_model = convert_xgboost(model, initial_types=initial_type)
        with open(output_path, 'wb') as f:
            f.write(onnx_model.SerializeToString())
        log.info(f"ONNX 모델 저장: {output_path}")
        return True
    except Exception as e:
        log.error(f"ONNX 변환 실패: {e}")
        return False


# ─── 메인 ────────────────────────────────────────────────────

def main():
    output_dir = Path(os.getenv('MODEL_OUTPUT_DIR', 'public/models'))
    output_dir.mkdir(parents=True, exist_ok=True)

    # ── 데이터 로드 ──────────────────────────────────────────
    df = None

    if HAS_SUPABASE and os.getenv('SUPABASE_URL'):
        try:
            df = load_from_supabase()
            log.info(f"Supabase 로드 완료: {len(df)}건")
        except Exception as e:
            log.error(f"Supabase 로드 실패: {e}")

    csv_path = os.getenv('TRAINING_CSV', 'data/training_samples.csv')
    if df is None and Path(csv_path).exists():
        df = load_from_csv(csv_path)

    if df is None or len(df) < MIN_SAMPLES:
        current = len(df) if df is not None else 0
        log.warning(f"실데이터 부족 ({current}건 < {MIN_SAMPLES}건) — 합성 데이터 사용")
        synthetic = generate_synthetic_samples(max(500, MIN_SAMPLES - current))
        df = pd.concat([df, synthetic], ignore_index=True) if df is not None and len(df) > 0 else synthetic

    log.info(f"총 샘플: {len(df)}건 (source 분포: {df['source'].value_counts().to_dict() if 'source' in df.columns else 'N/A'})")

    # ── 전처리 ────────────────────────────────────────────────
    df, encoders = preprocess(df)

    # split 컬럼 없으면 랜덤 분할
    if 'split' not in df.columns:
        rng = np.random.default_rng(42)
        df['split'] = rng.choice(['train', 'val', 'test'], size=len(df), p=[0.75, 0.15, 0.10])

    # 유효 피처만 선택
    available_features = [c for c in FEATURE_COLS if c in df.columns]
    if len(available_features) < 5:
        log.error(f"피처 부족 ({len(available_features)}개): {available_features}")
        sys.exit(1)

    log.info(f"학습 피처 {len(available_features)}개: {available_features}")

    train_df = df[df['split'] == 'train']
    val_df   = df[df['split'] == 'val']
    test_df  = df[df['split'] == 'test']

    if len(train_df) < 50:
        log.error(f"학습 샘플 부족 ({len(train_df)}건 < 50건)")
        sys.exit(1)

    X_train = train_df[available_features].values.astype(np.float32)
    y_train = train_df[TARGET_COL].values.astype(np.float32)
    X_val   = val_df[available_features].values.astype(np.float32) if len(val_df) > 0 else X_train[:10]
    y_val   = val_df[TARGET_COL].values.astype(np.float32) if len(val_df) > 0 else y_train[:10]

    # ── 학습 ─────────────────────────────────────────────────
    model = train_model(X_train, y_train, X_val, y_val)

    # ── 평가 ─────────────────────────────────────────────────
    train_metrics = evaluate(model, X_train, y_train, 'train')
    val_metrics   = evaluate(model, X_val,   y_val,   'val')
    test_metrics  = {}
    if len(test_df) > 0:
        X_test = test_df[available_features].values.astype(np.float32)
        y_test = test_df[TARGET_COL].values.astype(np.float32)
        test_metrics = evaluate(model, X_test, y_test, 'test')

    # ── 피처 중요도 ───────────────────────────────────────────
    importance = dict(zip(available_features, model.feature_importances_))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)
    log.info("피처 중요도 TOP 5:")
    for feat, imp in top_features[:5]:
        log.info(f"  {feat}: {imp:.4f}")

    # ── ONNX 변환 ────────────────────────────────────────────
    onnx_path = str(output_dir / 'price_v2.onnx')
    onnx_saved = convert_to_onnx(model, len(available_features), onnx_path)

    # XGBoost 네이티브 모델도 저장 (폴백용)
    xgb_path = str(output_dir / 'price_v2.ubj')
    model.save_model(xgb_path)
    log.info(f"XGBoost 모델 저장: {xgb_path}")

    # ── 메타데이터 저장 ─────────────────────────────────────
    total_samples = len(df)
    recommend_activate = total_samples >= ACTIVATION_THRESHOLD and val_metrics.get('mape', 999) < 15

    meta = {
        'model_name': 'price_v2',
        'model_type': 'XGBoostRegressor',
        'version': '2.0.0',
        'trained_at': datetime.utcnow().isoformat() + 'Z',
        'features': available_features,
        'n_features': len(available_features),
        'feature_importance': importance,
        'metrics': {
            'train': train_metrics,
            'val': val_metrics,
            'test': test_metrics,
        },
        'training_samples': {
            'total': total_samples,
            'train': len(train_df),
            'val': len(val_df),
            'test': len(test_df),
            'sources': df['source'].value_counts().to_dict() if 'source' in df.columns else {},
        },
        'xgboost_params': model.get_xgb_params(),
        'best_iteration': int(model.best_iteration) if hasattr(model, 'best_iteration') else None,
        'onnx_path': onnx_path if onnx_saved else None,
        'xgb_path': xgb_path,
        'encoders': {
            k: {'classes': list(v.classes_), 'type': 'LabelEncoder'}
            for k, v in encoders.items()
        },
        'activation_recommendation': {
            'recommend_activate': recommend_activate,
            'reason': (
                f"MAPE={val_metrics.get('mape','?')}% < 15% AND samples={total_samples} >= {ACTIVATION_THRESHOLD}"
                if recommend_activate
                else f"MAPE={val_metrics.get('mape','?')}% or samples={total_samples} < {ACTIVATION_THRESHOLD}"
            ),
        }
    }

    meta_path = output_dir / 'price_v2_meta.json'
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    log.info(f"메타데이터 저장: {meta_path}")

    # ── 최종 요약 ────────────────────────────────────────────
    log.info("=" * 60)
    log.info("✅ 학습 완료")
    log.info(f"  검증 MAPE : {val_metrics.get('mape', 'N/A')}%")
    log.info(f"  검증 R²   : {val_metrics.get('r2', 'N/A')}")
    log.info(f"  학습 샘플 : {len(train_df)}건")
    log.info(f"  ONNX 저장 : {'✓' if onnx_saved else '✗ (라이브러리 미설치)'}")
    if recommend_activate:
        log.info("  🚀 모델 활성화 권고: model-registry.ts에서 price_v2 status를 'active'로 변경하세요.")
    else:
        log.info(f"  ⏳ 아직 shadow 상태 유지 권고 (목표: {ACTIVATION_THRESHOLD}건, 현재: {total_samples}건)")
    log.info("=" * 60)

    return 0 if val_metrics.get('mape', 999) < 25 else 1


if __name__ == '__main__':
    sys.exit(main())
