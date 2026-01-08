package com.recharge.fortune.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.recharge.fortune.vo.FortuneVO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

@Service
public class FortuneServiceImpl implements FortuneService {

    @Value("${openai.api.key}")
    private String apiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String generateFortune(FortuneVO vo) throws Exception {

        String prompt = switch (vo.getType()) {
            case "saju" -> buildSajuPrompt(vo);
            case "today" -> buildTodayPrompt(vo);
            case "star" -> buildStarPrompt(vo);
            case "zodiac" -> buildZodiacPrompt(vo);
            default -> throw new IllegalArgumentException("잘못된 운세 타입입니다.");
        };

        return callGPT(prompt);
    }

    /**
     * 🔥 OpenAI GPT 호출
     */
    private String callGPT(String prompt) throws IOException {

        String apiUrl = "https://api.openai.com/v1/chat/completions";

        URL url = new URL(apiUrl);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        conn.setRequestMethod("POST");
        conn.setRequestProperty("Authorization", "Bearer " + apiKey);
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        conn.setDoOutput(true);

        String requestBody = """
        {
          "model": "gpt-4.1-mini",
          "temperature": 0.8,
          "messages": [
            {
              "role": "system",
              "content": "너는 한국식 운세 전문가이다. 단정적인 표현은 피하고, 조언 중심으로 답한다."
            },
            {
              "role": "user",
              "content": %s
            }
          ]
        }
        """.formatted(objectMapper.writeValueAsString(prompt));

        try (OutputStream os = conn.getOutputStream()) {
            os.write(requestBody.getBytes(StandardCharsets.UTF_8));
        }

        int status = conn.getResponseCode();
        InputStream is = (status >= 200 && status < 300)
                ? conn.getInputStream()
                : conn.getErrorStream();

        StringBuilder res = new StringBuilder();
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(is, StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) res.append(line);
        }

        if (status < 200 || status >= 300) {
            throw new RuntimeException("OpenAI API 오류(" + status + "): " + res);
        }

        JsonNode json = objectMapper.readTree(res.toString());
        return json
                .path("choices")
                .get(0)
                .path("message")
                .path("content")
                .asText();
    }

    /* ===================== prompt builders ===================== */

    private String buildSajuPrompt(FortuneVO v) {
        return """
        아래 사용자의 정보를 기반으로 오늘의 사주 운세를 생성해줘.

        [사용자 정보]
        - 성별: %s
        - 생년월일: %s (%s)
        - 태어난 시: %s

        [생성 규칙]
        1. 사주명리 기반 오행·음양 분석 포함
        2. 연애·금전·직업·건강·오늘의 조언 항목 작성
        3. 250~350자
        4. 단정적 표현 금지, 조언 중심
        """.formatted(
                v.getGender(), v.getBirth(), v.getCalendar(), v.getBirthTime()
        );
    }

    private String buildTodayPrompt(FortuneVO v) {
        return """
        아래 정보를 기반으로 한국식 오늘의 운세를 작성해줘.

        [사용자 정보]
        - 성별: %s
        - 생년월일: %s (%s)
        - 태어난 시: %s

        [작성 규칙]
        1. 연애운·금전운·건강운·대인관계·종합운 항목 작성
        2. 200~300자
        3. 실생활에 도움이 되는 조언 포함
        """.formatted(
                v.getGender(), v.getBirth(), v.getCalendar(), v.getBirthTime()
        );
    }

    private String buildStarPrompt(FortuneVO v) {
        return """
        아래 사용자 정보를 기반으로 생년월일로 별자리를 계산하여 오늘의 별자리 운세를 작성해줘.

        [사용자 정보]
        - 성별: %s
        - 생년월일: %s

        [규칙]
        1. 별자리 자동 판별 후 운세 작성
        2. 사랑·금전·감정·행운 포인트 작성
        3. 200~250자
        """.formatted(
                v.getGender(), v.getBirth()
        );
    }

    private String buildZodiacPrompt(FortuneVO v) {
        String year = v.getBirth().substring(0, 4);

        return """
        아래 사용자 정보를 기반으로 띠별 오늘의 운세를 생성해줘.

        [사용자 정보]
        - 성별: %s
        - 생년: %s
        - 생년월일 전체: %s (%s)

        [규칙]
        1. 생년으로 띠 계산 후 운세 작성
        2. 연애·금전·행운·주의점·종합운 항목 작성
        3. 200~250자
        """.formatted(
                v.getGender(), year, v.getBirth(), v.getCalendar()
        );
    }
}
