import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {Text, CheckBox} from 'react-native-elements';
import Modal from 'react-native-modal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRIVACY_CONSENT_KEY = 'privacy_consent_status';
const PRIVACY_POLICY_VERSION = '1.0';

interface PrivacyConsentManagerProps {
  isVisible: boolean;
  onClose: () => void;
  onAccept: () => void;
}

interface PrivacyAlertProps {
  isVisible: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

const PrivacyAlert: React.FC<PrivacyAlertProps> = ({
  isVisible,
  onAccept,
  onCancel,
}) => {
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onCancel}
      style={styles.alertModal}
      animationIn="fadeIn"
      animationOut="fadeOut">
      <View style={styles.alertContainer}>
        <Text style={styles.alertTitle}>Obavezna pravila privatnosti</Text>
        <Text style={styles.alertMessage}>
          Za korištenje aplikacije morate prihvatiti pravila privatnosti i
          uvjete korištenja.
        </Text>
        <View style={styles.alertButtonContainer}>
          <TouchableOpacity
            style={[styles.alertButton, styles.alertCancelButton]}
            onPress={onCancel}
            accessible={true}
            accessibilityRole="button">
            <Text style={styles.alertButtonText}>Odustani</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.alertButton, styles.alertAcceptButton]}
            onPress={onAccept}
            accessible={true}
            accessibilityRole="button">
            <Text style={styles.alertButtonText}>Prihvati</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const PrivacyConsentManager: React.FC<PrivacyConsentManagerProps> = ({
  isVisible,
  onClose,
  onAccept,
}) => {
  const [locationConsent, setLocationConsent] = useState(false);
  const [cameraConsent, setCameraConsent] = useState(false);
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false);
  const [isAlertVisible, setAlertVisible] = useState(false);

  const handleAccept = async () => {
    if (!locationConsent || !cameraConsent || !dataProcessingConsent) {
      setAlertVisible(true);
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
        },
      };

      await AsyncStorage.setItem(
        PRIVACY_CONSENT_KEY,
        JSON.stringify(consentData),
      );
      onAccept();
    } catch (error) {
      console.error('Error saving privacy consent:', error);
    }
  };

  const handleDecline = () => {
    setAlertVisible(true);
  };

  const handleAlertAccept = () => {
    setAlertVisible(false);
  };

  const handleAlertCancel = () => {
    setAlertVisible(false);
  };

  return (
    <>
      <Modal
        isVisible={isVisible}
        onBackdropPress={onClose}
        onBackButtonPress={onClose}
        style={styles.modal}
        accessibilityLabel="Pravila privatnosti i suglasnosti">
        <View style={styles.container}>
          <Text h4 style={styles.title} accessibilityRole="header">
            Pravila privatnosti i suglasnosti
          </Text>

          <ScrollView style={styles.scrollView}>
            <Text style={styles.content} accessibilityRole="text">
              {`PRAVILA PRIVATNOSTI

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
Za sva pitanja o zaštiti podataka kontaktirajte nas na: it@osijek-koteks.hr`}
            </Text>

            <View style={styles.consentSection}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                Obavezne suglasnosti
              </Text>

              <CheckBox
                title="Pristajem na prikupljanje i obradu lokacijskih podataka (obavezno)"
                checked={locationConsent}
                onPress={() => setLocationConsent(!locationConsent)}
                containerStyle={styles.checkboxContainer}
                accessibilityRole="checkbox"
                accessibilityLabel="Pristanak za lokacijske podatke"
              />

              <CheckBox
                title="Pristajem na korištenje kamere za fotografiranje dokumenata (obavezno)"
                checked={cameraConsent}
                onPress={() => setCameraConsent(!cameraConsent)}
                containerStyle={styles.checkboxContainer}
                accessibilityRole="checkbox"
                accessibilityLabel="Pristanak za korištenje kamere"
              />

              <CheckBox
                title="Pristajem na obradu osobnih podataka prema pravilima privatnosti (obavezno)"
                checked={dataProcessingConsent}
                onPress={() => setDataProcessingConsent(!dataProcessingConsent)}
                containerStyle={styles.checkboxContainer}
                accessibilityRole="checkbox"
                accessibilityLabel="Pristanak za obradu osobnih podataka"
              />
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={handleDecline}
              accessible={true}
              accessibilityRole="button">
              <Text style={styles.buttonText}>Odbij</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
              accessible={true}
              accessibilityRole="button">
              <Text style={styles.buttonText}>Prihvati</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PrivacyAlert
        isVisible={isAlertVisible}
        onAccept={handleAlertAccept}
        onCancel={handleAlertCancel}
      />
    </>
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
    elevation: Platform.select({android: 2, ios: 0}),
  },
  acceptButton: {
    backgroundColor: '#1976D2',
  },
  declineButton: {
    backgroundColor: '#D32F2F',
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  // Alert Modal Styles
  alertModal: {
    justifyContent: 'center',
    margin: 20,
  },
  alertContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  alertButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  alertButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    elevation: Platform.select({android: 2, ios: 0}),
  },
  alertCancelButton: {
    backgroundColor: '#D32F2F',
  },
  alertAcceptButton: {
    backgroundColor: '#1976D2',
  },
  alertButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default PrivacyConsentManager;
