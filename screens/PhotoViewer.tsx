import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
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

  useEffect(() => {
    const getToken = async () => {
      try {
        const authToken = await AsyncStorage.getItem('userToken');
        console.log('Retrieved token:', authToken ? 'exists' : 'not found');
        setToken(authToken);
      } catch (error) {
        console.error('Error getting token:', error);
        Alert.alert('Error', 'Failed to load authentication token');
        navigation.goBack();
      }
    };
    getToken();
  }, [navigation]);

  const handleError = () => {
    console.error('Image loading error for URL:', photoUrl);
    setError(true);
    setLoading(false);
    Alert.alert('Error', 'Failed to load image', [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  if (!token) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  const imageUrl = `http://192.168.1.130:5000${photoUrl}`;
  console.log('Loading image from URL:', imageUrl);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}>
        <MaterialIcons name="close" size={28} color="white" />
      </TouchableOpacity>

      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: `http://192.168.1.130:5000${photoUrl}`,
            headers: {
              Authorization: `Bearer ${token}`,
            },
            // Add cache control
            cache: 'force-cache',
          }}
          style={[
            styles.image,
            {
              width: Dimensions.get('window').width,
              height: Dimensions.get('window').height * 0.8, // Limit height
            },
          ]}
          resizeMode="contain"
          resizeMethod="resize"
          progressiveRenderingEnabled={false}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={handleError}
          PlaceholderContent={
            <ActivityIndicator size="large" color="#2196F3" />
          }
        />

        {loading && (
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
    height: Dimensions.get('window').height,
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
});
