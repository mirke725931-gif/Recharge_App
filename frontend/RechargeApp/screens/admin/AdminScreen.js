import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native"; // 화면에 돌아올 때 새로고침용
import ReportAllScreen from "./ReportAllScreen";
import { loadReportedList } from "../../utils/ReportApi"; // API 함수 가져오기

export default function AdminScreen({ route }) {
    const user = route?.params?.user;
    const [selectedType, setSelectedType] = useState('ALL');
    const [reports, setReports] = useState([]);

    // 1. 데이터 로드 함수 (화면이 포커스될 때마다 실행)
    const fetchReports = async () => {
        try {
            const data = await loadReportedList() || [];
            setReports(data);
        } catch (error) {
            console.error(error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchReports();
        }, [])
    );
   // ---------------------------------------------------------
    // 👉 여기에 붙여넣으세요 (진단 로그 코드)
    // ---------------------------------------------------------
    if (reports.length > 0) {
        console.log("============== 진단 시작 ==============");
        
        // 1. 첫 번째 데이터의 상태값이 정확히 무엇인가?
        const sample = reports[0];
        console.log(`[샘플 데이터] ID: ${sample.reportId}`);
        console.log(`[샘플 상태] DB값: '${sample.reportStatus}'`); 
        
        console.log(`[비교 결과] 'Pending' === 'pending' : ${sample.reportStatus === 'pending'}`);

        // 2. 혹시 타입(TargetType)에 공백이 있는가?
        console.log(`[샘플 타입] DB값: '${sample.reportTargetType}'`);

        console.log("============== 진단 종료 ==============");
    }
    // ---------------------------------------------------------
    // 2. [핵심] 대기중인 항목 개수 계산기
const getCount = (type) => {
        // (1) 일단 '대기중'인 것들만 추려냅니다.
        const pendingList = reports.filter(item => 
            item.reportStatus === '대기중' || item.reportStatus === 'PENDING'
        );

        // (2) 전체 탭
        if (type === 'ALL') {
            return pendingList.length;
        }

        // (3) 🔥 영화 댓글 탭 (여기가 핵심!)
        // 인기영화 댓글(moviecomment) OR 유저글 댓글(movieusercomment) 둘 다 카운트
        if (type === 'moviecomment') {
            return pendingList.filter(item => 
                item.reportTargetType === 'moviecomment' || 
                item.reportTargetType === 'movieusercomment'
            ).length;
        }

        // (4) 나머지 (moviepost, musicpost 등은 정확히 일치하는 것만)
        return pendingList.filter(item => item.reportTargetType === type).length;
    };
    // 3. 탭 메뉴 정의 (여기서 개수를 붙여줌)
    const tabs = [
        { label: `전체(${getCount('ALL')})`, value: 'ALL' },
        { label: `영.게시글(${getCount('moviepost')})`, value: 'moviepost' },
        { label: `영.댓글(${getCount('moviecomment')})`, value: 'moviecomment' },
        { label: `음.게시글(${getCount('musicpost')})`, value: 'musicpost' },
        { label: `음.댓글(${getCount('musiccomment')})`, value: 'musiccomment' },
        { label: `자유.게시글(${getCount('boardpost')})`, value: 'boardpost' },
        { label: `자유.댓글(${getCount('boardcomment')})`, value: 'boardcomment' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>신고자 관리</Text>
            </View>

            {/* 탭 메뉴 */}
            <View style={styles.tabContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.value}
                            style={[
                                styles.tabButton,
                                selectedType === tab.value && styles.activeTabButton
                            ]}
                            onPress={() => setSelectedType(tab.value)}
                        >
                            <Text style={[
                                styles.tabText,
                                selectedType === tab.value && styles.activeTabText
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={{ flex: 1 }}>
                {/* 4. 자식에게 데이터(reports)와 새로고침함수(onRefresh)를 넘겨줌 */}
                <ReportAllScreen
                    user={user}
                    filterType={selectedType}
                    allReports={reports}  // 데이터 전달
                    onRefresh={fetchReports} // 상태 변경 후 새로고침용 함수 전달
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#004E89',
    },
    headerTitle: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 18,
    },
    tabContainer: {
        height: 50,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    scrollContent: {
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    tabButton: {
        paddingHorizontal: 14, // 텍스트가 길어졌으니 패딩 조절
        paddingVertical: 8,
        marginRight: 6,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    activeTabButton: {
        backgroundColor: '#004E89',
    },
    tabText: {
        fontSize: 12, // 글자 크기 살짝 줄임
        fontWeight: '600',
        color: '#6B7280',
    },
    activeTabText: {
        color: '#FFFFFF',
    },
});