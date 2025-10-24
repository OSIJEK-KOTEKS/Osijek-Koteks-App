import React from 'react';
import { View, Text, StyleSheet, Linking, Platform } from 'react-native';
import { Button } from 'react-native-elements';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Item } from '../types';

interface LocationDetailViewProps {
  location: NonNullable<Item['approvalLocation']>;
  approvalDate?: string;
}

const LocationDetailView: React.FC<LocationDetailViewProps> = ({ location, approvalDate }) => {
  const openInMaps = () => {
    if (!location?.coordinates?.latitude || !location?.coordinates?.longitude) {
      return;
    }

    const { latitude, longitude } = location.coordinates;
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q=',
    });
    const latLng = `${latitude},${longitude}`;
    const url = Platform.select({
      ios: `${scheme}${latLng}`,
      android: `${scheme}${latLng}`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  // Guard clause for null location data
  if (!location?.coordinates?.latitude || !location?.coordinates?.longitude) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Lokacijski podaci nisu dostupni</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <MaterialIcons name="location-on" size={24} color="#2196F3" />
        <Text style={styles.headerText}>Lokacija odobrenja</Text>
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.detailText}>
          Datum i vrijeme:{' '}
          {location.timestamp
            ? new Date(location.timestamp).toLocaleString('hr-HR')
            : 'Nije dostupno'}
        </Text>
        <View style={styles.coordinateContainer}>
          <Text style={styles.coordinateLabel}>Geografska širina:</Text>
          <Text style={styles.coordinateValue}>
            {location.coordinates?.latitude?.toFixed(6) ?? 'N/A'}
          </Text>
        </View>
        <View style={styles.coordinateContainer}>
          <Text style={styles.coordinateLabel}>Geografska dužina:</Text>
          <Text style={styles.coordinateValue}>
            {location.coordinates?.longitude?.toFixed(6) ?? 'N/A'}
          </Text>
        </View>
        <View style={styles.accuracyContainer}>
          <Text style={styles.accuracyText}>
            Preciznost: {location.accuracy ? `${Math.round(location.accuracy)}m` : 'N/A'}
          </Text>
        </View>
      </View>

      {location.coordinates?.latitude && location.coordinates?.longitude && (
        <Button
          title="Otvori u kartama"
          onPress={openInMaps}
          icon={<MaterialIcons name="map" size={20} color="white" style={styles.buttonIcon} />}
          buttonStyle={styles.mapButton}
          titleStyle={styles.buttonTitle}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    margin: 8,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  coordinateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
    backgroundColor: '#f5f5f5',
    paddingVertical: 4,
    borderRadius: 4,
  },
  coordinateLabel: {
    fontSize: 14,
    color: '#666',
  },
  coordinateValue: {
    fontSize: 14,
    color: '#000',
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
    }),
    fontWeight: '500',
  },
  accuracyContainer: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  accuracyText: {
    fontSize: 14,
    color: '#1976d2',
    textAlign: 'center',
  },
  mapButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LocationDetailView;
