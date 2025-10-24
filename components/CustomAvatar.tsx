import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CustomAvatarProps {
  firstName?: string;
  lastName?: string;
  size?: number;
}

const CustomAvatar: React.FC<CustomAvatarProps> = ({ firstName, lastName, size = 50 }) => {
  const getInitials = (first?: string, last?: string): string => {
    if (!first && !last) return '?';
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <View
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}>
      <Text style={styles.avatarText}>{getInitials(firstName, lastName)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CustomAvatar;
