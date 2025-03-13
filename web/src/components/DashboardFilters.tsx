import React, {useState} from 'react';
import styled from 'styled-components';
import DatePicker, {registerLocale} from 'react-datepicker';
import {hr} from 'date-fns/locale/hr';
import type {Locale} from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

// Register Croatian locale
registerLocale('hr', hr as unknown as Locale);

interface DashboardFiltersProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
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
  selectedDate,
  onDateChange,
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
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Handle date change including null value
  const handleDateChange = (date: Date | null) => {
    setShowDatePicker(false);
    if (date) {
      onDateChange(date);
    }
  };

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
          <FilterLabel htmlFor="date-picker" $disabled={searchMode}>
            Datum
          </FilterLabel>
          <StyledDatePickerWrapper $disabled={searchMode}>
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              dateFormat="dd.MM.yyyy"
              locale="hr"
              maxDate={new Date()}
              placeholderText="Odaberi datum"
              className="date-picker"
              disabled={searchMode}
            />
          </StyledDatePickerWrapper>
        </FilterSection>

        <FilterSection>
          <FilterLabel htmlFor="code-select" $disabled={searchMode}>
            Radni nalog
          </FilterLabel>
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
        </FilterSection>

        <FilterSection>
          <FilterLabel htmlFor="sort-select" $disabled={searchMode}>
            Sortiranje
          </FilterLabel>
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
        </FilterSection>

        <FilterSection>
          <FilterLabel htmlFor="in-transit-filter" $disabled={searchMode}>
            Status tranzita
          </FilterLabel>
          <CheckboxContainer $disabled={searchMode}>
            <Checkbox
              id="in-transit-filter"
              type="checkbox"
              checked={inTransitOnly}
              onChange={e => onInTransitChange(e.target.checked)}
              disabled={searchMode}
            />
            <CheckboxLabel htmlFor="in-transit-filter" $disabled={searchMode}>
              <TransitIcon>🚚</TransitIcon>
              Samo oni u tranzitu
            </CheckboxLabel>
          </CheckboxContainer>
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
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
`;

const FilterSection = styled.div`
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const FilterLabel = styled.label<{$disabled?: boolean}>`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: ${({theme, $disabled}) =>
    $disabled ? theme.colors.disabled : theme.colors.text};
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

  &:focus {
    outline: none;
    border-color: ${({theme, $disabled}) =>
      $disabled ? theme.colors.disabled : theme.colors.primary};
  }
`;

// Enhanced styling for the transit filter
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

  &:hover:not([disabled]) {
    border-color: ${({theme}) => theme.colors.primary};
    background-color: ${({theme}) => theme.colors.background};
  }
`;

const Checkbox = styled.input`
  margin-right: 10px;
  cursor: pointer;
  width: 18px;
  height: 18px;
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

const StyledDatePickerWrapper = styled.div<{$disabled?: boolean}>`
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

    &:focus {
      outline: none;
      border-color: ${({theme, $disabled}) =>
        $disabled ? theme.colors.disabled : theme.colors.primary};
    }
  }

  .react-datepicker {
    font-family: inherit;
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

    &:hover {
      background-color: ${({theme}) => theme.colors.primaryDark};
    }
  }
`;

export default DashboardFilters;
