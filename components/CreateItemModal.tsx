import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {Input, Text} from 'react-native-elements';
import Modal from 'react-native-modal';
import {CreateItemFormData} from '../types';
import {apiService} from '../utils/api';

interface CreateItemModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateItemModal: React.FC<CreateItemModalProps> = ({
  isVisible,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CreateItemFormData>({
    title: '',
    code: '',
    pdfUrl: '',
  });
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Naziv je obavezan');
      return false;
    }
    if (!formData.code.trim()) {
      Alert.alert('Error', 'RN je obavezan');
      return false;
    }
    if (!formData.pdfUrl.trim()) {
      Alert.alert('Error', 'PDF link je obavezan');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Add current time to the form data
      const now = new Date();
      const creationTime = now.toLocaleTimeString('hr-HR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const itemData = {
        ...formData,
        creationTime,
      };

      await apiService.createItem(itemData);
      Alert.alert('Uspjeh', 'Dokument je dodan');
      onSuccess();
      onClose();
      setFormData({title: '', code: '', pdfUrl: ''});
    } catch (error) {
      console.error('Error creating item:', error);
      Alert.alert('Error', 'Greška');
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
          Kreiraj novi dokument
        </Text>
        <ScrollView>
          <Input
            placeholder="Naziv"
            value={formData.title}
            onChangeText={text => setFormData({...formData, title: text})}
          />
          <Input
            placeholder="Radni nalog"
            value={formData.code}
            onChangeText={text => setFormData({...formData, code: text})}
            autoCapitalize="none"
          />
          <Input
            placeholder="PDF link"
            value={formData.pdfUrl}
            onChangeText={text => setFormData({...formData, pdfUrl: text})}
            autoCapitalize="none"
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}>
              <Text style={styles.buttonText}>Odustani</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? 'Kreiram...' : 'Kreiraj'}
              </Text>
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
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingBottom: 20,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});
