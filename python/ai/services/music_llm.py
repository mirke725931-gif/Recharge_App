import os
import json
import re
import traceback
from typing import Dict, Any

from dotenv import load_dotenv
from openai import OpenAI
from pathlib import Path


# ================== ENV ==================

BASE_DIR = Path(__file__).resolve().parents[2]  # python/
load_dotenv(BASE_DIR / ".env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY가 설정되지 않았습니다.")

client = OpenAI(api_key=OPENAI_API_KEY)

MODEL_NAME = "gpt-4.1-mini"
print("🔥🔥🔥 music_llm.py 로드됨 🔥🔥🔥", flush=True)


# ================== JSON PARSER ==================

def _safe_json_parse(text: str) -> Dict[str, Any]:
    print("LLM JSON 파싱 원문 ↓↓↓")
    print(text)
    print("LLM JSON 파싱 시작 ↑↑↑")

    text = text.strip()

    # ```json ``` 제거
    if text.startswith("```"):
        text = re.sub(r"^```json", "", text)
        text = re.sub(r"^```", "", text)
        text = re.sub(r"```$", "", text)
        text = text.strip()

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"❌ LLM JSON 파싱 실패\n원문:\n{text}")

    parsed = json.loads(match.group())
    print("LLM JSON 파싱 성공:", parsed)

    return parsed


# ================== MAIN ==================

def analyze_music_intent_llm(user_text: str) -> Dict[str, Any]:
    """
    역할
    - 사용자의 자연어를 음악 추천용 '의미 구조(JSON)'로 변환
    - 추천 판단/전략은 여기서 하지 않는다
    """

    print("LLM analyze_music_intent_llm 호출")
    print("LLM user_text:", user_text)

    prompt = f"""
사용자 입력을 분석해서 아래 JSON 형식으로만 응답해라.
다른 설명은 절대 하지 마.

1. 먼저 음악 추천과 관련된 요청인지 판단해라.
   - 음악 추천과 관련이 없으면 is_music_related=false 로 설정하고
     나머지 필드는 전부 null 로 설정해라.

2. 음악 추천 요청이라면 intent_type 을 반드시 아래 중 하나로 설정해라.
   - general : 일반적인 음악 추천
   - artist  : 특정 가수/아티스트의 노래 추천
   - similar : 특정 노래와 비슷한 음악 추천

3. intent_type 이 artist 인 경우:
   - artist 필드에 가수명을 반드시 채워라.

4. intent_type 이 similar 인 경우:
   - seed_track 필드에 기준이 되는 노래 제목을 반드시 채워라.
   - artist 가 명시되어 있다면 artist 필드도 채워라.

반드시 아래 JSON 형식으로만 응답해라.

{{
  "is_music_related": true,
  "intent_type": "general" | "artist" | "similar",
  "artist": string | null,
  "seed_track": string | null,
  "context": "charging" | "commute" | "drive" | "travel" | "focus" | "workout" | "rest" | null,
  "mood": "tired" | "calm" | "happy" | "excited" | "sad" | null,
  "weather": "rainy" | "sunny" | "cloudy" | "snowy" | "hot" | "cold" | null
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
                    "content": "너는 JSON만 출력하는 분석기다. 설명하지 마라."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.0,
        )

        text = response.choices[0].message.content
        print("LLM raw response:")
        print(text)

        return _safe_json_parse(text)

    except Exception as e:
        print("LLM 호출 또는 파싱 중 예외 발생")
        print("예외 메시지:", e)
        traceback.print_exc()
        raise
