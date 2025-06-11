import React, {useState} from 'react';
import styled from 'styled-components';
import DatePicker, {registerLocale} from 'react-datepicker';
import {hr} from 'date-fns/locale/hr';
import type {Locale} from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

// Register Croatian locale
registerLocale('hr', hr as unknown as Locale);

interface DashboardFiltersProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  selectedCode: string;
  onCodeChange: (code: string) => void;
  availableCodes: string[];
  sortOrder: string;
  onSortOrderChange: (order: string) => void;
  searchMode: boolean;
  onSearchModeChange: (mode: boolean) => void;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  inTransitOnly: boolean;
  onInTransitChange: (inTransitOnly: boolean) => void;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
  selectedCode,
  onCodeChange,
  availableCodes,
  sortOrder,
  onSortOrderChange,
  searchMode,
  onSearchModeChange,
  searchValue,
  onSearchValueChange,
  onSearch,
  onClearSearch,
  inTransitOnly,
  onInTransitChange,
}) => {
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && searchValue.trim()) {
      onSearch();
    }
  };

  const clearSearch = () => {
    onSearchValueChange('');
    onSearchModeChange(false);
  };

  const allCodesOptions = [
    {value: 'all', label: 'Svi Radni Nalozi'},
    ...availableCodes.map(code => ({
      value: code,
      label: code,
    })),
  ];

  const formatDateRange = (start: Date, end: Date) => {
    const isSameDay = start.toDateString() === end.toDateString();

    if (isSameDay) {
      return start.toLocaleDateString('hr-HR');
    }

    const startStr = start.toLocaleDateString('hr-HR');
    const endStr = end.toLocaleDateString('hr-HR');
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return `${startStr} - ${endStr} (${diffDays} ${
      diffDays === 1 ? 'dan' : 'dana'
    })`;
  };

  // Calculate max end date (31 days from start date, but not beyond today)
  const getMaxEndDate = (fromDate: Date) => {
    const maxDate = new Date(fromDate);
    maxDate.setDate(fromDate.getDate() + 31);
    const today = new Date();
    return maxDate > today ? today : maxDate;
  };

  // Calculate min start date (31 days before end date)
  const getMinStartDate = (toDate: Date) => {
    const minDate = new Date(toDate);
    minDate.setDate(toDate.getDate() - 31);
    return minDate;
  };

  // Calculate max start date (should not be beyond today)
  const getMaxStartDate = () => {
    return new Date(); // Today
  };

  // Calculate min end date (should be at least the start date)
  const getMinEndDate = (fromDate: Date) => {
    return fromDate;
  };

  // Check if date range exceeds 31 days
  const isRangeValid = (start: Date, end: Date) => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 31;
  };

  // Handle start date change
  const handleStartDateChange = (date: Date | null) => {
    if (date) {
      if (date <= endDate && isRangeValid(date, endDate)) {
        // Range is valid, use as-is
        onDateRangeChange(date, endDate);
      } else if (date <= endDate && !isRangeValid(date, endDate)) {
        // Start date is before end date but range > 31 days
        // Adjust end date to be 31 days from start date
        const newEndDate = getMaxEndDate(date);
        onDateRangeChange(date, newEndDate);
      } else {
        // Start date is after end date, set end date to start date
        onDateRangeChange(date, date);
      }
    }
  };

  // Handle end date change
  const handleEndDateChange = (date: Date | null) => {
    if (date) {
      if (date >= startDate && isRangeValid(startDate, date)) {
        // Range is valid, use as-is
        onDateRangeChange(startDate, date);
      } else if (date >= startDate && !isRangeValid(startDate, date)) {
        // End date is after start date but range > 31 days
        // Adjust start date to be 31 days before end date
        const newStartDate = getMinStartDate(date);
        onDateRangeChange(newStartDate, date);
      } else {
        // End date is before start date, set start date to end date
        onDateRangeChange(date, date);
      }
    }
  };

  // Quick date range presets
  const setToday = () => {
    const today = new Date();
    onDateRangeChange(today, today);
  };

  const setYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    onDateRangeChange(yesterday, yesterday);
  };

  const setLast7Days = () => {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    onDateRangeChange(weekAgo, today);
  };

  const setLast30Days = () => {
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setMonth(today.getMonth() - 1);
    onDateRangeChange(monthAgo, today);
  };

  return (
    <FiltersContainer>
      <SearchSection>
        <SearchBar>
          <SearchInput
            placeholder="Pretraži po nazivu..."
            value={searchValue}
            onChange={e => onSearchValueChange(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          {searchMode ? (
            <ClearButton onClick={onClearSearch}>
              <span>Očisti pretragu</span>
            </ClearButton>
          ) : (
            <SearchButton onClick={onSearch} disabled={!searchValue.trim()}>
              <span>Pretraži</span>
            </SearchButton>
          )}
        </SearchBar>
      </SearchSection>

      <FiltersGrid>
        <FilterSection>
          <FilterLabel $disabled={searchMode}>Datumski raspon</FilterLabel>
          <DateRangeInputsContainer>
            <DatePickerContainer>
              <DatePickerRow>
                <DatePickerLabel>Od:</DatePickerLabel>
                <DatePickerWrapper $disabled={searchMode}>
                  <DatePicker
                    selected={startDate}
                    onChange={handleStartDateChange}
                    dateFormat="dd.MM.yyyy"
                    locale="hr"
                    maxDate={getMaxStartDate()}
                    placeholderText="Početni datum"
                    disabled={searchMode}
                  />
                </DatePickerWrapper>
              </DatePickerRow>
            </DatePickerContainer>

            <DatePickerContainer>
              <DatePickerRow>
                <DatePickerLabel>Do:</DatePickerLabel>
                <DatePickerWrapper $disabled={searchMode}>
                  <DatePicker
                    selected={endDate}
                    onChange={handleEndDateChange}
                    dateFormat="dd.MM.yyyy"
                    locale="hr"
                    maxDate={getMaxEndDate(startDate)}
                    minDate={getMinEndDate(startDate)}
                    placeholderText="Krajnji datum"
                    disabled={searchMode}
                  />
                </DatePickerWrapper>
              </DatePickerRow>
            </DatePickerContainer>
          </DateRangeInputsContainer>

          {!searchMode && (
            <DatePresets>
              <PresetButton onClick={setToday} type="button">
                Danas
              </PresetButton>
              <PresetButton onClick={setYesterday} type="button">
                Jučer
              </PresetButton>
              <PresetButton onClick={setLast7Days} type="button">
                Zadnjih 7 dana
              </PresetButton>
              <PresetButton onClick={setLast30Days} type="button">
                Zadnjih 30 dana
              </PresetButton>
              <TransitPresetButton
                onClick={() => onInTransitChange(!inTransitOnly)}
                type="button"
                $active={inTransitOnly}>
                🚚 U tranzitu
              </TransitPresetButton>
            </DatePresets>
          )}

          {!searchMode && (
            <>
              <DateRangeDisplay>
                Odabrani period: {formatDateRange(startDate, endDate)}
                {inTransitOnly && ' (samo u tranzitu)'}
              </DateRangeDisplay>
              <RangeLimitInfo>Maksimalni raspon: 31 dan</RangeLimitInfo>
            </>
          )}
        </FilterSection>

        <FilterSection>
          <FilterLabel htmlFor="code-select" $disabled={searchMode}>
            Radni nalog
          </FilterLabel>
          <FilterInputContainer>
            <Select
              id="code-select"
              value={selectedCode}
              onChange={e => onCodeChange(e.target.value)}
              disabled={searchMode}
              $disabled={searchMode}>
              {allCodesOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FilterInputContainer>
        </FilterSection>

        <FilterSection>
          <FilterLabel htmlFor="sort-select" $disabled={searchMode}>
            Sortiranje
          </FilterLabel>
          <FilterInputContainer>
            <Select
              id="sort-select"
              value={sortOrder}
              onChange={e => onSortOrderChange(e.target.value)}
              disabled={searchMode}
              $disabled={searchMode}>
              <option value="pending-first">Na čekanju prvo</option>
              <option value="date-desc">Najnoviji prvo</option>
              <option value="date-asc">Najstariji prvo</option>
              <option value="approved-first">Odobreni prvo</option>
            </Select>
          </FilterInputContainer>
        </FilterSection>
      </FiltersGrid>
    </FiltersContainer>
  );
};

// Styled Components
const FiltersContainer = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: ${({theme}) => theme.borderRadius};
  box-shadow: ${({theme}) => theme.shadows.main};
  margin-bottom: 2rem;
`;

const SearchSection = styled.div`
  margin-bottom: 1.5rem;
`;

const SearchBar = styled.div`
  display: flex;
  gap: 8px;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid ${({theme}) => theme.colors.gray};
  border-radius: ${({theme}) => theme.borderRadius};
  font-size: 1rem;
  transition: all 0.2s ease-in-out;

  &:focus {
    outline: none;
    border-color: ${({theme}) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({theme}) => theme.colors.primary}20;
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const BaseButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: ${({theme}) => theme.borderRadius};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const SearchButton = styled(BaseButton)`
  background-color: ${({theme}) => theme.colors.primary};
  color: white;

  &:hover:not(:disabled) {
    background-color: ${({theme}) => theme.colors.primaryDark};
  }
`;

const ClearButton = styled(BaseButton)`
  background-color: ${({theme}) => theme.colors.gray};
  color: ${({theme}) => theme.colors.text};

  &:hover {
    background-color: ${({theme}) => theme.colors.disabled};
  }
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
`;

const FilterSection = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%; /* Ensure all sections have the same height */
`;

const FilterLabel = styled.label<{$disabled?: boolean}>`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: ${({theme, $disabled}) =>
    $disabled ? theme.colors.disabled : theme.colors.text};
  height: 1.5rem; /* Fixed height for all labels */
  line-height: 1.5rem;
`;

// New container to ensure consistent height for all filter inputs
const FilterInputContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const Select = styled.select<{$disabled?: boolean}>`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid
    ${({theme, $disabled}) =>
      $disabled ? theme.colors.disabled : theme.colors.gray};
  border-radius: ${({theme}) => theme.borderRadius};
  background-color: ${({$disabled}) => ($disabled ? '#f5f5f5' : 'white')};
  font-size: 1rem;
  color: ${({theme, $disabled}) =>
    $disabled ? theme.colors.disabled : theme.colors.text};
  cursor: ${({$disabled}) => ($disabled ? 'not-allowed' : 'pointer')};
  height: 3rem; /* Fixed height to match date picker inputs */

  &:focus {
    outline: none;
    border-color: ${({theme, $disabled}) =>
      $disabled ? theme.colors.disabled : theme.colors.primary};
  }
`;

const CheckboxContainer = styled.div<{$disabled?: boolean}>`
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: ${({$disabled}) => ($disabled ? '#f5f5f5' : 'white')};
  border: 1px solid
    ${({theme, $disabled}) =>
      $disabled ? theme.colors.disabled : theme.colors.gray};
  border-radius: ${({theme}) => theme.borderRadius};
  cursor: ${({$disabled}) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s ease-in-out;
  height: 3rem; /* Fixed height to match other inputs */

  &:hover:not([disabled]) {
    border-color: ${({theme}) => theme.colors.primary};
    background-color: ${({theme}) => theme.colors.background};
  }
`;

const Checkbox = styled.input`
  margin-right: 8px;
  cursor: pointer;
  width: 16px;
  height: 16px;
  accent-color: ${({theme}) => theme.colors.primary};

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const CheckboxLabel = styled.label<{$disabled?: boolean}>`
  color: ${({theme, $disabled}) =>
    $disabled ? theme.colors.disabled : theme.colors.text};
  cursor: ${({$disabled}) => ($disabled ? 'not-allowed' : 'pointer')};
  font-weight: 500;
  user-select: none;
  display: flex;
  align-items: center;

  &:hover {
    color: ${({theme, $disabled}) =>
      $disabled ? theme.colors.disabled : theme.colors.primary};
  }
`;

const TransitIcon = styled.span`
  display: inline-block;
  margin-right: 8px;
  font-size: 16px;
`;

// Updated date range container structure
const DateRangeInputsContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const DatePickerContainer = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
  }
`;

const DatePickerRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }
`;
const DatePickerLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({theme}) => theme.colors.text};
  min-width: 30px;
  flex-shrink: 0;

  @media (max-width: 768px) {
    min-width: auto;
  }
`;

const DatePickerWrapper = styled.div<{$disabled?: boolean}>`
  flex: 1;

  .react-datepicker-wrapper {
    width: 100%;
  }

  .react-datepicker__input-container input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid
      ${({theme, $disabled}) =>
        $disabled ? theme.colors.disabled : theme.colors.gray};
    border-radius: ${({theme}) => theme.borderRadius};
    font-size: 1rem;
    color: ${({theme, $disabled}) =>
      $disabled ? theme.colors.disabled : theme.colors.text};
    background-color: ${({$disabled}) => ($disabled ? '#f5f5f5' : 'white')};
    cursor: ${({$disabled}) => ($disabled ? 'not-allowed' : 'pointer')};
    height: 3rem; /* Fixed height to match other inputs */
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: ${({theme, $disabled}) =>
        $disabled ? theme.colors.disabled : theme.colors.primary};
    }
  }

  .react-datepicker {
    font-family: inherit;
    border: 1px solid ${({theme}) => theme.colors.gray};
    border-radius: ${({theme}) => theme.borderRadius};
  }

  .react-datepicker__header {
    background-color: ${({theme}) => theme.colors.primary};
    border-bottom: none;
  }

  .react-datepicker__current-month,
  .react-datepicker__day-name {
    color: white;
  }

  .react-datepicker__day--selected {
    background-color: ${({theme}) => theme.colors.primary};
    color: white;

    &:hover {
      background-color: ${({theme}) => theme.colors.primaryDark};
    }
  }

  .react-datepicker__day--keyboard-selected {
    background-color: ${({theme}) => theme.colors.primary};
    opacity: 0.8;
    &:hover {
      background-color: ${({theme}) => theme.colors.primaryDark};
    }
  }
`;

const DatePresets = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const PresetButton = styled.button`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${({theme}) => theme.colors.primary};
  background-color: white;
  color: ${({theme}) => theme.colors.primary};
  border-radius: ${({theme}) => theme.borderRadius};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: ${({theme}) => theme.colors.primary};
    color: white;
  }
`;
const TransitPresetButton = styled(PresetButton)<{$active?: boolean}>`
  background-color: ${({theme, $active}) =>
    $active ? theme.colors.primary : 'white'};
  color: ${({theme, $active}) => ($active ? 'white' : theme.colors.primary)};
  border: 1px solid ${({theme}) => theme.colors.primary};

  &:hover {
    background-color: ${({theme}) => theme.colors.primary};
    color: white;
  }
`;

const DateRangeDisplay = styled.div`
  font-size: 0.875rem;
  color: ${({theme}) => theme.colors.text};
  font-weight: 500;
  padding: 0.5rem;
  background-color: ${({theme}) => theme.colors.background};
  border-radius: ${({theme}) => theme.borderRadius};
  text-align: center;
  margin-bottom: 0.25rem;
`;

const RangeLimitInfo = styled.div`
  font-size: 0.75rem;
  color: ${({theme}) => theme.colors.primary};
  text-align: center;
  font-style: italic;
`;

export default DashboardFilters;
