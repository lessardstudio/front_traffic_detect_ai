import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Constants from 'expo-constants';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DetectionBox {
  class: string;
  confidence: number;
  coords: number[];
}

interface Frame {
  objects: DetectionBox[];
  num_frame: number;
}

interface VideoDetection {
  frames: Frame[];
  total_frames: number;
}

export default function Index() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [results, setResults] = useState<DetectionBox[]>([]);
  const [lastTimestamp, setLastTimestamp] = useState<string>('');
  const cameraRef = useRef<CameraView | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isTakingPicture, setIsTakingPicture] = useState<boolean>(false);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const appState = useRef(AppState.currentState);
  const IP = Constants.expoConfig?.extra?.IP || 'localhost';
  const PORT = Constants.expoConfig?.extra?.PORT || 80;
  const devmode = Constants.expoConfig?.extra?.devmode || false;
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [serverResponse, setServerResponse] = useState<Frame | null>(null);
  
  const colorScheme = useColorScheme();

  const handleCameraReady = useCallback(() => {
    console.log('Camera is ready');
    setTimeout(() => {
      setIsCameraReady(true);
    }, 1000);
  }, []);

  const handleCameraError = useCallback((error: any) => {
    console.error('Camera mount error:', error);
    setIsCameraReady(false);
  }, []);

  const captureAndProcess = useCallback(async () => {
    try {
      setIsTakingPicture(true);
      console.log('Taking picture...');
      if (!cameraRef.current) return;
      const result = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 0.5,
      });
      console.log('Picture taken', result.uri);
      setLoading(true);
      // Отправка фото на сервер
      const formData = new FormData();
      formData.append('file', {
        uri: result.uri,
        type: 'image/jpeg',
        name: 'photo.jpg'
      } as any);
      const response = await fetch(`http://${IP}:${PORT}/detect_frame`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Server response:', data);
      setServerResponse(data);
      setIsConnected(true);
      if (data.timestamp) {
        setLastTimestamp(data.timestamp);
      }
      // Открываем модальное окно только после получения ответа
      setModalVisible(true);
      if (data.objects && data.objects.length > 0) {
        setResults(data.objects || []);
        console.log('Detected objects:', data.objects.map((obj: DetectionBox) => ({
          class: obj.class,
          confidence: Math.round(obj.confidence * 100),
          coordinates: obj.coords
        })));
      } else {
        console.log('No objects detected');
        setResults([]);
      }
    } catch (error: any) {
      console.error('Failed to take picture or process on server:', error);
      setServerResponse(null);
      setIsConnected(false);
    } finally {
      setIsTakingPicture(false);
      setLoading(false);
    }
  }, [IP, PORT]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        setIsCameraReady(true);
      } else if (nextAppState.match(/inactive|background/)) {
        setIsCameraReady(false);
        setIsTakingPicture(false);
        setLoading(false);
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Убираем автоматический захват фото
    return () => {};
  }, []);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Требуется доступ к камере</Text>
        {Platform.OS === 'web' && (
          <Text style={styles.warningText}>
            Внимание: В браузере доступ к камере может быть ограничен. Убедитесь, что вы используете HTTPS и подтвердили доступ в системном диалоге.
          </Text>
        )}
        <Text onPress={async () => {
          const result = await requestPermission();
          if (Platform.OS === 'web' && result.granted) {
            console.log('Web permission granted');
          }
        }} style={styles.permissionButton}>
          Разрешить доступ
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {permission ? (
        <>
          <CameraView
            style={styles.camera}
            facing="back"
            ref={cameraRef}
            onCameraReady={handleCameraReady}
            onMountError={handleCameraError}
            active={true}
            mute={true}
          />
          <View style={styles.overlay}>
            <View style={styles.bottomOverlay}>
              <TouchableOpacity
                style={[styles.captureButton, { backgroundColor: isTakingPicture ? Colors[colorScheme ?? 'light'].text : Colors[colorScheme ?? 'light'].tint }] }
                onPress={captureAndProcess}
                disabled={isTakingPicture || !isCameraReady}
              >
                <IconSymbol
                  name="camera.fill"
                  size={40}
                  color={Colors[colorScheme ?? 'light'].background}
                />
              </TouchableOpacity>
            </View>
          </View>
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              setModalVisible(!modalVisible);
            }}
          >
            <View style={styles.centeredView}>
              <View style={styles.modalView}>
                {loading ? <ActivityIndicator size="small" color="black" /> :
                <Text style={styles.modalText}>Фото успешно обработано!</Text>}
                {serverResponse && serverResponse.objects && serverResponse.objects.length > 0 && 
                  <Text style={styles.serverResponse}>
                    {serverResponse.objects
                      .sort((a, b) => b.confidence - a.confidence)[0].class} 
                    ({Math.round(serverResponse.objects.sort((a, b) => b.confidence - a.confidence)[0].confidence * 100)}%)
                  </Text>
                }
                {serverResponse && (!serverResponse.objects || serverResponse.objects.length === 0) &&
                  <Text style={styles.serverResponse}>Объекты не обнаружены</Text>
                }
                <TouchableOpacity
                  style={[styles.button, styles.buttonClose]}
                  onPress={() => setModalVisible(!modalVisible)}
                >
                  <Text style={styles.textStyle}>Закрыть</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <View style={styles.container}>
          <Text style={styles.text}>Требуется доступ к камере</Text>
          {Platform.OS === 'web' && (
            <Text style={styles.warningText}>
              Внимание: В браузере доступ к камере может быть ограничен. Убедитесь, что вы используете HTTPS и подтвердили доступ в системном диалоге.
            </Text>
          )}
          <Text onPress={async () => {
            const result = await requestPermission();
            if (Platform.OS === 'web' && result.granted) {
              console.log('Web permission granted');
            }
          }} style={styles.permissionButton}>
            Разрешить доступ
          </Text>
        </View>
      )}
      
      <View style={styles.statusBar}>
        <Text style={[styles.statusText, { color: isConnected ? 'green' : 'red' }]}>
          {isConnected ? 'ONLINE' : 'OFFLINE'}
        </Text>
        {loading && <ActivityIndicator size="small" color="white" />}
      </View>
      
      {devmode && (
        <View style={styles.resultsContainer}>
          {lastTimestamp ? (
            <Text style={styles.timestampText}>
              Последнее обновление: {lastTimestamp}
            </Text>
          ) : null}
          {results.slice(-5).map((item, index) => (
            <Text key={index} style={styles.resultText}>
              {item.class} ({Math.round(item.confidence * 100)}%)
              {/* {'\n'}Координаты: [{item.coords.join(', ')}] */}
            </Text>
          ))}
          {results.length === 0 && (
            <Text style={styles.resultText}>Объекты не обнаружены</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  statusBar: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultsContainer: {
    position: 'absolute',
    top: '20%',
    left: '5%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
    width: '90%',
    textAlign: 'center',
  },
  resultItem: {
    marginVertical: 2,
    color: 'white',
    textAlign: 'center',
  },
  resultText: {
    fontSize: 16,
    marginVertical: 2,
    color: 'white',
    textAlign: 'center',
  },
  timestampText: {
    fontSize: 14,
    marginBottom: 8,
    color: 'yellow',
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  warningText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  permissionButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007AFF',
    color: 'white',
    borderRadius: 5,
    textAlign: 'center',
    fontSize: 16,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '50%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  captureButton: {
    padding: 10,
    borderRadius: 50,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
  photo: {
    width: 200,
    height: 200,
    marginBottom: 15,
  },
  serverResponse: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 5,
    maxHeight: 100,
    overflow: 'scroll',
  },
});