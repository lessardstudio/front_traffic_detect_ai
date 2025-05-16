import { IconSymbol } from '@/components/ui/IconSymbol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function WebViewScreen() {
  const { url } = useLocalSearchParams();
  const router = useRouter();
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
      <WebView source={{ uri: url as string }} style={{ flex: 1 }} />
    </View>
  );
} 