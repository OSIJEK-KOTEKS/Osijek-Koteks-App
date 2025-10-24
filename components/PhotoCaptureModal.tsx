import React, { useState, useEffect } from 'react';
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
  ScrollView,
} from 'react-native';
import { Text, CheckBox } from '@rneui/themed'; // Import CheckBox component
import Modal from 'react-native-modal';
import { launchCamera, CameraOptions, PhotoQuality } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { LocationData } from '../types';

const LOCATION_TIMEOUT = 15000;
const QUICK_LOCATION_TIMEOUT = 5000;
const LOCATION_UPDATE_INTERVAL = 1000;
const REQUIRED_ACCURACY = 200;
const MAX_RETRIES = 2;

interface PhotoCaptureModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (
    photoUriFront: string,
    photoUriBack: string,
    location: LocationData,
    inTransit: boolean // Add inTransit parameter
  ) => Promise<void>;
}

const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({ isVisible, onClose, onConfirm }) => {
  const [photoFront, setPhotoFront] = useState<string | null>(null);
  const [photoBack, setPhotoBack] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'searching' | 'found' | 'error'>(
    'idle'
  );
  const [retryCount, setRetryCount] = useState(0);
  const [accuracyReading, setAccuracyReading] = useState<number | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [inTransit, setInTransit] = useState(false); // Add state for in_transit checkbox

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
              { timeout: QUICK_LOCATION_TIMEOUT }
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
          }
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
        }
      );

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
        }
      );

      setWatchId(watchId);

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
    setTimeout(() => startLocationTracking(), 2000);
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
            setTimeout(() => startLocationTracking(), 1000);
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
      ]
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

  const handleTakePhoto = async (isBackPhoto: boolean = false) => {
    if (locationStatus !== 'found') {
      Alert.alert('Lokacija', 'Molimo pričekajte dok se ne dobije točna lokacija.');
      return;
    }

    try {
      const options: CameraOptions = {
        mediaType: 'photo',
        quality: 0.7 as PhotoQuality,
        saveToPhotos: false,
        includeBase64: false,
        presentationStyle: 'fullScreen',
        maxWidth: 1200,
        maxHeight: 1200,
      };

      const response = await launchCamera(options);

      if (response.errorCode === 'camera_unavailable') {
        Alert.alert(
          'Kamera nije dostupna',
          'Molimo provjerite postavke kamere i pokušajte ponovno.'
        );
        return;
      }

      if (response.errorCode === 'permission') {
        Alert.alert(
          'Potrebna dozvola',
          'Za fotografiranje je potrebna dozvola za pristup kameri. Molimo omogućite pristup kameri u postavkama.',
          [
            { text: 'Odustani', style: 'cancel' },
            { text: 'Otvori postavke', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      if (response.didCancel) return;

      if (response.errorCode) {
        throw new Error(response.errorMessage || 'Failed to take photo');
      }

      if (response.assets?.[0]?.uri) {
        if (isBackPhoto) {
          setPhotoBack(response.assets[0].uri);
        } else {
          setPhotoFront(response.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert(
        'Greška',
        'Došlo je do greške prilikom fotografiranja. Molimo pokušajte ponovno.'
      );
    }
  };

  const handleConfirm = async () => {
    if (!photoFront || !photoBack || !location) {
      Alert.alert('Greška', 'Potrebne su obje fotografije i lokacija');
      return;
    }

    setLoading(true);
    try {
      console.log('Confirming with photos, location, and in_transit status:', {
        photoFrontExists: !!photoFront,
        photoBackExists: !!photoBack,
        locationExists: !!location,
        inTransit,
      });

      await onConfirm(photoFront, photoBack, location, inTransit);
      onClose();
    } catch (error) {
      console.error('Error approving item:', error);
      Alert.alert(
        'Greška',
        'Došlo je do greške prilikom odobravanja dokumenta. Molimo pokušajte ponovno.'
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
      setPhotoFront(null);
      setPhotoBack(null);
      setLocation(null);
      setLocationStatus('idle');
      setRetryCount(0);
      setLoading(false);
      setAccuracyReading(null);
      setInTransit(false); // Reset inTransit when modal closes
      clearLocationWatchers();
    }
  }, [isVisible]);

  const renderPhotoSection = (
    type: 'front' | 'back',
    photo: string | null,
    setPhoto: (uri: string | null) => void
  ) => (
    <View style={styles.photoSection}>
      <Text style={styles.photoLabel}>{type === 'front' ? 'Registracija' : 'Materijal'}</Text>
      {!photo ? (
        <TouchableOpacity
          style={[
            styles.photoPlaceholder,
            locationStatus !== 'found' && styles.disabledPlaceholder,
          ]}
          onPress={() => handleTakePhoto(type === 'back')}
          disabled={locationStatus !== 'found' || loading}>
          <MaterialIcons name="add-a-photo" size={40} color="#666" />
          <Text style={styles.placeholderText}>
            {`Uslikaj ${type === 'front' ? 'registraciju' : 'materijal'} `}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.photoPreview}>
          <Image source={{ uri: photo }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => setPhoto(null)}
            disabled={loading}>
            <Text style={styles.retakeButtonText}>Uslikaj ponovno</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderLocationStatus = () => (
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
            {accuracyReading ? ` (Točnost: ${Math.round(accuracyReading)}m)` : ''}
          </Text>
        </>
      )}
      {locationStatus === 'found' && location && (
        <Text style={[styles.locationStatusText, styles.successText]}>
          ✓ Lokacija spremna (Točnost: {Math.round(location.accuracy)}m)
        </Text>
      )}
      {locationStatus === 'error' && (
        <Text style={[styles.locationStatusText, styles.errorText]}>
          Problem s GPS signalom. Pokušajte ponovno.
        </Text>
      )}
    </View>
  );

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

        <ScrollView showsVerticalScrollIndicator={false}>
          {renderLocationStatus()}

          <View style={styles.photosContainer}>
            {renderPhotoSection('front', photoFront, setPhotoFront)}
            {renderPhotoSection('back', photoBack, setPhotoBack)}
          </View>

          {/* Add in_transit checkbox */}
          <View style={styles.transitCheckboxContainer}>
            <CheckBox
              title="U tranzitu"
              checked={inTransit}
              onPress={() => setInTransit(!inTransit)}
              containerStyle={styles.transitCheckbox}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}>
              <Text style={styles.buttonText}>Odustani</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                (!photoFront || !photoBack || !location) && styles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!photoFront || !photoBack || !location || loading}>
              <Text style={styles.buttonText}>{loading ? 'Učitavanje...' : 'Potvrdi'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  photosContainer: {
    flexDirection: 'column',
    gap: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  photoSection: {
    width: '100%',
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#000',
  },
  photoPlaceholder: {
    height: 200,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  disabledPlaceholder: {
    opacity: 0.5,
  },
  placeholderText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  photoPreview: {
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  retakeButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  retakeButtonText: {
    color: 'white',
    fontSize: 12,
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  confirmButton: {
    backgroundColor: '#2196F3',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  // New styles for the in_transit checkbox
  transitCheckboxContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  transitCheckbox: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginLeft: 0,
    marginRight: 0,
    padding: 0,
  },
});

export default PhotoCaptureModal;
