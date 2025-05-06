import * as FileSystem from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

interface DetectionBox {
  cls: string;
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
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [results, setResults] = useState<DetectionBox[]>([]);
  const cameraRef = useRef<Camera | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isTakingPicture, setIsTakingPicture] = useState<boolean>(false);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const lastCaptureTime = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const device = useCameraDevice('back');
  const IP: string = '150.241.105.221';
  const PORT: number = 80;

  const captureAndProcess = async () => {
    if (!cameraRef.current || isTakingPicture || !isCameraReady || !device) return;

    const now = Date.now();
    if (now - lastCaptureTime.current < 5000) return;

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
          }
        }
      } else {
        try {
          const tempDir = FileSystem.cacheDirectory;
          if (!tempDir) throw new Error('Cache directory not available');
          
          const tempFile = `${tempDir}frame_${Date.now()}.jpg`;
          
          await new Promise<void>((resolve) => {
            const captureFrame = async () => {
              if (cameraRef.current) {
                try {
                  const photo = await cameraRef.current.takePhoto({
                    flash: 'off',
                    enableShutterSound: false
                  });
                  
                  await FileSystem.copyAsync({
                    from: photo.path,
                    to: tempFile
                  });
                  
                  photoUri = tempFile;
                  resolve();
                } catch (error) {
                  console.error('Error capturing frame:', error);
                  resolve();
                }
              } else {
                resolve();
              }
            };
            
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
            }
            animationFrameRef.current = requestAnimationFrame(() => {
              requestAnimationFrame(captureFrame);
            });
          });
        } catch (error) {
          console.error('Error capturing frame:', error);
          return;
        }
      }

      if (!photoUri) {
        throw new Error('No photo data available');
      }

      const formData = new FormData();
      formData.append('file', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'frame.jpg'
      } as any);

      const response = await fetch(`http://${IP}:${PORT}/detect_frame`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Server response:', data);
      setResults(data.objects || []);
      setIsConnected(true);

      if (data.objects && data.objects.length > 0) {
        console.log('Detected objects:', data.objects.map((obj: DetectionBox) => ({
          class: obj.cls,
          confidence: Math.round(obj.confidence * 100),
          coordinates: obj.coords
        })));
      } else {
        console.log('No objects detected');
      }

      if (Platform.OS !== 'web' && photoUri.startsWith(FileSystem.cacheDirectory || '')) {
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
  };

  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const startCapture = () => {
      intervalId = setInterval(() => {
        if (isMounted) {
          captureAndProcess();
        }
      }, 5000);
    };

    if (isCameraReady) {
      startCapture();
    }

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCameraReady]);

  if (!hasPermission) {
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
          if (Platform.OS === 'web' && result) {
            console.log('Web permission granted');
          }
        }} style={styles.permissionButton}>
          Разрешить доступ
        </Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Камера не найдена</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        device={device}
        ref={cameraRef}
        isActive={true}
        photo={true}
        onInitialized={() => {
          console.log('Camera is ready');
          setIsCameraReady(true);
        }}
        onError={(error) => console.error('Camera error:', error)}
      />
      
      <View style={styles.statusBar}>
        <Text style={[styles.statusText, { color: isConnected ? 'green' : 'red' }]}>
          {isConnected ? 'ONLINE' : 'OFFLINE'}
        </Text>
        {loading && <ActivityIndicator size="small" color="white" />}
      </View>
      
      <View style={styles.resultsContainer}>
        {results.slice(-5).map((item, index) => (
          <Text key={index} style={styles.resultText}>
            {item.cls} ({Math.round(item.confidence * 100)}%)
            {'\n'}Координаты: [{item.coords.join(', ')}]
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
  },
  resultText: {
    fontSize: 16,
    marginVertical: 2,
    color: 'white',
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