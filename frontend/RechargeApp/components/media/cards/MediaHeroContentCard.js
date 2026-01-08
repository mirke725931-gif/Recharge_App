import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LoadingAnimation from '../../common/LoadingAnimation';

function MediaHomeContentCard({
  posters = [],
  title,
  subtitle,
  loading,
  contentType,
}) {
  if (loading || posters.length === 0) {
    return (
      <View style={styles.card}>
        <LoadingAnimation style={{width: '100%', aspectRatio: 1 / 1.5}} />
      </View>
    );
  }

  const [index, setIndex] = useState(0);
  const fade = useSharedValue(1);

  const posterStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
  }));

  useEffect(() => {
    const interval = setInterval(() => {
      fade.value = withTiming(0, {duration: 500}, () => {
        runOnJS(nextPoster)();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [posters]);

  const nextPoster = () => {
    setIndex(prev => (prev + 1) % posters.length);
    fade.value = withTiming(1, {duration: 500});
  };

  const getHighQualityPoster = url =>
    url ? url.replace('/w500/', '/w780/') : url;

  const currentPoster = getHighQualityPoster(posters[index]);

  const isMusic = contentType === 'music';

  const iconName = isMusic ? 'music-note-outline' : 'movie-open-outline';

  const headerTitle = isMusic
    ? '충전 중, 귀가 쉬는 음악'
    : '충전 중, 오늘의 영화 한 편';

  const headerDesc = isMusic
    ? '지금 이 순간에 어울리는 음악을 추천해드려요'
    : '지금 이 순간에 어울리는 영화를 추천해드려요';

  /* ================= 렌더 ================= */
  return (
    <>
      {/* ===== BoardScreen 스타일 헤더 ===== */}
      <View style={styles.pageHeader}>
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons
            name={iconName}
            size={24}
            color="#004E89"
            style={{marginRight: 8, marginTop: 4}}
          />
          <Text style={styles.headerTitle}>{headerTitle}</Text>
        </View>
      </View>

      {/* ===== BoardScreen 스타일 공지 ===== */}
      <View style={styles.noticeBar}>
        <Text style={styles.noticeText} numberOfLines={1}>
          {headerDesc}
        </Text>
      </View>

      {/* ===== 포스터 카드 ===== */}
      <View style={styles.card}>
        <Animated.Image
          source={{uri: currentPoster}}
          style={[styles.poster, posterStyle]}
          resizeMode="cover"
        />

        <View style={styles.textBox}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginTop: 10,
  },

  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
  },

  /* ===== Notice ===== */
  noticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
    marginHorizontal: 16,
  },

  noticeText: {
    color: '#555',
    fontSize: 13,
    flex: 1,
  },

  /* ===== Card ===== */
  card: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    marginBottom: 20,

    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
  },

  poster: {
    width: '100%',
    aspectRatio: 1 / 1.5,
    backgroundColor: '#eee',
  },

  textBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
  },
});

export default MediaHomeContentCard;
