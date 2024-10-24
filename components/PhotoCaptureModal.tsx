import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import {Text, Button} from 'react-native-elements';
import Modal from 'react-native-modal';
import {
  launchCamera,
  CameraOptions,
  ImagePickerResponse,
  PhotoQuality,
} from 'react-native-image-picker';

interface PhotoCaptureModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (photoUri: string) => Promise<void>;
}

const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isVisible,
  onClose,
  onConfirm,
}) => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'We need access to your camera to take approval photos.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();

    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Please grant camera permission to take photos.',
        [
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
      );
      return;
    }

    const options: CameraOptions = {
      mediaType: 'photo',
      quality: 0.8 as PhotoQuality,
      saveToPhotos: false,
      includeBase64: false,
      presentationStyle: 'fullScreen',
    };

    try {
      const response = await launchCamera(options);

      if (response.didCancel) {
        return;
      }

      if (response.errorCode) {
        throw new Error(response.errorMessage || 'Failed to take photo');
      }

      if (response.assets && response.assets[0]?.uri) {
        setPhoto(response.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleConfirm = async () => {
    if (!photo) return;

    setLoading(true);
    try {
      await onConfirm(photo);
      setPhoto(null);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo and approve item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}>
      <View style={styles.container}>
        <Text h4 style={styles.title}>
          Approve Item
        </Text>

        {!photo ? (
          <View style={styles.photoPlaceholder}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleTakePhoto}>
              <Text style={styles.captureButtonText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Image source={{uri: photo}} style={styles.preview} />
            <View style={styles.buttonContainer}>
              <Button
                title="Retake"
                onPress={() => setPhoto(null)}
                type="outline"
                containerStyle={styles.button}
              />
              <Button
                title="Confirm & Approve"
                onPress={handleConfirm}
                loading={loading}
                containerStyle={styles.button}
              />
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
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  photoPlaceholder: {
    height: 300,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  captureButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  captureButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  previewContainer: {
    alignItems: 'center',
  },
  preview: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    width: '45%',
  },
});

export default PhotoCaptureModal;
