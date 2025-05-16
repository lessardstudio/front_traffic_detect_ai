import { RouteProp } from '@react-navigation/native';
import React from 'react';
import { WebView } from 'react-native-webview';

type WebViewScreenProps = {
  route: RouteProp<{ params: { url: string } }, 'params'>;
};

export default function WebViewScreen({ route }: WebViewScreenProps) {
  const { url } = route.params;
  return <WebView source={{ uri: url }} style={{ flex: 1 }} />;
} 