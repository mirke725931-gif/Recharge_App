import re
import random
import traceback
from enum import Enum
from typing import Optional, Dict, Any, List

from ai.services.movie_llm import analyze_movie_intent_llm


# ================== CONFIG ==================

MIN_VOTE = 6.0
MIN_CONFIDENCE = 50

SORT_POOL = [
    "popularity.desc",
    "vote_average.desc",
    "vote_count.desc"
]


class Intent(str, Enum):
    SIMILAR_BY_TITLE = "SIMILAR_BY_TITLE"
    WEATHER = "WEATHER"
    MOOD = "MOOD"
    RECHARGE = "RECHARGE"
    TIME_SHORT = "TIME_SHORT"
    TIME_LONG = "TIME_LONG"
    FOCUS_LOW = "FOCUS_LOW"
    FOCUS_HIGH = "FOCUS_HIGH"
    LLM_FALLBACK = "LLM_FALLBACK"


# ================== UTILS ==================

def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def has_any(text: str, keywords: List[str]) -> bool:
    return any(k in text for k in keywords)


def add_signal(
    signals: list,
    intent: Intent,
    score: int,
    data: dict | None,
    source: str
):
    signals.append({
        "intent": intent,
        "score": score,
        "data": data or {},
        "source": source
    })


# ================== RULE DEFINITIONS ==================

SIMILAR_PATTERNS = [
    r"(.+)\s*같은\s*영화",
    r"(.+)\s*비슷한\s*영화",
    r"(.+)\s*같은\s*느낌",
    r"(.+)\s*같은\s*분위기",
]


WEATHER_KEYWORDS = {
    "rain": {
        "keywords": ["비", "비오는", "장마", "우천"],
        "genres": ["18", "10749"]
    },
    "snow": {
        "keywords": ["눈", "설경", "폭설"],
        "genres": ["35", "10751", "14"]
    },
    "sunny": {
        "keywords": ["맑", "화창", "햇살"],
        "genres": ["35", "12"]
    },
    "cloudy": {
        "keywords": ["흐린", "우중충"],
        "genres": ["18"]
    },
    "hot": {
        "keywords": ["더워", "폭염"],
        "genres": ["28", "35"]
    },
    "cold": {
        "keywords": ["추워", "한겨울", "겨울"],
        "genres": ["18", "14"]
    }
}


MOOD_KEYWORDS = {
    "happy": {
        "keywords": ["행복", "신나", "기분 좋아"],
        "genres": ["35", "12"]
    },
    "sad": {
        "keywords": ["우울", "슬퍼", "눈물"],
        "genres": ["18", "10749"]
    },
    "tired": {
        "keywords": ["피곤", "지쳤어", "번아웃"],
        "genres": ["16", "10751"]
    },
    "healing": {
        "keywords": ["힐링", "잔잔", "편안"],
        "genres": ["18", "10402"]
    },
    "excited": {
        "keywords": ["짜릿", "스릴", "긴장감"],
        "genres": ["28", "53"]
    }
}


RECHARGE_KEYWORDS = [
    "충전", "차에서", "대기 중", "잠깐 시간",
    "작은 화면", "폰으로", "이어 보기"
]

TIME_SHORT_KEYWORDS = ["짧은", "금방", "30분", "1시간"]
TIME_LONG_KEYWORDS = ["길게", "몰아서", "정주행"]

FOCUS_LOW_KEYWORDS = ["틀어놓고", "배경으로", "집안일 하면서"]
FOCUS_HIGH_KEYWORDS = ["집중해서", "몰입해서", "눈 떼기 힘든"]


# ================== ROUTER ==================

def route_movie_request(user_text: str) -> Dict[str, Any]:
    text = normalize(user_text)
    signals: List[Dict[str, Any]] = []

    # ---------- SIMILAR ----------
    for p in SIMILAR_PATTERNS:
        m = re.search(p, text)
        if m:
            seed = m.group(1).strip()
            if len(seed) >= 2:
                add_signal(
                    signals,
                    Intent.SIMILAR_BY_TITLE,
                    100,
                    {"seedTitle": seed},
                    "rule"
                )
                break

    # ---------- WEATHER ----------
    for key, rule in WEATHER_KEYWORDS.items():
        if has_any(text, rule["keywords"]):
            add_signal(
                signals,
                Intent.WEATHER,
                35,
                {"prefer_genres": rule["genres"]},
                "rule"
            )
            break

    # ---------- MOOD ----------
    for key, rule in MOOD_KEYWORDS.items():
        if has_any(text, rule["keywords"]):
            add_signal(
                signals,
                Intent.MOOD,
                30,
                {"prefer_genres": rule["genres"]},
                "rule"
            )
            break

    # ---------- CONTEXT ----------
    if has_any(text, RECHARGE_KEYWORDS):
        add_signal(signals, Intent.RECHARGE, 40, {}, "rule")

    if has_any(text, TIME_SHORT_KEYWORDS):
        add_signal(signals, Intent.TIME_SHORT, 20, {}, "rule")

    if has_any(text, TIME_LONG_KEYWORDS):
        add_signal(signals, Intent.TIME_LONG, 20, {}, "rule")

    if has_any(text, FOCUS_LOW_KEYWORDS):
        add_signal(signals, Intent.FOCUS_LOW, 15, {}, "rule")

    if has_any(text, FOCUS_HIGH_KEYWORDS):
        add_signal(signals, Intent.FOCUS_HIGH, 15, {}, "rule")

    # ---------- LLM (보조) ----------
    try:
        llm = analyze_movie_intent_llm(user_text)
        if llm and llm.get("is_movie_related"):
            if llm.get("reference_title"):
                add_signal(
                    signals,
                    Intent.SIMILAR_BY_TITLE,
                    60,
                    {"seedTitle": llm["reference_title"]},
                    "llm"
                )
            if llm.get("weather"):
                rule = WEATHER_KEYWORDS.get(llm["weather"])
                if rule:
                    add_signal(
                        signals,
                        Intent.WEATHER,
                        15,
                        {"prefer_genres": rule["genres"]},
                        "llm"
                    )
            if llm.get("mood"):
                rule = MOOD_KEYWORDS.get(llm["mood"])
                if rule:
                    add_signal(
                        signals,
                        Intent.MOOD,
                        15,
                        {"prefer_genres": rule["genres"]},
                        "llm"
                    )
    except Exception:
        traceback.print_exc()

    # ---------- DECISION ----------
    if not signals:
        return {
            "intent": Intent.LLM_FALLBACK,
            "route": "tmdb",
            "confidence": 0,
            "payload": {
                "sort_by": "popularity.desc",
                "min_vote": MIN_VOTE
            },
            "decision_trace": []
        }

    confidence = sum(s["score"] for s in signals)

    primary = max(signals, key=lambda s: s["score"])

    payload = {
        "min_vote": MIN_VOTE,
        "sort_by": random.choice(SORT_POOL),
        **primary["data"]
    }

    return {
        "intent": primary["intent"],
        "route": "tmdb",
        "confidence": confidence,
        "payload": payload,
        "decision_trace": signals
    }
