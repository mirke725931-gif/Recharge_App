package com.recharge.charger.controller;

import com.recharge.charger.service.ChargerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/charger")
@RequiredArgsConstructor
public class ChargerController {

    private final ChargerService chargerService;

    /** 🔥 최초 1회 */
    @PostMapping("/init")
    public ResponseEntity<String> init() {
        int count = chargerService.initChargerData();
        return ResponseEntity.ok("충전기 초기 적재 완료: " + count);
    }

    /** 🔁 수동 동기화 (테스트용) */
    @PostMapping("/sync")
    public ResponseEntity<String> sync() {
        int count = chargerService.syncChargerStatus();
        return ResponseEntity.ok("충전기 상태 동기화 완료: " + count);
    }
}
