import React, {useState} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import TextInput from '../common/TextInput';
import Button from '../common/Button';
import {checkUserNickname, updateUserInfo} from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NicknameModal({visible, onClose, userId, onSuccess}) {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (nickname.length < 2) {
      Alert.alert('닉네임 오류', '닉네임은 최소 2자 이상입니다.');
      return;
    }

    try {
      setLoading(true);

      const exists = await checkUserNickname(nickname);
      if (exists) {
        Alert.alert('중복 닉네임', '이미 사용 중인 닉네임입니다.');
        return;
      }

      await updateUserInfo({
        userId,
        userNickname: nickname,
      });

      await AsyncStorage.setItem('userNickname', nickname);

      onSuccess(); // 로그인 완료 처리
      onClose();
    } catch (e) {
      Alert.alert('오류', '닉네임 설정 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.title}>닉네임 설정</Text>
          <Text style={styles.desc}>
            Re:charge에서 사용할 닉네임을 입력해주세요
          </Text>

          <TextInput
            placeholder="닉네임 입력"
            value={nickname}
            onChangeText={setNickname}
          />

          <Button
            text="확인"
            onPress={handleSubmit}
            disabled={loading}
            style={{marginTop: 15}}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  desc: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 15,
  },
  cancel: {
    marginTop: 12,
    color: '#9ca3af',
  },
});
