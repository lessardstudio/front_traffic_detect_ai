import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type NavigationProp = {
  navigate: (screen: string, params?: any) => void;
};

type ExamResult = {
  id: number;
  correctAnswers: number;
  totalQuestions: number;
  examTime: string;
  timestamp: string;
  urlRef: string;
};

export default function Explore() {
  const [login, setLogin] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const IP: string = '150.241.105.221';
  const PORT: number = 80;
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    const checkToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (error) {
        //console.error('Ошибка при получении токена:', error);
        setErrorMessage('Ошибка при получении токена: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
      }
    };
    
    checkToken();
  }, []);

  useEffect(() => {
    if (token) {
      fetchUserInfo();
      fetchExamResults();
      
      // Устанавливаем интервал для автоматического обновления результатов каждые 30 секунд
      const intervalId = setInterval(() => {
        console.log('Автоматическое обновление результатов экзаменов');
        fetchExamResults();
      }, 7000); // Увеличиваем интервал до 7 секунд
      
      // Очищаем интервал при размонтировании компонента или изменении токена
      return () => clearInterval(intervalId);
    }
  }, [token]);

  const handleLogin = async () => {
    if (!login || !password) {
      setErrorMessage('Пожалуйста, введите логин и пароль');
      return;
    }

    try {
      const body = new URLSearchParams({
        username: login,
        password: password,
        grant_type: 'password'
      }).toString();

      const response = await fetch(`http://${IP}:${PORT}/token`, {
        method: 'POST',
        body: body,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.access_token) {
        setToken(data.access_token);
        await AsyncStorage.setItem('authToken', data.access_token);
        setErrorMessage('');
        console.log('Токен получен:', data.access_token);
      } else {
        setErrorMessage('Ошибка авторизации: токен не получен');
      }
    } catch (error) {
      //console.error('Ошибка авторизации:', error);
      setErrorMessage('Ошибка авторизации: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  };

  const handleRegister = async () => {
    if (!login || !password) {
      setErrorMessage('Пожалуйста, введите логин и пароль');
      return;
    }

    try {
      const response = await fetch(`http://${IP}:${PORT}/users/`, {
        method: 'POST',
        body: JSON.stringify({
          username: login,
          password: password,
          email: email
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.username) {
        setErrorMessage('Регистрация успешна! Теперь вы можете войти.');
        setIsRegisterMode(false);
      } else {
        setErrorMessage('Ошибка регистрации: пользователь не создан');
      }
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      setErrorMessage('Ошибка регистрации: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  };

  const fetchUserInfo = async () => {
    if (!token) return;

    try {
      const response = await fetch(`http://${IP}:${PORT}/users/me/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          await AsyncStorage.removeItem('authToken');
          setToken(null);
          setUserInfo(null);
          setErrorMessage('Сессия истекла. Пожалуйста, войдите снова.');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUserInfo(data);
      console.log('Информация о пользователе:', data);
    } catch (error) {
      console.error('Ошибка получения информации о пользователе:', error);
      setErrorMessage('Ошибка получения информации о пользователе: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  };

  const fetchExamResults = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      // Получение результатов экзаменов с помощью API
      const response = await fetch(`http://${IP}:${PORT}/exam_results`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          await AsyncStorage.removeItem('authToken');
          setToken(null);
          setUserInfo(null);
          setErrorMessage('Сессия истекла. Пожалуйста, войдите снова.');
          setIsLoading(false);
          return;
        }
        const errorText = await response.text();
        console.error(`Ошибка при получении результатов экзаменов: HTTP ${response.status}`, errorText);
        // Если не удается получить данные с сервера, используем фиктивные данные
        if (response.status === 404 || response.status === 405) {
          setExamResults([]);
        }
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      // Сортируем результаты по времени - от новых к старым
      const sortedData = Array.isArray(data) 
        ? data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        : data;
      
      // Проверяем, изменились ли данные, чтобы избежать ненужных обновлений состояния
      const isDataChanged = JSON.stringify(sortedData) !== JSON.stringify(examResults);
      
      if (isDataChanged) {
        console.log('Данные обновлены');
        setExamResults(sortedData);
      } else {
        console.log('Данные не изменились');
      }
      
    } catch (error) {
      console.error('Ошибка при получении результатов экзаменов:', error);
      
      // Если произошла ошибка, используем фиктивные данные
      console.log('Используем фиктивные данные из-за ошибки');
      const mockExamResults: ExamResult[] = [
        {
          id: 1,
          correctAnswers: 18,
          totalQuestions: 20,
          examTime: '05:30',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          urlRef: 'https://www.drom.ru/pdd/exam/result'
        },
        {
          id: 2,
          correctAnswers: 15,
          totalQuestions: 20,
          examTime: '06:15',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          urlRef: 'https://www.drom.ru/pdd/exam/result'
        },
        {
          id: 3,
          correctAnswers: 19,
          totalQuestions: 20,
          examTime: '04:45',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          urlRef: 'https://www.drom.ru/pdd/themes/traffic_signs/training/result'
        }
      ];
      
      // Сортируем от новых к старым
      mockExamResults.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setExamResults(mockExamResults);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Преобразуем в московское время (UTC+3)
      const date = new Date(dateString);
      
      // Создаем дату в UTC
      const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
      
      // Добавляем 3 часа для московского времени (UTC+3)
      const moscowDate = new Date(utcDate.getTime() + 6 * 60 * 60 * 1000);
      
      // Форматируем дату
      const day = moscowDate.getDate().toString().padStart(2, '0');
      const month = (moscowDate.getMonth() + 1).toString().padStart(2, '0');
      const year = moscowDate.getFullYear();
      const hours = moscowDate.getHours().toString().padStart(2, '0');
      const minutes = moscowDate.getMinutes().toString().padStart(2, '0');

      return `${day}.${month}.${year} ${hours}:${minutes} (МСК)`;
    } catch (error) {
      console.error('Ошибка при форматировании даты:', error);
      return dateString;
    }
  };

  const getExamTypeFromUrl = (url: string) => {
    if (url.includes('exam/result')) {
      return 'Экзамен ПДД';
    } else if (url.includes('traffic_signs/training/result')) {
      return 'Знаки ПДД';
    } else {
      return 'Экзамен ПДД';
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setErrorMessage('');
    setLogin('');
    setPassword('');
    setEmail('');
  };

  const handleLogout = async () => {
    setToken(null);
    setUserInfo(null);
    setErrorMessage('');
    await AsyncStorage.removeItem('authToken');
    console.log('Пользователь вышел из системы');
  };

  const navigateToAllResults = () => {
    // Переход к странице со всеми результатами
    // Преобразуем массив результатов в строку JSON для передачи через параметры навигации
    const jsonExamResults = JSON.stringify(examResults);
    navigation.navigate('AllResultsScreen', { 
      examResults: jsonExamResults 
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>{isRegisterMode ? 'Регистрация' : 'Авторизация'}</Text>
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
        {token ? (
          <Text style={styles.successText}>Авторизация успешна! Токен сохранен.</Text>
        ) : null}
        {userInfo && token ? (
          <View style={styles.userInfo}>
            <Text style={styles.userInfoText}>Информация о пользователе:</Text>
            <Text style={styles.userInfoText}>Имя пользователя: {userInfo.username}</Text>
            {/* Добавьте другие поля из ответа API, если они есть */}
            
            {/* Блок с результатами экзаменов */}
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Последние результаты экзаменов:</Text>
              
              {/* {isLoading ? (
                <Text style={styles.loadingText}>Загрузка результатов...</Text>
              ) : */}
              {examResults.length > 0 ? (
                <>
                  {examResults
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 5)
                    .map((result, index) => (
                    <View key={result.id || index} style={styles.resultItem}>
                      <Text style={styles.resultType}>{getExamTypeFromUrl(result.urlRef)}</Text>
                      <Text style={styles.resultText}>
                        Результат: {result.correctAnswers} из {result.totalQuestions} 
                        ({Math.round((result.correctAnswers / result.totalQuestions) * 100)}%)
                      </Text>
                      <Text style={styles.resultTime}>
                        Время: {formatDate(result.timestamp)}
                      </Text>
                    </View>
                  ))}
                  
                  <TouchableOpacity style={styles.allResultsButton} onPress={navigateToAllResults}>
                    <Text style={styles.allResultsButtonText}>Все результаты</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.noResultsText}>У вас пока нет результатов экзаменов</Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.linkButtonBlue}
              onPress={() => {
                navigation.navigate('WebViewScreen', { url: 'https://www.drom.ru/pdd/pdd/' });
              }}
            >
              <Text style={styles.linkText}>Правила дорожного движения</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => {
                navigation.navigate('WebViewScreen', { url: 'https://www.drom.ru/pdd/pdd/signs/' });
              }}
            >
              <Text style={styles.linkText}>Знаки ПДД</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.linkButtonOrange}
              onPress={() => {
                navigation.navigate('WebViewScreen', { url: 'https://www.drom.ru/pdd/exam/' });
              }}
            >
              <Text style={styles.linkText}>Тестовый экзамен ПДД(билеты)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Выйти</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {!token && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Логин"
              value={login}
              onChangeText={setLogin}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Пароль"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            {isRegisterMode && (
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            )}
            <TouchableOpacity style={styles.button} onPress={isRegisterMode ? handleRegister : handleLogin}>
              <Text style={styles.buttonText}>{isRegisterMode ? 'Зарегистрироваться' : 'Войти'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleMode}>
              <Text style={styles.toggleText}>
                {isRegisterMode ? 'Уже есть аккаунт? Войдите' : 'Нет аккаунта? Зарегистрируйтесь'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
    marginTop: 40,
    paddingBottom: 180,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: 'white',
    fontSize: 16,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  successText: {
    color: 'green',
    marginBottom: 15,
    textAlign: 'center',
  },
  toggleText: {
    color: '#007AFF',
    marginTop: 15,
    textAlign: 'center',
  },
  userInfo: {
    marginTop: 20,
    width: '100%',
    padding: 10,
    backgroundColor: '#e9e9e9',
    borderRadius: 5,
  },
  userInfoText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  logoutButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#FF3B30',
    borderRadius: 5,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  linkButtonBlue: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  linkButtonOrange: {
    backgroundColor: '#FFA500',
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
  linkText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  toggleButton: {
    backgroundColor: '#5856D6',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  resultsContainer: {
    marginTop: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    minHeight: 550,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  resultType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  resultTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  noResultsText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#888',
    textAlign: 'center',
    padding: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    padding: 10,
  },
  allResultsButton: {
    backgroundColor: '#5856D6',
    padding: 12,
    borderRadius: 5,
    marginTop: 15,
    alignItems: 'center',
  },
  allResultsButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
