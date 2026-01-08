package com.recharge.charger.service;

import com.recharge.charger.dao.ChargerDAO;
import com.recharge.charger.vo.ChargerVO;
import lombok.RequiredArgsConstructor;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ChargerServiceImpl implements ChargerService {

    private final ChargerDAO chargerDAO;

    @Value("${ev.api.base-url}")
    private String baseUrl;

    @Value("${ev.api.num-of-rows}")
    private int numOfRows;

    @Value("${ev.api.data-type}")
    private String dataType;

    @Value("${ev.api.key}")
    private String serviceKey;

    /** 문자열 정리 */
    private String clean(String v) {
        if (v == null) return "";
        v = v.trim();
        if (v.equalsIgnoreCase("null") || v.isBlank()) return "";
        return v;
    }

    /* ======================================================
     * 🔥 1) 최초 적재 (INSERT ONLY - 모든 필드)
     * ====================================================== */
    @Transactional
    @Override
    public int initChargerData() {

        int insertCount = 0;
        int page = 1;
        RestTemplate rest = new RestTemplate();

        System.out.println("🔥 충전기 초기 적재 시작");

        // stationId → total 계산용
        Map<String, Integer> stationTotalMap = new HashMap<>();

        while (true) {

            String url = String.format(
                    "%s/getChargerInfo?serviceKey=%s&pageNo=%d&numOfRows=%d&dataType=%s&zcode=44",
                    baseUrl, serviceKey, page, numOfRows, dataType
            );

            JSONObject json = new JSONObject(rest.getForObject(url, String.class));
            JSONArray items = json.getJSONObject("items").optJSONArray("item");

            if (items == null || items.isEmpty()) break;

            // 1️⃣ total 계산
            for (int i = 0; i < items.length(); i++) {
                String statId = clean(items.getJSONObject(i).optString("statId"));
                if (!statId.isBlank()) {
                    stationTotalMap.put(statId,
                            stationTotalMap.getOrDefault(statId, 0) + 1);
                }
            }

            // 2️⃣ INSERT
            for (int i = 0; i < items.length(); i++) {

                JSONObject item = items.getJSONObject(i);

                String stationId = clean(item.optString("statId"));
                String chargerId = clean(item.optString("chgerId"));
                if (stationId.isBlank() || chargerId.isBlank()) continue;

                ChargerVO vo = new ChargerVO();
                vo.setStationId(stationId);
                vo.setChargerId(chargerId);
                vo.setChargerProvider(clean(item.optString("busiNm")));
                vo.setChargerType(clean(item.optString("chgerType")));
                vo.setChargerSpeed(clean(item.optString("output")));
                vo.setChargerStatus(item.optInt("stat", 0));
                vo.setChargerAvailable(vo.getChargerStatus() == 2 ? 1 : 0);
                vo.setChargerTotal(stationTotalMap.getOrDefault(stationId, 1));

                if (chargerDAO.existsCharger(stationId, chargerId) == 0) {
                    chargerDAO.insertCharger(vo);
                    insertCount++;
                }
            }

            page++;
        }

        System.out.println("🎯 충전기 초기 적재 완료: " + insertCount);
        return insertCount;
    }

    /* ======================================================
     * 🔁 2) 상태 동기화 (UPDATE ONLY)
     * ====================================================== */
    @Transactional
    @Override
    public int syncChargerStatus() {

        int changed = 0;
        int page = 1;
        RestTemplate rest = new RestTemplate();

        System.out.println("⚡ 충전기 상태 동기화 시작");

        String initUrl = String.format(
                "%s/getChargerInfo?serviceKey=%s&pageNo=1&numOfRows=1&dataType=%s&zcode=44",
                baseUrl, serviceKey, dataType
        );

        int total = new JSONObject(rest.getForObject(initUrl, String.class))
                .optInt("totalCount", 0);
        int totalPage = (int) Math.ceil((double) total / numOfRows);

        while (page <= totalPage) {

            String url = String.format(
                    "%s/getChargerInfo?serviceKey=%s&pageNo=%d&numOfRows=%d&dataType=%s&zcode=44",
                    baseUrl, serviceKey, page, numOfRows, dataType
            );

            JSONArray items = new JSONObject(rest.getForObject(url, String.class))
                    .getJSONObject("items").optJSONArray("item");

            if (items == null) {
                page++;
                continue;
            }

            for (int i = 0; i < items.length(); i++) {

                JSONObject item = items.getJSONObject(i);

                String stationId = clean(item.optString("statId"));
                String chargerId = clean(item.optString("chgerId"));
                if (stationId.isBlank() || chargerId.isBlank()) continue;

                ChargerVO vo = new ChargerVO();
                vo.setStationId(stationId);
                vo.setChargerId(chargerId);
                vo.setChargerStatus(item.optInt("stat", 0));
                vo.setChargerAvailable(vo.getChargerStatus() == 2 ? 1 : 0);

                changed += chargerDAO.updateChargerStatus(vo);
            }

            page++;
        }

        System.out.println("🎯 상태 변경 반영 건수: " + changed);
        return changed;
    }

    /** ⏱ 10분마다 자동 실행 */
//    @Scheduled(fixedDelay = 600_000)
//    public void scheduleSync() {
//        syncChargerStatus();
//    }
}
