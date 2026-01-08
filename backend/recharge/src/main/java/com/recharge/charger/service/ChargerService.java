package com.recharge.charger.service;

public interface ChargerService {

    /** 🔥 최초 1회: 전체 필드 INSERT */
    int initChargerData();

    /** 🔁 주기적: 상태만 UPDATE */
    int syncChargerStatus();
}
