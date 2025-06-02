import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import {
  FlatList,
  RefreshControl,
  ActivityIndicator,
  AppState,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Alert,
  KeyboardAvoidingView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface News {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function NewsScreen() {
  const [news, setNews] = useState<News[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newNews, setNewNews] = useState({ title: '', content: '' });
  const router = useRouter();

  const checkAdminStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setIsAdmin(false);
        return;
      }
      
      const response = await fetch('http://150.241.105.221/admins/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Ошибка при проверке статуса админа:', error);
      setIsAdmin(false);
    }
  };

  const fetchNews = async () => {
    try {
      const response = await fetch('http://150.241.105.221/news/');
      const data = await response.json();
      setNews(data);
    } catch (error) {
      console.error('Ошибка при загрузке новостей:', error);
    }
  };

  const createNews = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Ошибка', 'Необходимо авторизоваться');
        router.push('/explore');
        return;
      }

      const response = await fetch('http://150.241.105.221/news/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newNews),
      });

      if (response.ok) {
        Alert.alert('Успех', 'Новость успешно создана');
        setModalVisible(false);
        setNewNews({ title: '', content: '' });
        fetchNews();
      } else {
        if (response.status === 401) {
          Alert.alert('Ошибка', 'Необходимо авторизоваться снова');
          router.push('/explore');
        } else {
          Alert.alert('Ошибка', 'Не удалось создать новость');
        }
      }
    } catch (error) {
      console.error('Ошибка при создании новости:', error);
      Alert.alert('Ошибка', 'Произошла ошибка при создании новости');
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchNews().finally(() => setRefreshing(false));
  }, []);

  // Следим за изменениями токена
  useEffect(() => {
    const checkToken = async () => {
      await checkAdminStatus();
    };

    // Устанавливаем интервал для периодической проверки токена
    const intervalId = setInterval(checkToken, 1000);

    // Очищаем интервал при размонтировании компонента
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    fetchNews();
    checkAdminStatus();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <View style={styles.backButtonContent}>
            <IconSymbol size={32} name="arrow.left" color="black" />
            <Text style={styles.backButtonText}>Назад</Text>
          </View>
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity 
            onPress={() => setModalVisible(true)}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>Создать новость</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Новая новость</Text>
            
            <Text style={styles.label}>Заголовок:</Text>
            <TextInput
              style={styles.input}
              value={newNews.title}
              onChangeText={(text) => setNewNews(prev => ({ ...prev, title: text }))}
              placeholder="Введите заголовок"
            />
            
            <Text style={styles.label}>Содержание:</Text>
            <TextInput
              style={[styles.input, styles.contentInput]}
              multiline
              numberOfLines={4}
              value={newNews.content}
              onChangeText={(text) => setNewNews(prev => ({ ...prev, content: text }))}
              placeholder="Введите текст новости"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={createNews}
              >
                <Text style={styles.buttonText}>Создать</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Stack.Screen options={{ title: 'Новости' }} />
      <Text style={styles.title}>Новости</Text>
      
      <FlatList
        data={news}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <View style={styles.newsItem}>
            <Text style={styles.newsTitle}>{item.title}</Text>
            <Text style={styles.newsContent}>{item.content}</Text>
            <Text style={styles.newsDate}>
              {new Date(item.created_at).toLocaleDateString('ru-RU')}
            </Text>
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 80,
    marginTop: 50
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  backButton: {
    padding: 0,
    backgroundColor: 'transparent',
    marginTop: 0,
    marginLeft: 10,
    borderRadius: 5,
    alignItems: 'center'
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  backButtonText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 5
  },
  addButton: {
    padding: 10,
    backgroundColor: '#007AFF',
    marginRight: 10,
    borderRadius: 5
  },
  addButtonText: {
    fontSize: 16,
    color: '#fff'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000'
  },
  newsItem: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    backgroundColor: '#fff',
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  newsContent: {
    fontSize: 14,
    marginBottom: 8,
  },
  newsDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  contentInput: {
    textAlignVertical: 'top',
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    padding: 10,
    borderRadius: 5,
    width: '45%',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
});
