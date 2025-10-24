import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-elements';
import Modal from 'react-native-modal';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface ProfileMenuProps {
  isVisible: boolean;
  onClose: () => void;
  onLogout: () => void;
  userName?: string;
  userEmail?: string;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({
  isVisible,
  onClose,
  onLogout,
  userName,
  userEmail,
}) => {
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      style={styles.modal}
      animationIn="slideInDown"
      animationOut="slideOutUp">
      <View style={styles.container}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <MaterialIcons name="logout" size={24} color="#f44336" />
          <Text style={styles.logoutText}>Odjava</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-start',
  },
  container: {
    backgroundColor: 'white',
    marginTop: 50,
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  userInfo: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 16,
    marginBottom: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#f44336',
    fontWeight: '500',
  },
});

export default ProfileMenu;
