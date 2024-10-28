import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Text,
} from 'react-native';
import {Image} from 'react-native-elements';
import {RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {RootStackParamList} from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

type PhotoViewerRouteProp = RouteProp<RootStackParamList, 'PhotoViewer'>;
type PhotoViewerNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PhotoViewer'
>;

interface PhotoViewerProps {
  route: PhotoViewerRouteProp;
  navigation: PhotoViewerNavigationProp;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  route,
  navigation,
}) => {
  const {photoUrl} = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  React.useEffect(() => {
    const getToken = async () => {
      const authToken = await AsyncStorage.getItem('userToken');
      setToken(authToken);
    };
    getToken();
  }, []);

  const handleImageError = (error: any) => {
    console.error('Image loading error:', error?.nativeEvent?.error);
    setError(true);
    setLoading(false);
  };

  if (!token) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}>
        <MaterialIcons name="close" size={28} color="white" />
      </TouchableOpacity>

      <View style={styles.imageContainer}>
        {!error ? (
          <Image
            source={{
              uri: `http://192.168.1.130:5000${photoUrl}`,
              headers: {
                Authorization: `Bearer ${token}`,
              },
              cache: 'reload',
            }}
            style={styles.image}
            resizeMode="contain"
            resizeMethod="resize"
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={handleImageError}
            PlaceholderContent={
              <ActivityIndicator size="large" color="#2196F3" />
            }
          />
        ) : (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color="#f44336" />
            <Text style={styles.errorText}>Failed to load image</Text>
          </View>
        )}

        {loading && !error && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 12,
  },
});
