import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, Text, View } from 'react-native';

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
  const lastCaptureTime = useRef<number>(0);
  const frameId = useRef<number | null>(null);
  const appState = useRef(AppState.currentState);
  const IP: string = '150.241.105.221';
  const PORT: number = 80;

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
    if (!cameraRef.current || isTakingPicture || !isCameraReady) return;

    const now = Date.now();
    if (now - lastCaptureTime.current < 100) return;

    try {
      setIsTakingPicture(true);
      setLoading(true);
      lastCaptureTime.current = now;
      
      let photoUri: string | null = null;
      
      if (Platform.OS === 'web') {
        const videoElement = document.querySelector('video');
        if (videoElement) {
          const canvas = document.createElement('canvas');
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;
          const context = canvas.getContext('2d');
          if (context && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.3);
            photoUri = dataUrl;
          } else {
            console.error('Invalid video dimensions or context');
            return;
          }
        } else {
          console.error('Video element not found');
          return;
        }
      } else {
        try {
          if (!cameraRef.current) return;
          
          const result = await cameraRef.current.takePictureAsync({
            quality: 0.3,
            skipProcessing: true,
            exif: false,
            base64: false,
            isImageMirror: false
          });
          
          if (!result?.uri) return;
          photoUri = result.uri;
        } catch (error) {
          console.error('Error capturing frame:', error);
          return;
        }
      }

      if (!photoUri) return;

      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(photoUri);
        const blob = await response.blob();
        formData.append('file', blob, 'frame.jpg');
      } else {
        formData.append('file', {
          uri: photoUri,
          type: 'image/jpeg',
          name: 'frame.jpg'
        } as any);
      }

      const response = await fetch(`http://${IP}:${PORT}/detect_frame`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Server response:', data);
      setResults(data.objects || []);
      setIsConnected(true);
      if (data.timestamp) {
        setLastTimestamp(data.timestamp);
      }

      if (data.objects && data.objects.length > 0) {
        console.log('Detected objects:', data.objects.map((obj: DetectionBox) => ({
          class: obj.class,
          confidence: Math.round(obj.confidence * 100),
          coordinates: obj.coords
        })));
      } else {
        console.log('No objects detected');
      }

      if (Platform.OS !== 'web' && photoUri && FileSystem.cacheDirectory && photoUri.startsWith(FileSystem.cacheDirectory)) {
        try {
          await FileSystem.deleteAsync(photoUri);
        } catch (error) {
          console.error('Error deleting temp file:', error);
        }
      }
    } catch (error) {
      console.error('Error processing frame:', error);
      setIsConnected(false);
    } finally {
      setIsTakingPicture(false);
      setLoading(false);
    }
  }, [isCameraReady, isTakingPicture]);

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
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const captureFrame = () => {
      if (!isMounted || !isCameraReady || isTakingPicture || appState.current !== 'active') {
        timeoutId = setTimeout(captureFrame, 200);
        return;
      }

      captureAndProcess().finally(() => {
        if (isMounted) {
          timeoutId = setTimeout(captureFrame, 200);
        }
      });
    };

    if (isCameraReady) {
      timeoutId = setTimeout(captureFrame, 1000);
    }

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isCameraReady, isTakingPicture, captureAndProcess]);

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
      <CameraView
        style={styles.camera}
        facing="back"
        ref={cameraRef}
        onCameraReady={handleCameraReady}
        onMountError={handleCameraError}
        active={true}
        mute={true}
      />
      
      <View style={styles.statusBar}>
        <Text style={[styles.statusText, { color: isConnected ? 'green' : 'red' }]}>
          {isConnected ? 'ONLINE' : 'OFFLINE'}
        </Text>
        {loading && <ActivityIndicator size="small" color="white" />}
      </View>
      
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
    bottom: '20%',
    left: '5%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
    width: '90%',
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
});