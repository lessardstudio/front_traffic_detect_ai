import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import {
  Pressable,
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
import { IconSymbol } from '@/components/ui/IconSymbol';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Review {
  id: number;
  content: string;
  rating: number;
  created_at: string;
  updated_at: string;
  user_id: number;
}

export default function ReviewsScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newReview, setNewReview] = useState({ content: '', rating: 5 });
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const router = useRouter();

  const fetchReviews = async () => {
    try {
      const response = await fetch('http://150.241.105.221/reviews/');
      const data = await response.json();
      setReviews(data);
    } catch (error) {
      console.error('Ошибка при загрузке отзывов:', error);
    }
  };

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      Alert.alert(
        'Требуется авторизация',
        'Необходимо авторизоваться для отправки отзыва',
        [
          {
            text: 'Отмена',
            style: 'cancel',
          },
          {
            text: 'Войти',
            onPress: () => {
              router.push('/explore');
            },
          },
        ],
      );
      return null;
    }
    return token;
  };

  const submitReview = async () => {
    try {
      const token = await checkAuth();
      if (!token) return;

      const response = await fetch('http://150.241.105.221/reviews/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newReview),
      });

      if (response.ok) {
        Alert.alert('Успех', 'Ваш отзыв успешно отправлен');
        setModalVisible(false);
        setNewReview({ content: '', rating: 5 });
        fetchReviews();
      } else {
        if (response.status === 401) {
          Alert.alert('Ошибка', 'Необходимо авторизоваться снова');
          router.push('/explore');
        } else {
          Alert.alert('Ошибка', 'Не удалось отправить отзыв');
        }
      }
    } catch (error) {
      console.error('Ошибка при отправке отзыва:', error);
      Alert.alert('Ошибка', 'Произошла ошибка при отправке отзыва');
    }
  };

  const handleAddReview = async () => {
    const token = await checkAuth();
    if (token) {
      setModalVisible(true);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchReviews().finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    fetchReviews();
  }, []);

  const renderStars = (rating: number) => {
    return '⭐'.repeat(rating);
  };

  const renderRatingButtons = () => {
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <TouchableOpacity
            key={rating}
            onPress={() => setNewReview(prev => ({ ...prev, rating }))}
            style={[
              styles.ratingButton,
              newReview.rating === rating && styles.selectedRating
            ]}
          >
            <Text style={[
              styles.ratingButtonText,
              newReview.rating === rating && styles.selectedRatingText
            ]}>{rating}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

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
        <TouchableOpacity 
          onPress={handleAddReview}
          style={styles.addReviewButton}
        >
          <Text style={styles.addReviewButtonText}>Оставить отзыв</Text>
        </TouchableOpacity>
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
            <Text style={styles.modalTitle}>Новый отзыв</Text>
            
            <Text style={styles.label}>Оценка:</Text>
            {renderRatingButtons()}
            
            <Text style={styles.label}>Ваш отзыв:</Text>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={4}
              value={newReview.content}
              onChangeText={(text) => setNewReview(prev => ({ ...prev, content: text }))}
              placeholder="Напишите ваш отзыв здесь..."
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
                onPress={submitReview}
              >
                <Text style={styles.buttonText}>Отправить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Stack.Screen options={{ title: 'Отзывы' }} />
      <Text style={styles.title}>Отзывы</Text>
      
      <FlatList
        data={reviews}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <View style={styles.reviewItem}>
            <Text style={styles.rating}>
              {renderStars(item.rating)}
            </Text>
            <Text style={styles.reviewContent}>{item.content}</Text>
            <Text style={styles.reviewDate}>
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
  addReviewButton: {
    padding: 10,
    backgroundColor: '#007AFF',
    marginRight: 10,
    borderRadius: 5
  },
  addReviewButtonText: {
    fontSize: 16,
    color: '#fff'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000'
  },
  reviewItem: {
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
  rating: {
    fontSize: 20,
    marginBottom: 8,
  },
  reviewContent: {
    fontSize: 14,
    marginBottom: 8,
  },
  reviewDate: {
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
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  ratingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRating: {
    backgroundColor: '#007AFF',
  },
  ratingButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  selectedRatingText: {
    color: '#fff',
  },
});
