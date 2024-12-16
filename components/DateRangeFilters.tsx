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
    {label: 'Najnoviji prvo', value: 'date-desc'},
    {label: 'Najstariji prvo', value: 'date-asc'},
    {label: 'Odobreni', value: 'approved-first'},
    {label: 'Na čekanju', value: 'pending-first'},
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

  const renderPickerItems = (items: Array<{label: string; value: string}>) => {
    return items.map(item => (
      <Picker.Item
        key={item.value}
        label={item.label}
        value={item.value}
        color="#000000"
      />
    ));
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
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedCode}
            onValueChange={onCodeChange}
            style={styles.picker}
            dropdownIconColor="#2196F3"
            mode="dropdown">
            <Picker.Item label="Svi Radni Nalozi" value="all" color="#000000" />
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
            mode="dropdown">
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
      },
      android: {
        height: 48,
      },
    }),
    color: '#000000',
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
