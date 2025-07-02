import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {Text, Input} from 'react-native-elements';
import Modal from 'react-native-modal';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {apiService} from '../utils/api';
import {CreateItemInput} from '../types';

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
  const [formData, setFormData] = useState<CreateItemInput>({
    title: '',
    code: '',
    registracija: '',
    neto: undefined,
    tezina: undefined, // NEW: Initialize tezina as undefined
    pdfUrl: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('Naziv je obavezan');
      return false;
    }
    if (!formData.code.trim()) {
      setError('RN je obavezan');
      return false;
    }
    if (!formData.pdfUrl.trim()) {
      setError('PDF link je obavezan');
      return false;
    }
    // Validate that neto is a number if provided
    if (formData.neto !== undefined && isNaN(Number(formData.neto))) {
      setError('Neto mora biti broj');
      return false;
    }
    // Validate that tezina is a number if provided
    if (formData.tezina !== undefined && isNaN(Number(formData.tezina))) {
      setError('Težina mora biti broj');
      return false;
    }
    return true;
  };

  // NEW: Handler for neto changes that also updates tezina
  const handleNetoChange = (value: string) => {
    const netoValue = value === '' ? undefined : Number(value);
    setFormData({
      ...formData,
      neto: netoValue,
      tezina: netoValue, // Automatically set tezina to the same value
    });
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
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
      onSuccess();
      onClose();
      setFormData({
        title: '',
        code: '',
        registracija: '',
        neto: undefined,
        tezina: undefined,
        pdfUrl: '',
      });
      setError('');
      Alert.alert('Uspjeh', 'Dokument je uspješno kreiran');
    } catch (err) {
      console.error('Error creating item:', err);
      setError('Greška pri kreiranju dokumenta');
      Alert.alert('Greška', 'Greška pri kreiranju dokumenta');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      code: '',
      registracija: '',
      neto: undefined,
      tezina: undefined,
      pdfUrl: '',
    });
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={handleClose}
      onBackButtonPress={handleClose}
      style={styles.modal}
      avoidKeyboard={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Kreiraj novi dokument</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Input
              label="Naziv"
              placeholder="Unesite naziv dokumenta"
              value={formData.title}
              onChangeText={text => setFormData({...formData, title: text})}
              containerStyle={styles.inputContainer}
              disabled={loading}
              leftIcon={
                <MaterialIcons name="description" size={20} color="#666" />
              }
            />

            <Input
              label="RN"
              placeholder="Unesite RN"
              value={formData.code}
              onChangeText={text => setFormData({...formData, code: text})}
              containerStyle={styles.inputContainer}
              disabled={loading}
              leftIcon={
                <MaterialIcons name="assignment" size={20} color="#666" />
              }
            />

            <Input
              label="Registracija"
              placeholder="Unesite registraciju"
              value={formData.registracija}
              onChangeText={text =>
                setFormData({...formData, registracija: text})
              }
              containerStyle={styles.inputContainer}
              disabled={loading}
              leftIcon={
                <MaterialIcons name="directions-car" size={20} color="#666" />
              }
            />

            <View style={styles.netoContainer}>
              <Input
                label="Neto / Težina"
                placeholder="Unesite neto (automatski postavlja i težinu)"
                value={formData.neto === undefined ? '' : String(formData.neto)}
                onChangeText={handleNetoChange}
                containerStyle={styles.inputContainer}
                disabled={loading}
                keyboardType="numeric"
                leftIcon={<MaterialIcons name="scale" size={20} color="#666" />}
              />
              {formData.neto !== undefined && (
                <Text style={styles.helperText}>
                  Težina će biti automatski postavljena na: {formData.tezina}
                </Text>
              )}
            </View>

            <Input
              label="PDF Link"
              placeholder="Unesite PDF link"
              value={formData.pdfUrl}
              onChangeText={text => setFormData({...formData, pdfUrl: text})}
              containerStyle={styles.inputContainer}
              disabled={loading}
              autoCapitalize="none"
              leftIcon={
                <MaterialIcons name="picture-as-pdf" size={20} color="#666" />
              }
            />
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}>
              <Text style={styles.buttonText}>Odustani</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? 'Kreiranje...' : 'Kreiraj'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    width: '95%',
    maxHeight: '85%',
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 10,
  },
  netoContainer: {
    marginBottom: 10,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: -15,
    marginBottom: 10,
    marginLeft: 10,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    padding: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
  submitButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default CreateItemModal;
