import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  PermissionsAndroid,
  Linking,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {Button, Text} from '@rneui/themed';
import Modal from 'react-native-modal';
import {
  launchCamera,
  CameraOptions,
  PhotoQuality,
} from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import {LocationData} from '../types';

// Optimized constants
const LOCATION_TIMEOUT = 15000; // Reduced from 30000 to 15000
const QUICK_LOCATION_TIMEOUT = 5000; // New constant for quick initial position
const LOCATION_UPDATE_INTERVAL = 1000;
const REQUIRED_ACCURACY = 200; // Increased from 150 to 200 meters
const MAX_RETRIES = 2;

interface PhotoCaptureModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (photoUri: string, location: LocationData) => Promise<void>;
}

const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isVisible,
  onClose,
  onConfirm,
}) => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    'idle' | 'searching' | 'found' | 'error'
  >('idle');
  const [retryCount, setRetryCount] = useState(0);
  const [accuracyReading, setAccuracyReading] = useState<number | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  const clearLocationWatchers = () => {
    if (watchId !== null) {
      Geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  };

  const ensureLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      try {
        return new Promise<boolean>(resolve => {
          Geolocation.requestAuthorization(() => {
            Geolocation.getCurrentPosition(
              () => resolve(true),
              () => resolve(false),
              {timeout: QUICK_LOCATION_TIMEOUT},
            );
          });
        });
      } catch (error) {
        console.error('iOS location permission error:', error);
        return false;
      }
    } else {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Dozvola za lokaciju',
            message: 'Potrebna nam je vaša lokacija za potvrdu odobrenja.',
            buttonNeutral: 'Pitaj me kasnije',
            buttonNegative: 'Odbij',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Android location permission error:', error);
        return false;
      }
    }
  };

  const getAccurateLocation = (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      let bestLocation: LocationData | null = null;
      let hasInitialLocation = false;

      // First, try to get a quick position with lower accuracy
      Geolocation.getCurrentPosition(
        position => {
          hasInitialLocation = true;
          const locationData: LocationData = {
            coordinates: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            accuracy: position.coords.accuracy || 0,
            timestamp: new Date(),
          };
          bestLocation = locationData;
          setAccuracyReading(locationData.accuracy);

          // If accuracy is already good enough, resolve immediately
          if (locationData.accuracy <= REQUIRED_ACCURACY) {
            resolve(locationData);
            return;
          }
        },
        error => {
          console.log('Quick position error:', error);
        },
        {
          enableHighAccuracy: false,
          timeout: QUICK_LOCATION_TIMEOUT,
          maximumAge: 10000,
        },
      );

      // Start watching for better accuracy after quick position
      const watchId = Geolocation.watchPosition(
        position => {
          const locationData: LocationData = {
            coordinates: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            accuracy: position.coords.accuracy || 0,
            timestamp: new Date(),
          };

          setAccuracyReading(locationData.accuracy);

          if (!bestLocation || locationData.accuracy < bestLocation.accuracy) {
            bestLocation = locationData;
          }

          if (locationData.accuracy <= REQUIRED_ACCURACY) {
            Geolocation.clearWatch(watchId);
            resolve(locationData);
          }
        },
        error => {
          console.error('Watch position error:', error);
          if (bestLocation) {
            resolve(bestLocation);
          } else if (!hasInitialLocation) {
            reject(error);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: LOCATION_TIMEOUT - QUICK_LOCATION_TIMEOUT,
          maximumAge: 0,
          distanceFilter: 0,
          interval: LOCATION_UPDATE_INTERVAL,
        },
      );

      setWatchId(watchId);

      // Set timeout to resolve with best available location
      setTimeout(() => {
        Geolocation.clearWatch(watchId);
        if (bestLocation) {
          resolve(bestLocation);
        } else {
          reject(new Error('Location timeout'));
        }
      }, LOCATION_TIMEOUT);
    });
  };

  const handleLocationError = async (error: any) => {
    console.error('Location error:', error);

    if (retryCount >= MAX_RETRIES) {
      setLocationStatus('error');
      showLocationErrorAlert();
      return;
    }

    setRetryCount(prev => prev + 1);
    console.log(`Retrying location (attempt ${retryCount + 1}/${MAX_RETRIES})`);

    setTimeout(() => {
      startLocationTracking();
    }, 2000);
  };

  const showLocationErrorAlert = () => {
    Alert.alert(
      'Problem s GPS lokacijom',
      'Molimo:\n\n' +
        '1. Provjerite jeste li na otvorenom prostoru\n' +
        '2. Isključite pa ponovno uključite lokaciju u postavkama\n' +
        '3. Ako problem i dalje postoji, zatvorite aplikaciju i ponovno je pokrenite',
      [
        {
          text: 'Otvori postavke',
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
            } else {
              Linking.openSettings();
            }
          },
        },
        {
          text: 'Pokušaj ponovno',
          onPress: () => {
            setRetryCount(0);
            setLocationStatus('idle');
            setTimeout(() => {
              startLocationTracking();
            }, 1000);
          },
        },
        {
          text: 'Odustani',
          style: 'cancel',
          onPress: () => {
            setLocationStatus('idle');
            onClose();
          },
        },
      ],
    );
  };

  const startLocationTracking = async () => {
    setLocationStatus('searching');

    try {
      const hasPermission = await ensureLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      const locationData = await getAccurateLocation();
      setLocation(locationData);
      setLocationStatus('found');
    } catch (error) {
      handleLocationError(error);
    }
  };

  const handleTakePhoto = async () => {
    if (locationStatus !== 'found') {
      Alert.alert(
        'Lokacija',
        'Molimo pričekajte dok se ne dobije točna lokacija.',
      );
      return;
    }

    try {
      const options: CameraOptions = {
        mediaType: 'photo',
        quality: 0.8 as PhotoQuality,
        saveToPhotos: false,
        includeBase64: false,
        presentationStyle: 'fullScreen',
      };

      const response = await launchCamera(options);

      if (response.didCancel) return;
      if (response.errorCode)
        throw new Error(response.errorMessage || 'Failed to take photo');
      if (response.assets?.[0]?.uri) {
        setPhoto(response.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert(
        'Greška',
        'Greška pri fotografiranju. Molimo pokušajte ponovno.',
      );
    }
  };

  const handleConfirm = async () => {
    if (!photo || !location) {
      Alert.alert('Greška', 'Potrebna je i fotografija i lokacija');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(photo, location);
      onClose();
    } catch (error) {
      Alert.alert(
        'Greška',
        'Greška pri učitavanju fotografije i odobravanju dokumenta',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      startLocationTracking();
    }
    return () => {
      clearLocationWatchers();
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {
      setPhoto(null);
      setLocation(null);
      setLocationStatus('idle');
      setRetryCount(0);
      setLoading(false);
      setAccuracyReading(null);
      clearLocationWatchers();
    }
  }, [isVisible]);

  const renderLocationStatus = () => {
    return (
      <View
        style={[
          styles.locationStatus,
          locationStatus === 'found' && styles.locationStatusSuccess,
          locationStatus === 'error' && styles.locationStatusError,
        ]}>
        {locationStatus === 'searching' && (
          <>
            <ActivityIndicator size="small" color="#2196F3" />
            <Text style={styles.locationStatusText}>
              Dohvaćam lokaciju...
              {accuracyReading
                ? ` (Točnost: ${Math.round(accuracyReading)}m)`
                : ''}
            </Text>
          </>
        )}
        {locationStatus === 'found' && location && (
          <>
            <Text style={[styles.locationStatusText, styles.successText]}>
              ✓ Lokacija spremna (Točnost: {Math.round(location.accuracy)}m)
            </Text>
          </>
        )}
        {locationStatus === 'error' && (
          <Text style={[styles.locationStatusText, styles.errorText]}>
            Problem s GPS signalom. Pokušajte ponovno.
          </Text>
        )}
      </View>
    );
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}>
      <View style={styles.container}>
        <Text h4 style={styles.title}>
          Odobri
        </Text>

        {renderLocationStatus()}

        {!photo ? (
          <View style={styles.photoPlaceholder}>
            <TouchableOpacity
              style={[
                styles.captureButton,
                locationStatus !== 'found' && styles.captureButtonDisabled,
              ]}
              onPress={handleTakePhoto}
              disabled={locationStatus !== 'found' || loading}>
              <Text style={styles.captureButtonText}>
                {locationStatus === 'found'
                  ? 'Uslikaj kamion'
                  : 'Čekam lokaciju...'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Image source={{uri: photo}} style={styles.preview} />
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.outlineButton]}
                onPress={() => setPhoto(null)}
                disabled={loading}>
                <Text style={styles.outlineButtonText}>Uslikaj ponovno</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={handleConfirm}
                disabled={loading}>
                <Text style={styles.confirmButtonText}>
                  {loading ? 'Učitavanje...' : 'Potvrdi'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  photoPlaceholder: {
    height: 300,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  captureButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  captureButtonDisabled: {
    backgroundColor: '#cccccc',
    elevation: 0,
    shadowOpacity: 0,
  },
  captureButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  previewContainer: {
    alignItems: 'center',
    width: '100%',
  },
  preview: {
    width: Dimensions.get('window').width - 40,
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  button: {
    flex: 1,
    minWidth: '45%',
    marginHorizontal: 5,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  locationStatusSuccess: {
    backgroundColor: '#e8f5e9',
    borderColor: '#a5d6a7',
  },
  locationStatusError: {
    backgroundColor: '#ffebee',
    borderColor: '#ef9a9a',
  },
  locationStatusText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
  },
  successText: {
    color: '#4caf50',
  },
  errorText: {
    color: '#f44336',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2196F3',
    marginTop: 10,
  },
  retryButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
    fontWeight: '300',
  },
  locationInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    width: '100%',
  },
  locationInfoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  locationCoordinates: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  coordinateBox: {
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  coordinateText: {
    fontSize: 12,
    color: '#333',
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
  },
  accuracyBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accuracyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcc80',
    marginBottom: 15,
  },
  searchingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#f57c00',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#e0e0e0',
    width: '100%',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 1.5,
  },
  timeoutWarning: {
    marginTop: 4,
    fontSize: 12,
    color: '#f57c00',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  statusIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statusIconSuccess: {
    backgroundColor: '#4caf50',
  },
  statusIconError: {
    backgroundColor: '#f44336',
  },
  statusIconSearching: {
    backgroundColor: '#ff9800',
  },
  gpsStatusContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gpsStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonTextDisabled: {
    color: '#999',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  dimmedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIndicatorContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
});

export default PhotoCaptureModal;
