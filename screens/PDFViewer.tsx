import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type PDFViewerRouteProp = RouteProp<RootStackParamList, 'PDFViewer'>;

interface PDFViewerProps {
  route: PDFViewerRouteProp;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ route }) => {
  const { pdfUrl } = route.params;
  const [loading, setLoading] = useState(true);

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      )}
      <WebView
        source={{ uri: pdfUrl }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});
