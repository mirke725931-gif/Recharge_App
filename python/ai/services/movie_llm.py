import os
import json
import re
import traceback
from typing import Dict, Any
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI


# ================== ENV ==================

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY가 설정되지 않았습니다.")

client = OpenAI(api_key=OPENAI_API_KEY)

MODEL_NAME = "gpt-4.1-mini"
print("🔥 movie_llm.py loaded (semantic analyzer)", flush=True)


# ================== JSON PARSER ==================

def _safe_json_parse(text: str) -> Dict[str, Any]:
    text = text.strip()

    if text.startswith("```"):
        text = re.sub(r"^```json", "", text)
        text = re.sub(r"^```", "", text)
        text = re.sub(r"```$", "", text)
        text = text.strip()

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"LLM JSON 파싱 실패\n원문:\n{text}")

    return json.loads(match.group())


# ================== LLM ANALYZER ==================

def analyze_movie_intent_llm(user_text: str) -> Dict[str, Any]:
    """
    역할
    - 자연어 → 의미 신호(JSON)
    - 추천 판단 ❌
    - 실패 시에도 영화 요청은 유지 (fallback 가능)
    """

    prompt = f"""
너는 영화 추천 시스템의 보조 분석기이다.
설명하지 말고 JSON만 출력해라.

규칙:
- 영화와 무관하면 is_movie_related=false
- 확신 없는 값은 반드시 null
- 억지 추론 금지

출력 형식:

{{
  "is_movie_related": true | false,
  "reference_title": string | null,
  "situation": "charging" | "commute" | "home" | "travel" | null,
  "mood": "happy" | "sad" | "tired" | "healing" | "excited" | null,
  "weather": "rain" | "sunny" | "cloudy" | "snow" | "hot" | "cold" | null,
  "time_pref": "short" | "long" | null,
  "focus_pref": "low" | "high" | null
}}

입력:
{user_text}
"""

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": "너는 의미 신호만 JSON으로 출력하는 분석기다."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.0
        )

        raw = response.choices[0].message.content
        parsed = _safe_json_parse(raw)

        return {
            "is_movie_related": bool(parsed.get("is_movie_related", True)),
            "reference_title": parsed.get("reference_title"),
            "situation": parsed.get("situation"),
            "mood": parsed.get("mood"),
            "weather": parsed.get("weather"),
            "time_pref": parsed.get("time_pref"),
            "focus_pref": parsed.get("focus_pref"),
            "llm_fallback": False
        }

    except Exception as e:
        print("❌ LLM 분석 실패 → fallback 허용", e)
        traceback.print_exc()

        # 🔥 실패해도 "영화 요청"은 유지
        return {
            "is_movie_related": True,
            "reference_title": None,
            "situation": None,
            "mood": None,
            "weather": None,
            "time_pref": None,
            "focus_pref": None,
            "llm_fallback": True
        }
