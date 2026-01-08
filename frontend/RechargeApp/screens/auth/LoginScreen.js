import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import TextInput from '../../components/common/TextInput';
import Button from '../../components/common/Button';
import {login} from '../../utils/api'; // api.js의 login 함수
import AsyncStorage from '@react-native-async-storage/async-storage';
import {saveFcmToken} from '../../utils/api';
import {login as kakaoLogin} from '@react-native-seoul/kakao-login';
import api from '../../utils/api'; // axios instance
import NicknameModal from '../../components/common/NicknameModal';

export default function LoginScreen({navigation, route}) {
  const [userId, setUserId] = useState('');
  const [userPwd, setUserPwd] = useState('');
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [kakaoUserId, setKakaoUserId] = useState(null);

  const passwordRef = useRef(null);
  
  // App.js에서 AuthStack을 통해 전달받은 상태 변경 함수들
  const {
    setIsLoggedIn,
    setUserRole,
    setUserId: setGlobalUserId,
  } = route.params || {};

  // 2. 카카오 로그인 핸들러
  const handleKakaoLogin = async () => {
    try {
      const token = await kakaoLogin();

      const res = await api.post('/user/kakao-login', {
        accessToken: token.accessToken,
      });

      const user = res.data;

      // 🔥 공통 필수 저장 (일반 로그인과 동일)
      if (user.token) {
        await AsyncStorage.setItem('authToken', user.token);
        await AsyncStorage.setItem('userId', String(user.userId)); // 문자열 변환 안전장치
        
        const role = user.userRole || 'USER';
        await AsyncStorage.setItem('userRole', role);

        // ⚠️ 닉네임은 있을 때만 저장
        if (user.userNickname) {
          await AsyncStorage.setItem('userNickname', user.userNickname);
        }

        // 🔥 FCM 토큰 저장
        saveFcmToken(user.userId);

        // ★★★ [중요] App.js 상태 즉시 업데이트 (이게 있어야 탭이 바로 바뀜)
        if (setUserRole) setUserRole(role);
        if (setGlobalUserId) setGlobalUserId(String(user.userId));
      }

      // 🔥 닉네임 없으면 → 모달
      if (user.needNickname) {
        setKakaoUserId(user.userId);
        setShowNicknameModal(true);
        return;
      }

      // 🔥 닉네임 있으면 바로 로그인 완료 -> MainTabs로 전환
      if (setIsLoggedIn) setIsLoggedIn(true);

    } catch (err) {
      console.error('Kakao Login Error:', err);
      Alert.alert('로그인 실패', '카카오 로그인 중 오류가 발생했습니다.');
    }
  };

  // 3. 일반 로그인 핸들러
  const handleLogin = async () => {
    try {
      // login API가 { token, userId, userRole, ... } 형태의 객체를 반환한다고 가정
      const user = await login({userId, userPwd, deviceOs: Platform.OS});
      
      console.log('Login Response:', user); // 디버깅용 로그

      // 1. AsyncStorage 저장 (앱 재실행 시 유지용)
      await AsyncStorage.setItem('authToken', user.token);
      
      // userRole과 userId가 응답에 포함되어 있어야 합니다.
      const role = user.userRole || 'USER'; 
      await AsyncStorage.setItem('userRole', role);
      await AsyncStorage.setItem('userId', String(userId)); // 입력한 ID 사용 혹은 user.userId

      // 2. App.js 상태 업데이트 (앱 실행 중 즉시 반영용) ★★★
      if (setUserRole) setUserRole(role);
      if (setGlobalUserId) setGlobalUserId(String(userId));

      // 3. FCM 토큰 저장
      saveFcmToken(userId);

      // 4. 화면 전환
      if (setIsLoggedIn) setIsLoggedIn(true);

    } catch (error) {
      console.error('Login Error:', error);
      Alert.alert('로그인 실패', '아이디 또는 비밀번호를 확인해주세요.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>로그인</Text>
        <Text style={styles.subText}>Re:charge에 오신 것을 환영합니다.</Text>
      </View>

      <View style={styles.centerBox}>
        <TextInput
          placeholder="아이디를 입력하세요."
          width="85%"
          value={userId}
          onChangeText={setUserId}
          style={styles.idInput}
        />
        <TextInput
          ref={passwordRef}
          placeholder="비밀번호를 입력하세요."
          width="85%"
          value={userPwd}
          onChangeText={setUserPwd}
          secureTextEntry
        />
        <Button
          text="로그인"
          type="submit"
          width="85%"
          style={{marginTop: 25}}
          onPress={handleLogin}
        />

        {/* 카카오 로그인 버튼 */}
        <TouchableOpacity style={styles.kakaoButton} onPress={handleKakaoLogin}>
          <Text style={styles.kakaoText}>카카오로 시작하기</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.orText}>또는</Text>
          <View style={styles.line} />
        </View>

        {/* 아이디/비밀번호 찾기 영역 */}
        <View style={styles.findArea}>
          <Pressable onPress={() => navigation.navigate('FindIdScreen')}>
            {({pressed}) => (
              <Text
                style={[
                  styles.findText,
                  {textDecorationLine: 'underline'},
                  pressed && styles.pressedText,
                ]}>
                아이디
              </Text>
            )}
          </Pressable>
          <Text style={styles.findAreaText}>또는</Text>
          <Pressable onPress={() => navigation.navigate('FindPwdScreen')}>
            {({pressed}) => (
              <Text
                style={[
                  styles.findText,
                  {textDecorationLine: 'underline'},
                  pressed && styles.pressedText,
                ]}>
                비밀번호
              </Text>
            )}
          </Pressable>

          <Text style={styles.findAreaText}>를 잊으셨나요?</Text>
        </View>

        {/* 가입하기 영역 */}
        <View style={styles.findArea}>
          <Text style={styles.findAreaText}>계정이 없으시다면</Text>
          <Pressable
            onPress={() => navigation.navigate('TermsAgreementScreen')}>
            {({pressed}) => (
              <Text
                style={[
                  styles.findText,
                  {textDecorationLine: 'underline'},
                  pressed && styles.pressedText,
                ]}>
                가입하기
              </Text>
            )}
          </Pressable>
        </View>

        <NicknameModal
          visible={showNicknameModal}
          userId={kakaoUserId}
          onClose={() => setShowNicknameModal(false)}
          onSuccess={() => {
             // 닉네임 설정 완료 시 로그인 처리
             if (setIsLoggedIn) setIsLoggedIn(true);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {alignItems: 'center', marginBottom: 30},
  headerText: {fontSize: 35, fontWeight: 'bold', color: '#004E89'},
  subText: {fontSize: 13, color: '#374151'},
  centerBox: {width: '100%', alignItems: 'center'},
  idInput: {marginBottom: 15},
  kakaoButton: {
    backgroundColor: '#FEE500', // Official Kakao Yellow
    width: '85%',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
  },
  kakaoText: {color: 'rgba(0, 0, 0, 0.85)', fontSize: 16, fontWeight: 'bold'},
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '85%',
  },
  line: {flex: 1, height: 1, backgroundColor: '#eee'},
  orText: {marginHorizontal: 10, color: '#999'},
  findArea: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
  },
  findText: {
    color: '#004E89',
    fontWeight: '800',
  },
  findAreaText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    paddingRight: 3,
    paddingLeft: 3,
  },
  pressedText: {
    opacity: 0.6, // 눌렸을 때 시각적 피드백
  },
});