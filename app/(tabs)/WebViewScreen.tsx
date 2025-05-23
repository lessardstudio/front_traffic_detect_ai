import { IconSymbol } from '@/components/ui/IconSymbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

// IP и порт сервера API
const IP = '150.241.105.221';
const PORT = '80';

// URL вашего API для отправки результатов экзамена
const API_URL = `http://${IP}:${PORT}/exam_result`;

export default function WebViewScreen() {
  const { url } = useLocalSearchParams();
  const router = useRouter();
  const [injectedJavaScript, setInjectedJavaScript] = useState<string>('');
  const webViewRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState<string>(url as string);
  const [modalVisible, setModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  
  // Определяем, является ли URL страницей drom.ru
  const isDromUrl = typeof currentUrl === 'string' && currentUrl.includes('drom.ru');
  // Проверяем, является ли URL страницей с результатами экзамена ПДД
  const isPddExamResult = typeof currentUrl === 'string' && 
    (currentUrl.includes('drom.ru/pdd/exam/result') || 
     currentUrl.includes('.drom.ru/pdd/themes/traffic_signs/training/result'));
  
  // Функция для отправки результатов экзамена на сервер
  const sendExamResultToServer = async (correctAnswers: number, totalQuestions: number, examTime: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setModalVisible(true);
        return;
      }
      const examResultData = {
        correctAnswers,
        totalQuestions,
        examTime: examTime || '00:00',
        timestamp: new Date().toISOString(),
        urlRef: currentUrl,
      };
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(examResultData),
      });
      if (response.ok) {
        console.log('Результаты экзамена успешно отправлены на сервер');
        setSuccessModalVisible(true);
      } else {
        const errorText = await response.text();
        console.error('Ошибка при отправке результатов экзамена:', response.status, errorText);
        if ([401, 403].includes(response.status)) {
          setModalVisible(true);
        }
      }
    } catch (error) {
      console.error('Ошибка при отправке результатов экзамена:', error);
      setModalVisible(true);
    }
  };
  
  // Обработчик изменения URL в WebView
  const handleNavigationStateChange = (navState: any) => {
    console.log('Изменение URL:', navState.url);
    
    // Обновляем текущий URL
    setCurrentUrl(navState.url);
    
    // Если происходит редирект на страницу результатов
    if (navState.url.includes('drom.ru/pdd/exam/result') || navState.url.includes('.drom.ru/pdd/themes/traffic_signs/training/result')) {
      console.log('Обнаружен редирект на страницу результатов экзамена');
      
      // Вставляем скрипт для извлечения данных с результатами
      if (webViewRef.current) {
        const extractResultsScript = `
          (function() {
            console.log('Выполняется скрипт извлечения результатов после редиректа');
            
            // Функция для извлечения результатов
            function extractExamResults() {
              // Ждем загрузки содержимого
              setTimeout(() => {
                console.log('Извлечение результатов на URL:', window.location.href);
                
                // Получаем HTML-содержимое страницы
                const htmlContent = document.documentElement.innerHTML;
                
                // Поиск блока с результатами - пробуем разные селекторы
                let resultText = '';
                let timeText = '';
                
                // Поиск по классу b-title_type_h3
                const resultBlock = document.querySelector('.b-title_type_h3');
                if (resultBlock) {
                  resultText = resultBlock.textContent || '';
                  console.log('Найден блок с результатами:', resultText);
                }
                
                // Поиск блока с результатами по тексту
                if (!resultText) {
                  document.querySelectorAll('h3, div, p').forEach(element => {
                    const text = element.textContent || '';
                    if (text.includes('Правильных ответов') || text.includes('из')) {
                      resultText = text;
                      console.log('Найден блок с результатами (альт):', resultText);
                    }
                    if (text.includes('Время экзамена')) {
                      timeText = text;
                      console.log('Найден блок с временем:', timeText);
                    }
                  });
                }
                
                // Прямой поиск в HTML
                if (!resultText) {
                  const htmlMatch = htmlContent.match(/Правильных ответов[^0-9]*?(\\d+)[^0-9]*?из[^0-9]*?(\\d+)/i);
                  if (htmlMatch) {
                    resultText = \`Правильных ответов: \${htmlMatch[1]} из \${htmlMatch[2]}\`;
                    console.log('Найдены результаты (из HTML):', resultText);
                  }
                }
                
                // Поиск времени в HTML
                if (!timeText) {
                  const timeMatch = htmlContent.match(/Время экзамена[^0-9]*([0-9:]+)/i);
                  if (timeMatch) {
                    timeText = \`Время экзамена: \${timeMatch[1]}\`;
                    console.log('Найдено время экзамена (из HTML):', timeText);
                  }
                }
                
                // Извлекаем данные из найденного текста
                let correctAnswers = 0;
                let totalQuestions = 0;
                let examTime = '';
                
                // Извлечение количества правильных ответов и общего количества вопросов
                const resultMatch = resultText.match(/(\\d+)[^0-9]+(\\d+)/);
                if (resultMatch) {
                  correctAnswers = parseInt(resultMatch[1], 10);
                  totalQuestions = parseInt(resultMatch[2], 10);
                  console.log('Извлечены результаты:', correctAnswers, 'из', totalQuestions);
                }
                
                // Извлечение времени экзамена
                const timeMatch = timeText.match(/([0-9:]+)/);
                if (timeMatch) {
                  examTime = timeMatch[1];
                  console.log('Извлечено время экзамена:', examTime);
                }
                
                // Проверяем, что мы нашли какие-то данные
                if (correctAnswers > 0 || totalQuestions > 0) {
                  console.log('Отправка результатов в приложение:', correctAnswers, 'из', totalQuestions, 'время:', examTime);
                  
                  // Отправляем данные в React Native
                  let result = window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'examResult',
                    correctAnswers,
                    totalQuestions,
                    examTime,
                    source: 'redirect',
                    url: window.location.href,
                    html: htmlContent.substring(0, 5000)
                  }));

                  console.log('Результат отправки:', result);
                  if (result.ok) {
                  // Показываем уведомление об неуспешной отправке
                  const notification = document.createElement('div');
                  notification.innerText = 'Результаты экзамена получены!';
                  notification.style.position = 'fixed';
                  notification.style.bottom = '20px';
                  notification.style.left = '50%';
                  notification.style.transform = 'translateX(-50%)';
                  notification.style.backgroundColor = 'rgba(128, 28, 0, 0.8)';
                  notification.style.color = 'white';
                  notification.style.padding = '10px 20px';
                  notification.style.borderRadius = '5px';
                  notification.style.zIndex = '9999';
                  document.body.appendChild(notification);
                  
                  setTimeout(() =>  {
                    notification.style.opacity = '0';
                    notification.style.transition = 'opacity 0.5s';
                    setTimeout(() => document.body.removeChild(notification), 500);
                  }, 3000);
                  }
                  else{
                    const notification = document.createElement('div');
                  notification.innerText = 'Нужно авторизоваться или зарегистрироваться';
                  notification.style.position = 'fixed';
                  notification.style.bottom = '20px';
                  notification.style.left = '50%';
                  notification.style.transform = 'translateX(-50%)';
                  notification.style.backgroundColor = 'rgba(231, 42, 9, 0.8)';
                  notification.style.color = 'white';
                  notification.style.padding = '10px 20px';
                  notification.style.borderRadius = '5px';
                  notification.style.zIndex = '9999';
                  document.body.appendChild(notification);
                  
                  setTimeout(() =>  {
                    notification.style.opacity = '0';
                    notification.style.transition = 'opacity 0.5s';
                    setTimeout(() => document.body.removeChild(notification), 500);
                  }, 3000);
                  }
                } else {
                  console.log('Не удалось извлечь данные о результатах экзамена');
                  
                  // Пробуем еще раз через некоторое время - контент мог загрузиться с задержкой
                  setTimeout(extractExamResults, 2000);
                }
              }, 1000); // Задержка для полной загрузки
            }
            
            // Запускаем извлечение результатов
            extractExamResults();
          })();
        `;
        
        webViewRef.current.injectJavaScript(extractResultsScript);
      }
    }
  };
  
  useEffect(() => {
    console.log('Текущий URL:', currentUrl);
    
    if (isPddExamResult) {
      console.log('Обнаружена страница результатов экзамена ПДД');
    }
    
    // JavaScript для работы со страницами drom.ru
    if (isDromUrl) {
      const dromScript = `
        (function() {
          console.log('Скрипт внедрен в WebView для drom.ru');
          
          // Функция для удаления элементов рекламы
          function removeAds() {
            // Удаляем все скрипты с рекламой
            const adScripts = document.querySelectorAll('script[src*="ads"], script[src*="google"]');
            adScripts.forEach(script => script.remove());
            
            // Удаляем все iframe (часто используются для рекламы)
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => iframe.remove());
            
            // Удаляем блоки с классами или id, содержащими рекламные ключевые слова
            const adKeywords = ['ads', 'advert', 'google', 'yandex', 'metrika', 'analytics', 'tracking', 'pixel', 'remarketing'];
            
            // Проверяем все div элементы
            document.querySelectorAll('div').forEach(div => {
              const classNames = div.className || '';
              const id = div.id || '';
              
              for (const keyword of adKeywords) {
                if (classNames.toLowerCase().includes(keyword) || id.toLowerCase().includes(keyword)) {
                  div.style.display = 'none';
                  break;
                }
              }
            });
            
            // Удаляем блоки с классами, специфичными для drom.ru
            const dromAdSelectors = [
              '[data-app-root="drom-header_drom_mobile"]',
              '[data-app-root="footer-mobile"]',
            ];
            
            dromAdSelectors.forEach(selector => {
              document.querySelectorAll(selector).forEach(element => {
                element.style.display = 'none';
              });
            });
          }
          
          // Функция для отслеживания результатов экзамена ПДД
          function checkExamResults() {
            // Проверяем, находимся ли мы на странице результатов экзамена
            if (window.location.href.includes('/pdd/exam/result') || window.location.href.includes('/pdd/themes/traffic_signs/training/result')) {
              console.log('Скрипт обнаружил страницу с результатами экзамена');
              
              // Анализируем HTML-содержимое страницы
              const htmlContent = document.documentElement.innerHTML;
              console.log('URL страницы результатов:', window.location.href);
              
              // Ищем разные возможные селекторы для результатов
              let resultBlock = document.querySelector('h3.b-title_type_h3');
              let resultText = '';
              
              if (resultBlock) {
                resultText = resultBlock.textContent || '';
                console.log('Найден блок с результатами:', resultText);
              } else {
                // Альтернативный поиск по классу
                resultBlock = document.querySelector('.b-title_type_h3');
                if (resultBlock) {
                  resultText = resultBlock.textContent || '';
                  console.log('Найден альтернативный блок с результатами:', resultText);
                } else {
                  // Еще один вариант поиска
                  const titleBlocks = document.querySelectorAll('.b-title');
                  console.log('Найдено блоков с классом b-title:', titleBlocks.length);
                  
                  for (let i = 0; i < titleBlocks.length; i++) {
                    const block = titleBlocks[i];
                    const text = block.textContent || '';
                    console.log('Блок', i, ':', text);
                    
                    if (text.includes('Правильных ответов') || text.includes('Экзамен не сдан') || text.includes('Экзамен сдан')) {
                      resultText = text;
                      resultBlock = block;
                      console.log('Найден блок с информацией о результатах:', resultText);
                      break;
                    }
                  }
                }
              }
              
              // Ищем блок с временем экзамена
              let timeBlock = document.querySelector('div.b-title_type_h3 + div');
              let timeText = '';
              
              if (timeBlock) {
                timeText = timeBlock.textContent || '';
                console.log('Найден блок с временем:', timeText);
              } else {
                // Альтернативный поиск
                const divs = document.querySelectorAll('div');
                for (let i = 0; i < divs.length; i++) {
                  const div = divs[i];
                  const text = div.textContent || '';
                  if (text.includes('Время экзамена')) {
                    timeText = text;
                    timeBlock = div;
                    console.log('Найден альтернативный блок с временем:', timeText);
                    break;
                  }
                }
              }
              
              // Извлекаем количество правильных ответов и общее количество вопросов
              let correctAnswers = 0;
              let totalQuestions = 0;
              let examTime = '';
              
              // Попытка извлечь данные из результата экзамена
              const resultMatch = resultText.match(/(\d+)\\s*из\\s*(\d+)/);
              if (!resultMatch) {
                // Альтернативный вариант поиска
                const altMatch = resultText.match(/(\d+)[^0-9]+(\d+)/);
                if (altMatch) {
                  correctAnswers = parseInt(altMatch[1], 10);
                  totalQuestions = parseInt(altMatch[2], 10);
                  console.log('Найдены результаты (альтернативный метод):', correctAnswers, 'из', totalQuestions);
                } else {
                  // Прямой поиск в исходном коде страницы
                  const htmlMatch = htmlContent.match(/Правильных ответов[^0-9]*(\d+)[^0-9]*из[^0-9]*(\d+)/i);
                  if (htmlMatch) {
                    correctAnswers = parseInt(htmlMatch[1], 10);
                    totalQuestions = parseInt(htmlMatch[2], 10);
                    console.log('Найдены результаты (прямой поиск):', correctAnswers, 'из', totalQuestions);
                  } else {
                    console.log('Не удалось найти результаты экзамена');
                  }
                }
              } else {
                correctAnswers = parseInt(resultMatch[1], 10);
                totalQuestions = parseInt(resultMatch[2], 10);
                console.log('Найдены результаты:', correctAnswers, 'из', totalQuestions);
              }
              
              // Извлекаем время экзамена
              const timeMatch = timeText.match(/(\\d{2}:\\d{2})/);
              if (timeMatch) {
                examTime = timeMatch[1];
                console.log('Найдено время экзамена:', examTime);
              } else {
                // Альтернативный поиск времени
                const altTimeMatch = timeText.match(/Время экзамена[^0-9]*([0-9:]+)/i);
                if (altTimeMatch) {
                  examTime = altTimeMatch[1];
                  console.log('Найдено время экзамена (альтернативный метод):', examTime);
                } else {
                  // Прямой поиск в исходном коде страницы
                  const htmlTimeMatch = htmlContent.match(/Время экзамена[^0-9]*([0-9:]+)/i);
                  if (htmlTimeMatch) {
                    examTime = htmlTimeMatch[1];
                    console.log('Найдено время экзамена (прямой поиск):', examTime);
                  } else {
                    console.log('Не удалось найти время экзамена');
                  }
                }
              }
              
              // Проверяем, что мы нашли всю необходимую информацию
              if (correctAnswers > 0 && totalQuestions > 0) {
                console.log('Отправка данных в приложение:', correctAnswers, 'из', totalQuestions, 'время:', examTime);
                
                // Отправляем данные в React Native
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'examResult',
                  correctAnswers,
                  totalQuestions,
                  examTime,
                  source: 'initial',
                  html: document.documentElement.innerHTML.substring(0, 1000) // Отправляем небольшой кусок HTML для диагностики
                }));
                
                console.log('Результаты экзамена отправлены в приложение');
              } else {
                console.log('Не удалось извлечь полные данные о результатах экзамена');
              }
            }
          }
          
          // Запускаем удаление рекламы при загрузке страницы
          removeAds();
          
          // Проверяем результаты экзамена с задержкой для полной загрузки страницы
          setTimeout(checkExamResults, 1000);
          
          // Повторная проверка через 3 секунды, для случаев динамической загрузки контента
          setTimeout(checkExamResults, 3000);
          
          // Наблюдаем за изменениями в DOM для удаления динамически добавляемой рекламы
          const observer = new MutationObserver(function(mutations) {
            removeAds();
            
            // Проверяем URL, и если это страница результатов - запускаем проверку
            if (window.location.href.includes('/pdd/exam/result') || window.location.href.includes('/pdd/themes/traffic_signs/training/result')) {
              console.log('Обнаружены изменения на странице результатов - запускаем проверку');
              checkExamResults();
            }
          });
          
          // Наблюдаем за изменениями URL
          let lastUrl = window.location.href;
          setInterval(() => {
            if (lastUrl !== window.location.href) {
              console.log('Обнаружено изменение URL внутри страницы:', window.location.href);
              lastUrl = window.location.href;
              
              // Если новый URL - страница результатов, запускаем проверку
              if (window.location.href.includes('/pdd/exam/result') || window.location.href.includes('/pdd/themes/traffic_signs/training/result')) {
                console.log('Обнаружен переход на страницу результатов - запускаем проверку');
                setTimeout(checkExamResults, 1000);
              }
            }
          }, 500);
          
          // Настраиваем наблюдение за всем документом
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true
          });
          
          // Возвращаем true, чтобы WebView знал, что скрипт выполнился
          true;
        })();
      `;
      
      setInjectedJavaScript(dromScript);
    } else {
      setInjectedJavaScript('');
    }
  }, [currentUrl, isPddExamResult]);

  // Обработчик сообщений от WebView
  const handleMessage = (event: any) => {
    try {
      console.log('handleMessage вызван', event.nativeEvent.data);
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'examResult') {
        sendExamResultToServer(data.correctAnswers, data.totalQuestions, data.examTime || '00:00');
      }
    } catch (error) {
      console.error('Ошибка при обработке сообщения от WebView:', error);
    }
  };

  const handleAuthorization = () => {
    setModalVisible(false);
    // Навигация к экрану авторизации
    router.push({ pathname: '/explore' });
  };

  return (
    <View style={{ flex: 1, marginBottom: 80 }}>
      <TouchableOpacity 
        onPress={() => router.back()} 
        style={{ padding: 10, backgroundColor: 'transparent', marginTop: 40, marginLeft: 10, borderRadius: 5, width: 80, alignItems: 'center' }}
      >
        <View style={{flexDirection: 'row', alignItems: 'center' }}>
          <IconSymbol size={32} name="arrow.left" color="white" />
          <Text style={{ color: 'white', fontSize: 16 }}> Назад</Text>
        </View>
      </TouchableOpacity>
      <WebView 
        ref={webViewRef}
        source={{ uri: url as string }} 
        style={{ flex: 1 }}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleMessage}
        onNavigationStateChange={handleNavigationStateChange}
      />
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)'
        }}>
          <View style={{ 
            width: '80%',
            backgroundColor: 'white', 
            borderRadius: 10, 
            padding: 20,
            alignItems: 'center',
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2
            },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5
          }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: 'bold',
              marginBottom: 15,
              textAlign: 'center'
            }}>
              Требуется авторизация
            </Text>
            <Text style={{ 
              marginBottom: 20,
              textAlign: 'center'
            }}>
              Для отправки результатов экзамена необходимо авторизоваться в приложении.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#007AFF',
                borderRadius: 5,
                padding: 10,
                elevation: 2,
                width: '100%'
              }}
              onPress={handleAuthorization}
            >
              <Text style={{ 
                color: 'white',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                Авторизоваться
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                marginTop: 10,
                padding: 10,
                width: '100%'
              }}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ 
                color: '#007AFF',
                textAlign: 'center'
              }}>
                Отмена
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)'
        }}>
          <View style={{ 
            width: '80%',
            backgroundColor: 'white', 
            borderRadius: 10, 
            padding: 20,
            alignItems: 'center',
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2
            },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5
          }}>
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: '#4CD964',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 15
            }}>
              <Text style={{ fontSize: 30, color: 'white' }}>✓</Text>
            </View>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: 'bold',
              marginBottom: 15,
              textAlign: 'center'
            }}>
              Успешно!
            </Text>
            <Text style={{ 
              marginBottom: 20,
              textAlign: 'center'
            }}>
              Результаты экзамена успешно сохранены на сервере.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#4CD964',
                borderRadius: 5,
                padding: 10,
                elevation: 2,
                width: '100%'
              }}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={{ 
                color: 'white',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                Закрыть
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
} 