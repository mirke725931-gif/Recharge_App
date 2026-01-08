import React, {useEffect, useState, useCallback} from 'react';
import {ScrollView, StyleSheet, View, Text} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import MediaHomeContentCard from '../../../components/media/cards/MediaHeroContentCard';
import AiRecommendSection from '../../../components/media/cards/AiRecommendCard';
import Button from '../../../components/common/Button';
import GenreSelector from '../../../components/media/cards/GenreSelector';
import MediaListSection from '../../../components/media/lists/MediaListsSection';
import MovieAiRecommendModal from '../../../components/media/contents/MovieAiRecommendModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  fetchUpcomingMovies,
  fetchPopularMovies,
  fetchMoviePostList,
} from '../../../utils/Movieapi';

const TMDB_GENRES = [
  {id: 'ALL', name: '전체'},
  {id: 'TMDB1', name: '액션'},
  {id: 'TMDB2', name: '코미디'},
  {id: 'TMDB3', name: '가족'},
  {id: 'TMDB4', name: '판타지'},
  {id: 'TMDB5', name: '공포'},
  {id: 'TMDB6', name: '로맨스'},
  {id: 'TMDB7', name: 'SF'},
  {id: 'TMDB8', name: '스릴러'},
  {id: 'TMDB9', name: '어드벤처'},
  {id: 'TMDB10', name: '애니메이션'},
];

function FindMovieScreen() {
  const navigation = useNavigation();
  const [showAiModal, setShowAiModal] = useState(false);
  const [newMovies, setNewMovies] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [moviePosts, setMoviePosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showPopularInfo, setShowPopularInfo] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadUpcomingMovies();
      loadPopularMovies();
      loadMoviePosts();
    }, []),
  );

  // 개봉 예정 영화 호출
  const loadUpcomingMovies = async () => {
    try {
      const data = await fetchUpcomingMovies();

      const sliced = data.slice(0, 5);

      setLoading(false);

      const formatted = sliced.map(item => ({
        id: item.movieId,
        image: item.moviePoster,
      }));

      setNewMovies(formatted);
    } catch (err) {
      console.log('영화 데이터 로드 실패:', err);
    }
  };

  //  인기 영화 호출
  const loadPopularMovies = async () => {
    try {
      const data = await fetchPopularMovies();

      const formatted = data.map(item => ({
        id: item.movieId,
        title: item.movieTitle,
        image: item.moviePoster,
        commonCategoryId: item.commonCategoryId,
      }));
      setPopularMovies(formatted);
    } catch (err) {
      console.log('인기영화 로드 실패:', err);
    }
  };

  // 카테고리 필터
  const filteredPopularMovies =
    selectedCategory === 'ALL'
      ? popularMovies
      : popularMovies.filter(
          movie => movie.commonCategoryId === selectedCategory,
        );

  // 이용자 게시글 호출
  const loadMoviePosts = async () => {
    try {
      const data = await fetchMoviePostList();

      // DB → 화면용으로 변환
      const formatted = data.map(item => ({
        id: item.moviePostId, // 게시글 ID
        title: item.moviePostTitle, // 게시글 제목
        author: item.userNickname, // 작성자 닉네임
        image:
          item.moviePoster ||
          'https://dummyimage.com/393x590/cccccc/000000&text=Poster',
      }));

      setMoviePosts(formatted);
    } catch (e) {
      console.log('게시글 목록 불러오기 오류:', e);
    }
  };
  // 장르 검색 시 빈 장르면 추천하러 가기 버튼누를 수 잇게
  const handleRecommendPress = () => {
    navigation.navigate('MoviePostScreen');
  };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <MediaHomeContentCard
          title="신작 영화"
          subtitle="곧 극장에서 만나요!"
          posters={newMovies.map(m => m.image)}
          loading={loading}
          contentType="movie"
        />

        {/* ai추천 섹션 */}
        <AiRecommendSection
          title="영화 AI 추천 받기"
          onPress={() => setShowAiModal(true)}
        />

        {/* 장르 선택 */}
        <GenreSelector
          genres={TMDB_GENRES}
          onSelect={genre => {
            setSelectedCategory(genre.id);
          }}
        />

        {/* 인기 추천 */}
        <MediaListSection
          title={
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitleText}>인기영화</Text>

              <MaterialCommunityIcons
                name="help-circle-outline"
                size={18}
                color="#9CA3AF"
                style={{marginLeft: 6}}
                onPress={() => setShowPopularInfo(true)}
              />
            </View>
          }
          items={filteredPopularMovies}
          variant="movie"
          loading={loading}
          onPressItem={card =>
            navigation.navigate('MovieDetail', {
              movieId: card.id,
              type: 'popular',
            })
          }
          onRecommendPress={handleRecommendPress}
        />
        {/*  이용자 추천 */}
        <MediaListSection
          title="이용자 추천영화"
          items={moviePosts}
          variant="movie"
          loading={loading}
          onPressItem={card =>
            navigation.navigate('MovieDetail', {
              movieId: card.id,
              type: 'post',
            })
          }
        />

        <View style={styles.bottomArea}>
          <Button
            type="submit"
            text="영화 추천하러 가기"
            height={50}
            onPress={() => navigation.navigate('MoviePostScreen')}
          />
        </View>
      </ScrollView>
      {/* ai 모달 */}
      <MovieAiRecommendModal
        visible={showAiModal}
        onClose={() => setShowAiModal(false)}
        contentType="movie"
        onResultPress={(item, type) => {
          navigation.navigate('MovieDetail', {
            movieId: item.id,
            type: 'popular',
          });
        }}
      />
      {showPopularInfo && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>인기영화 추천 기준</Text>

            <Text style={styles.modalDesc}>
              본 추천 서비스는 TMDB API를 기반으로{'\n'}
              현재 전 세계적으로 인기가 높은 영화를 분석하여{'\n'}
              사용자에게 추천하는 기능입니다.
            </Text>

            <Button
              type="submit"
              text="확인"
              height={40}
              onPress={() => setShowPopularInfo(false)}
            />
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9F9',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    padding: 16,
  },
  bottomArea: {
    paddingHorizontal: 16,
    paddingVertical: 30,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sectionTitleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },

  /* ===== Modal ===== */
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalBox: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111',
  },

  modalDesc: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 20,
  },
});

export default FindMovieScreen;
