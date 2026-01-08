import React from "react";
import { View, FlatList, Text, Alert, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ReportItem from "../../components/admin/ReportItem";
import { updateReportStatus } from "../../utils/ReportApi";

export default function ReportAllScreen({ user, filterType, allReports, onRefresh }) {

    const navigation = useNavigation();

    // 1. 🔥 [수정됨] 필터링 로직 (탭 메뉴와 1:1 매칭)
    const getFilteredReports = () => {
        if (!allReports) return [];

        // (1) 전체 보기
        if (!filterType || filterType === 'ALL') {
            return allReports;
        }

        // (2) 영화 댓글 탭인 경우 (중요!)
        // 'moviecomment'(인기영화댓글) 와 'movieusercomment'(유저글댓글) 두 가지를 다 보여줌
        if (filterType === 'moviecomment') {
            return allReports.filter(item =>
                item.reportTargetType === 'moviecomment' ||
                item.reportTargetType === 'movieusercomment'
            );
        }

        // (3) 나머지 (moviepost, musicpost, musiccomment, boardpost, boardcomment)
        // AdminScreen에서 보내준 값과 DB의 reportTargetType이 정확히 일치하는 것만 보여줌
        return allReports.filter(item => item.reportTargetType === filterType);
    };

    const filteredData = getFilteredReports();
    
    // 2. 상세 이동 로직 (아까 만든 로직 적용)
    const handlePressDetail = (report) => {
        const type = report.reportTargetType;
        const targetId = report.reportTargetId;
        const realId = report.postId; // XML에서 계산해준 부모 ID (글번호 or 영화번호)

        if (!realId) {
            Alert.alert("오류", "이동할 게시글 정보를 찾을 수 없습니다.");
            return;
        }

        let screenName = "";
        let params = {};

        // ─────────────────────────────────────────────
        // 🎬 [영화] 3가지 케이스 분기
        // ─────────────────────────────────────────────
        if (type.includes("movie")) {
            screenName = "MovieDetail";

            // A. 사용자 추천글 관련 (글 본문 or 그 글의 댓글) -> type: 'post'
            if (type === 'moviepost' || type === 'movieusercomment') {
                params = {
                    movieId: realId,
                    type: 'post',         // 사용자 추천글 모드
                    moviePostId: realId,
                };
            }
            // B. 인기 영화 관련 (인기 영화의 댓글) -> type: 'popular'
            else if (type === 'moviecomment') {
                params = {
                    movieId: realId,
                    type: 'popular',      // 인기 영화 정보 모드
                };
            }
            // 혹시 모를 예외 처리 (기본값)
            else {
                params = { movieId: realId, type: 'post' };
            }

        }
        // 🎵 [음악]
        else if (type.includes("music")) {
            screenName = "MusicDetail";
            params = {
                musicPostId: realId,
                postId: realId
            };
        }
        // 📝 [게시판]
        else if (type.includes("board") || type.includes("community")) {
            screenName = "BoardDetail";
            params = {
                postId: realId,
                communityPostId: realId
            };
        }

        if (!screenName) return;

        // ✅ [공통] 댓글 신고인 경우 스크롤 위치 전달
        if (type.endsWith("comment") || type === 'movieusercomment') {
            params.scrollToCommentId = targetId;
        }

        console.log(`[Admin] 이동: ${screenName}, ID: ${realId}, Type: ${params.type || 'N/A'}`);
        navigation.navigate(screenName, params);
    };

    // 3. 상태 변경 로직
    const handleChangeStatus = async (reportId, newStatus) => {
        try {
            if (!user || !user.userId) {
                Alert.alert("오류", "관리자 정보가 없습니다.");
                return;
            }
            const adminId = user.userId;

            await updateReportStatus(reportId, newStatus, adminId);
            Alert.alert("성공", "처리 상태가 변경되었습니다.");

            if (onRefresh) {
                onRefresh();
            }

        } catch (error) {
            console.error(error);
            Alert.alert("오류", "상태 변경 실패");
        }
    };

    if (filteredData.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.noDataText}>
                    {filterType === 'ALL'
                        ? "신고된 내역이 없습니다."
                        : "해당 카테고리의 신고 내역이 없습니다."}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={filteredData}
                keyExtractor={(item) => item.reportId.toString()}
                renderItem={({ item }) => (
                    <ReportItem
                        report={item}
                        onPressDetail={() => handlePressDetail(item)}
                        onChangeStatus={handleChangeStatus}
                    />
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        padding: 10,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataText: {
        fontSize: 16,
        color: '#888',
    }
});
