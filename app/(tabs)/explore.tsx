import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type NavigationProp = {
  navigate: (screen: string, params?: { url: string }) => void;
};

export default function Explore() {
  const [login, setLogin] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const IP: string = '150.241.105.221';
  const PORT: number = 80;
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    if (token) {
      fetchUserInfo();
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
        setErrorMessage('');
        console.log('Токен получен:', data.access_token);
      } else {
        setErrorMessage('Ошибка авторизации: токен не получен');
      }
    } catch (error) {
      console.error('Ошибка авторизации:', error);
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

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setErrorMessage('');
    setLogin('');
    setPassword('');
    setEmail('');
  };

  const handleLogout = () => {
    setToken(null);
    setUserInfo(null);
    setErrorMessage('');
    console.log('Пользователь вышел из системы');
  };

  return (
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
              navigation.navigate('WebViewScreen', { url: 'https://www.pdd24.com/pdd-onlain' });
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
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
  }
});
