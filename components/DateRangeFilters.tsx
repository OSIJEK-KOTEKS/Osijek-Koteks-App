import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {Text} from 'react-native-elements';
import {Picker} from '@react-native-picker/picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Modal from 'react-native-modal';
import CalendarPicker from 'react-native-calendar-picker';

// Croatian month names
const hrMonths = [
  'Siječanj',
  'Veljača',
  'Ožujak',
  'Travanj',
  'Svibanj',
  'Lipanj',
  'Srpanj',
  'Kolovoz',
  'Rujan',
  'Listopad',
  'Studeni',
  'Prosinac',
];

// Croatian day names
const hrDays = [
  'Nedjelja',
  'Ponedjeljak',
  'Utorak',
  'Srijeda',
  'Četvrtak',
  'Petak',
  'Subota',
];

// Croatian short day names
const hrShortDays = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];

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
    {label: 'Odobreni prvo', value: 'approved-first'},
  ];

  const handleDateChange = (date: Date) => {
    setShowDatePicker(false);
    if (date) {
      onDateChange(date);
    }
  };

  const formatDate = (date: Date) => {
    const dayName = hrDays[date.getDay()];
    const day = date.getDate();
    const month = hrMonths[date.getMonth()];
    const year = date.getFullYear();
    return `${dayName}, ${day}. ${month} ${year}.`;
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

        <Modal
          isVisible={showDatePicker}
          onBackdropPress={() => setShowDatePicker(false)}
          style={styles.modal}>
          <View style={styles.calendarContainer}>
            <Text style={styles.calendarTitle}>Odaberi datum</Text>
            <CalendarPicker
              weekdays={hrShortDays}
              months={hrMonths}
              previousTitle="Prethodni"
              nextTitle="Sljedeći"
              selectMonthTitle="Odaberi mjesec"
              selectYearTitle="Odaberi godinu"
              selectedDayColor="#2196F3"
              selectedDayTextColor="#FFFFFF"
              todayBackgroundColor="#ececec"
              todayTextStyle={{color: '#000000'}}
              maxDate={new Date()}
              initialDate={selectedDate}
              onDateChange={handleDateChange}
              width={Dimensions.get('window').width * 0.8}
              selectedStartDate={selectedDate}
            />
            <View style={styles.calendarButtons}>
              <TouchableOpacity
                style={[styles.calendarButton, styles.cancelButton]}
                onPress={() => setShowDatePicker(false)}>
                <Text style={styles.calendarButtonText}>Odustani</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: Dimensions.get('window').width * 0.9,
    maxHeight: Dimensions.get('window').height * 0.8,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: '#000000',
  },
  calendarButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  calendarButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#2196F3',
  },
  calendarButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default DateRangeFilters;
