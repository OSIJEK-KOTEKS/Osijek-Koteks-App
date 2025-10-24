import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, CheckBox } from 'react-native-elements';
import Modal from 'react-native-modal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRIVACY_CONSENT_KEY = 'privacy_consent_status';
const PRIVACY_POLICY_VERSION = '1.0';

interface PrivacyConsentManagerProps {
  isVisible: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export const PrivacyConsentManager: React.FC<PrivacyConsentManagerProps> = ({
  isVisible,
  onClose,
  onAccept,
}) => {
  const [locationConsent, setLocationConsent] = useState(false);
  const [cameraConsent, setCameraConsent] = useState(false);
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const allRequiredConsentsAccepted = locationConsent && cameraConsent && dataProcessingConsent;

  const handleAccept = async () => {
    if (!locationConsent || !cameraConsent || !dataProcessingConsent) {
      Alert.alert(
        'Potrebna suglasnost',
        'Morate prihvatiti obavezne stavke za korištenje aplikacije.'
      );
      return;
    }

    try {
      const consentData = {
        version: PRIVACY_POLICY_VERSION,
        timestamp: new Date().toISOString(),
        consents: {
          location: locationConsent,
          camera: cameraConsent,
          dataProcessing: dataProcessingConsent,
          marketing: marketingConsent,
        },
      };

      await AsyncStorage.setItem(PRIVACY_CONSENT_KEY, JSON.stringify(consentData));
      onAccept();
    } catch (error) {
      console.error('Error saving privacy consent:', error);
      Alert.alert('Greška', 'Došlo je do greške pri spremanju postavki.');
    }
  };

  const privacyPolicyContent = `
PRAVILA PRIVATNOSTI

1. Opće informacije
Ova aplikacija prikuplja i obrađuje vaše osobne podatke u skladu s Općom uredbom o zaštiti podataka (GDPR).

2. Vrste podataka koje prikupljamo
- Osnovni podaci: ime, prezime, email adresa
- Lokacijski podaci: GPS koordinate prilikom odobrenja dokumenata
- Fotografije: fotografije koje napravite kroz aplikaciju
- Podaci o korištenju: aktivnosti unutar aplikacije

3. Svrha obrade podataka
- Pružanje osnovnih funkcionalnosti aplikacije
- Potvrda autentičnosti dokumenata
- Verifikacija lokacije pri odobrenju
- Poboljšanje korisničkog iskustva

4. Pravna osnova
- Izvršenje ugovora
- Zakonska obveza
- Legitimni interes
- Vaša privola

5. Vaša prava
Imate pravo:
- Pristupiti svojim podacima
- Ispraviti netočne podatke
- Izbrisati svoje podatke
- Ograničiti obradu
- Prenijeti podatke
- Povući privolu

6. Razdoblje čuvanja
Vaše podatke čuvamo samo onoliko dugo koliko je potrebno za svrhe zbog kojih se obrađuju.

7. Sigurnost podataka
Implementirali smo tehničke i organizacijske mjere za zaštitu vaših podataka.

8. Kontakt
Za sva pitanja o zaštiti podataka kontaktirajte nas na: it@osijek-koteks.hr
`;

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      backdropOpacity={0.5}
      backdropColor="black">
      <View style={[styles.container, { backgroundColor: 'white' }]}>
        <Text h4 style={styles.title}>
          Pravila privatnosti i suglasnosti
        </Text>

        <ScrollView style={styles.scrollView}>
          <Text style={styles.content}>{privacyPolicyContent}</Text>

          <View style={styles.consentSection}>
            <Text style={styles.sectionTitle}>Obavezne suglasnosti</Text>

            <CheckBox
              title="Pristajem na prikupljanje i obradu lokacijskih podataka (obavezno)"
              checked={locationConsent}
              onPress={() => setLocationConsent(!locationConsent)}
              containerStyle={styles.checkboxContainer}
            />

            <CheckBox
              title="Pristajem na korištenje kamere za fotografiranje dokumenata (obavezno)"
              checked={cameraConsent}
              onPress={() => setCameraConsent(!cameraConsent)}
              containerStyle={styles.checkboxContainer}
            />

            <CheckBox
              title="Pristajem na obradu osobnih podataka prema pravilima privatnosti (obavezno)"
              checked={dataProcessingConsent}
              onPress={() => setDataProcessingConsent(!dataProcessingConsent)}
              containerStyle={styles.checkboxContainer}
            />
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.declineButton]} onPress={onClose}>
            <Text style={styles.buttonText}>Odbij</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.acceptButton,
              !allRequiredConsentsAccepted && styles.disabledButton,
            ]}
            onPress={handleAccept}
            disabled={!allRequiredConsentsAccepted}>
            <Text style={[styles.buttonText, !allRequiredConsentsAccepted && styles.disabledText]}>
              Prihvati
            </Text>
          </TouchableOpacity>
        </View>
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
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollView: {
    maxHeight: '70%',
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 20,
  },
  consentSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  checkboxContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginLeft: 0,
    marginRight: 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: '#2196F3',
  },
  declineButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  disabledText: {
    color: '#666666',
  },
});

export default PrivacyConsentManager;
