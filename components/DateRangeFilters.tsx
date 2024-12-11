import React from 'react';
import {View, StyleSheet, Platform} from 'react-native';
import {Text} from 'react-native-elements';
import {Picker} from '@react-native-picker/picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface DateRangeFiltersProps {
  selectedRange: string;
  onRangeChange: (range: string) => void;
  selectedCode: string;
  onCodeChange: (code: string) => void;
  availableCodes: string[];
  sortOrder: string;
  onSortOrderChange: (order: string) => void;
}

const DateRangeFilters: React.FC<DateRangeFiltersProps> = ({
  selectedRange,
  onRangeChange,
  selectedCode,
  onCodeChange,
  availableCodes,
  sortOrder,
  onSortOrderChange,
}) => {
  const dateRanges = [
    {label: 'Zadnjih 7 dana', value: '7days'},
    {label: 'Zadnjih 30 dana', value: '30days'},
    {label: 'Svi dokumenti', value: 'all'},
  ];

  const sortOptions = [
    {label: 'Najnoviji prvo', value: 'date-desc'},
    {label: 'Najstariji prvo', value: 'date-asc'},
    {label: 'Odobreni', value: 'approved-first'},
    {label: 'Na čekanju', value: 'pending-first'},
  ];

  const renderPickerItems = (items: Array<{label: string; value: string}>) => {
    return items.map(item => (
      <Picker.Item
        key={item.value}
        label={item.label}
        value={item.value}
        color="#000000"
        style={{
          backgroundColor: '#FFFFFF',
          color: '#000000',
          fontSize: 16,
        }}
      />
    ));
  };

  return (
    <View style={styles.container}>
      {/* Date Range Section */}
      <View style={styles.section}>
        <View style={styles.labelContainer}>
          <MaterialIcons name="date-range" size={20} color="#2196F3" />
          <Text style={styles.label}>Vremenski period</Text>
        </View>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedRange}
            onValueChange={onRangeChange}
            style={styles.picker}
            dropdownIconColor="#2196F3"
            mode="dropdown"
            prompt="Odaberi period">
            {renderPickerItems(dateRanges)}
          </Picker>
        </View>
      </View>

      {/* Code Filter Section */}
      <View style={styles.section}>
        <View style={styles.labelContainer}>
          <MaterialIcons name="assignment" size={20} color="#2196F3" />
          <Text style={styles.label}>Radni nalog</Text>
        </View>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedCode}
            onValueChange={onCodeChange}
            style={styles.picker}
            dropdownIconColor="#2196F3"
            mode="dropdown"
            prompt="Odaberi radni nalog">
            <Picker.Item
              label="Svi Radni Nalozi"
              value="all"
              color="#000000"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#000000',
                fontSize: 16,
              }}
            />
            {availableCodes.map(code => (
              <Picker.Item
                key={code}
                label={code}
                value={code}
                color="#000000"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#000000',
                  fontSize: 16,
                }}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Sort Order Section */}
      <View style={styles.section}>
        <View style={styles.labelContainer}>
          <MaterialIcons name="sort" size={20} color="#2196F3" />
          <Text style={styles.label}>Sortiranje</Text>
        </View>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={sortOrder}
            onValueChange={onSortOrderChange}
            style={styles.picker}
            dropdownIconColor="#2196F3"
            mode="dropdown"
            prompt="Odaberi sortiranje">
            {renderPickerItems(sortOptions)}
          </Picker>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  section: {
    marginBottom: 15,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        borderRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  picker: {
    ...Platform.select({
      ios: {
        height: 150,
        backgroundColor: '#FFFFFF',
      },
      android: {
        height: 48,
        color: '#000000',
        backgroundColor: '#FFFFFF',
      },
    }),
  },
});

export default DateRangeFilters;
