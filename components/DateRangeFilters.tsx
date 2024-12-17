import React, {useState} from 'react';
import {View, StyleSheet, Platform, TouchableOpacity} from 'react-native';
import {Text} from 'react-native-elements';
import {Picker} from '@react-native-picker/picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DateRangeFiltersProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  selectedCode: string;
  onCodeChange: (code: string) => void;
  availableCodes: string[];
  sortOrder: string;
  onSortOrderChange: (order: string) => void;
}

const DateRangeFilters: React.FC<DateRangeFiltersProps> = ({
  selectedDate,
  onDateChange,
  selectedCode,
  onCodeChange,
  availableCodes,
  sortOrder,
  onSortOrderChange,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const sortOptions = [
    {label: 'Na čekanju prvo', value: 'pending-first'},
    {label: 'Najnoviji prvo', value: 'date-desc'},
    {label: 'Najstariji prvo', value: 'date-asc'},
    {label: 'Odobreni zadnji', value: 'approved-last'}, // This needs to change
  ];

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      onDateChange(date);
    }
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString('hr-HR', options);
  };

  return (
    <View style={styles.container}>
      {/* Date Selection Section */}
      <View style={styles.section}>
        <View style={styles.labelContainer}>
          <MaterialIcons name="date-range" size={20} color="#2196F3" />
          <Text style={styles.label}>Datum</Text>
        </View>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateButtonText}>{formatDate(selectedDate)}</Text>
          <MaterialIcons name="calendar-today" size={20} color="#2196F3" />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
            locale="hr"
          />
        )}
      </View>

      {/* Code Filter Section */}
      <View style={styles.section}>
        <View style={styles.labelContainer}>
          <MaterialIcons name="assignment" size={20} color="#2196F3" />
          <Text style={styles.label}>Radni nalog</Text>
        </View>
        {Platform.OS === 'android' ? (
          <View style={styles.androidPickerContainer}>
            <Picker
              selectedValue={selectedCode}
              onValueChange={onCodeChange}
              style={styles.androidPicker}
              dropdownIconColor="#2196F3"
              mode="dropdown">
              <Picker.Item
                label="Svi Radni Nalozi"
                value="all"
                style={styles.pickerItem}
              />
              {availableCodes.map(code => (
                <Picker.Item
                  key={code}
                  label={code}
                  value={code}
                  style={styles.pickerItem}
                />
              ))}
            </Picker>
          </View>
        ) : (
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedCode}
              onValueChange={onCodeChange}
              style={styles.picker}
              dropdownIconColor="#2196F3"
              mode="dropdown">
              <Picker.Item
                label="Svi Radni Nalozi"
                value="all"
                color="#000000"
              />
              {availableCodes.map(code => (
                <Picker.Item
                  key={code}
                  label={code}
                  value={code}
                  color="#000000"
                />
              ))}
            </Picker>
          </View>
        )}
      </View>

      {/* Sort Order Section */}
      <View style={styles.section}>
        <View style={styles.labelContainer}>
          <MaterialIcons name="sort" size={20} color="#2196F3" />
          <Text style={styles.label}>Sortiranje</Text>
        </View>
        {Platform.OS === 'android' ? (
          <View style={styles.androidPickerContainer}>
            <Picker
              selectedValue={sortOrder}
              onValueChange={onSortOrderChange}
              style={styles.androidPicker}
              dropdownIconColor="#2196F3"
              mode="dropdown">
              {sortOptions.map(option => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                  style={styles.pickerItem}
                />
              ))}
            </Picker>
          </View>
        ) : (
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={sortOrder}
              onValueChange={onSortOrderChange}
              style={styles.picker}
              dropdownIconColor="#2196F3"
              mode="dropdown">
              {sortOptions.map(option => (
                <Picker.Item
                  key={option.value}
                  label={option.label}
                  value={option.value}
                  color="#000000"
                />
              ))}
            </Picker>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
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
  androidPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 4,
    overflow: 'hidden',
  },
  androidPicker: {
    backgroundColor: '#FFFFFF',
    height: 50,
    width: '100%',
    color: '#000000',
  },
  pickerItem: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    fontSize: 16,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  picker: {
    ...Platform.select({
      ios: {
        height: 150,
        backgroundColor: '#FFFFFF',
      },
      android: {
        height: 50,
        backgroundColor: '#FFFFFF',
      },
    }),
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000000',
  },
});

export default DateRangeFilters;
