import React from 'react';
import {View, Image, StyleSheet} from 'react-native';

const Logo = () => {
  return (
    <View style={styles.logoContainer}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    width: '100%',
    height: 150, // Increase this value if needed
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: '80%',
    height: '100%',
  },
});

export default Logo;
