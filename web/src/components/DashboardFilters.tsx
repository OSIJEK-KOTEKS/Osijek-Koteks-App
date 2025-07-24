import React, {useState} from 'react';
import styled from 'styled-components';
import DatePicker, {registerLocale} from 'react-datepicker';
import {hr} from 'date-fns/locale/hr';
import type {Locale} from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';
import {getFormattedCode} from '../utils/codeMapping';

// Register Croatian locale
registerLocale('hr', hr as unknown as Locale);

// ADD THESE UTILITY FUNCTIONS AT THE TOP
const normalizeCarrierName = (name: string): string => {
  return (
    name
      .trim()
      .toUpperCase()
      // Normalize Croatian characters
      .replace(/Č/g, 'C')
      .replace(/Ć/g, 'C')
      .replace(/Š/g, 'S')
      .replace(/Ž/g, 'Z')
      .replace(/Đ/g, 'D')
      .replace(/DŽ/g, 'DZ')
      // Remove common company suffixes for comparison
      .replace(/\s+(D\.O\.O\.|DOO|D\.O\.O|OBRT)\.?$/i, '')
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      .trim()
  );
};

const deduplicateCarriers = (carriers: string[]): string[] => {
  const carrierMap = new Map<string, string>();

  carriers.forEach(carrier => {
    if (!carrier || carrier.trim() === '') return;

    const normalized = normalizeCarrierName(carrier);

    // If we haven't seen this normalized name, or if current name is "better" (has accents, longer)
    if (
      !carrierMap.has(normalized) ||
      carrier.length > carrierMap.get(normalized)!.length
    ) {
      carrierMap.set(normalized, carrier);
    }
  });

  return Array.from(carrierMap.values()).sort();
};

interface DashboardFiltersProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  selectedCode: string;
  onCodeChange: (code: string) => void;
  availableCodes: string[];
  // NEW: Add prijevoznik props
  selectedPrijevoznik: string;
  onPrijevoznikChange: (prijevoznik: string) => void;
  availableCarriers: string[];
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
  // NEW: Add prijevoznik props
  selectedPrijevoznik,
  onPrijevoznikChange,
  availableCarriers,
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

  // Filter out unused codes AND deduplicate
  const unusedCodes = ['1111', '1996'];
  const filteredCodes = Array.from(new Set(availableCodes)) // Deduplicate first
    .filter(code => !unusedCodes.includes(code))
    .sort(); // Sort for consistent ordering

  console.log('DashboardFilters - Raw availableCodes:', availableCodes);
  console.log('DashboardFilters - Filtered codes:', filteredCodes);

  const allCodesOptions = [
    {value: 'all', label: 'Svi Radni Nalozi'},
    ...filteredCodes.map(code => ({
      value: code,
      label: getFormattedCode(code),
    })),
  ];

  // NEW: Deduplicate carriers with smart normalization
  const uniqueCarriers = deduplicateCarriers(availableCarriers);

  console.log('DashboardFilters - Raw availableCarriers:', availableCarriers);
  console.log('DashboardFilters - Deduplicated carriers:', uniqueCarriers);

  // NEW: Prepare carriers options
  const allCarriersOptions = [
    {value: 'all', label: 'Svi Prijevoznici'},
    ...uniqueCarriers.map(carrier => ({
      value: carrier,
      label: carrier,
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

  // Date preset functions
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
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    onDateRangeChange(sevenDaysAgo, today);
  };

  const setLast30Days = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 29);
    onDateRangeChange(thirtyDaysAgo, today);
  };

  // Calculate max date (today)
  const maxDate = new Date();

  // Calculate the minimum allowed date for the end date (start date + 31 days)
  const getMaxEndDate = (startDate: Date) => {
    const maxEndDate = new Date(startDate);
    maxEndDate.setDate(startDate.getDate() + 30); // 31 days total (inclusive)
    return maxEndDate > maxDate ? maxDate : maxEndDate;
  };

  // Calculate the minimum allowed date for the start date (end date - 31 days)
  const getMinStartDate = (endDate: Date) => {
    const minStartDate = new Date(endDate);
    minStartDate.setDate(endDate.getDate() - 30); // 31 days total (inclusive)
    return minStartDate;
  };

  return (
    <FiltersContainer>
      <SearchSection>
        {searchMode ? (
          <SearchBar>
            <SearchInput
              type="text"
              id="search-bar"
              placeholder="Pretraži po nazivu dokumenta..."
              value={searchValue}
              onChange={e => onSearchValueChange(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
            />
            <SearchControls>
              <SearchButton
                onClick={onSearch}
                disabled={!searchValue.trim()}
                type="button"
                id="find-it-button">
                🔍 Pretraži
              </SearchButton>
              <ClearButton onClick={onClearSearch} type="button">
                ✕ Otkaži
              </ClearButton>
            </SearchControls>
          </SearchBar>
        ) : (
          <SearchControls>
            <SearchButton
              onClick={() => onSearchModeChange(true)}
              type="button"
              id="search-button">
              🔍 Traži po broju otpremnice
            </SearchButton>
            <ClearButton onClick={onClearSearch} type="button">
              🔄 Resetiraj sve
            </ClearButton>
          </SearchControls>
        )}
      </SearchSection>

      <FiltersGrid>
        <FilterSection>
          <FilterLabel $disabled={searchMode}>Datum</FilterLabel>
          <FilterInputContainer>
            <DateRangeInputsContainer>
              <DatePickerRow>
                <DatePickerContainer>
                  <DatePickerLabel>Od:</DatePickerLabel>
                  <DatePickerWrapper $disabled={searchMode}>
                    <DatePicker
                      selected={startDate}
                      onChange={(date: Date | null) => {
                        if (date) {
                          const newEndDate =
                            endDate > getMaxEndDate(date)
                              ? getMaxEndDate(date)
                              : endDate;
                          onDateRangeChange(date, newEndDate);
                        }
                      }}
                      dateFormat="dd.MM.yyyy"
                      locale="hr"
                      maxDate={maxDate}
                      disabled={searchMode}
                      placeholderText="Odaberite datum..."
                    />
                  </DatePickerWrapper>
                </DatePickerContainer>

                <DatePickerContainer>
                  <DatePickerLabel>Do:</DatePickerLabel>
                  <DatePickerWrapper $disabled={searchMode}>
                    <DatePicker
                      selected={endDate}
                      onChange={(date: Date | null) => {
                        if (date) {
                          const newStartDate =
                            startDate < getMinStartDate(date)
                              ? getMinStartDate(date)
                              : startDate;
                          onDateRangeChange(newStartDate, date);
                        }
                      }}
                      dateFormat="dd.MM.yyyy"
                      locale="hr"
                      minDate={getMinStartDate(endDate)}
                      maxDate={
                        Math.min(
                          getMaxEndDate(startDate).getTime(),
                          maxDate.getTime(),
                        ) === maxDate.getTime()
                          ? maxDate
                          : getMaxEndDate(startDate)
                      }
                      disabled={searchMode}
                      placeholderText="Odaberite datum..."
                    />
                  </DatePickerWrapper>
                </DatePickerContainer>
              </DatePickerRow>
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
          </FilterInputContainer>
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

        {/* NEW: Prijevoznik Filter Section */}
        <FilterSection>
          <FilterLabel htmlFor="prijevoznik-select" $disabled={searchMode}>
            Prijevoznik
          </FilterLabel>
          <FilterInputContainer>
            <Select
              id="prijevoznik-select"
              value={selectedPrijevoznik}
              onChange={e => onPrijevoznikChange(e.target.value)}
              disabled={searchMode}
              $disabled={searchMode}>
              {allCarriersOptions.map(option => (
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

const SearchControls = styled.div`
  display: flex;
  gap: 8px;
`;

const SearchBar = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
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
    box-shadow: ${({theme, $disabled}) =>
      $disabled ? 'none' : `0 0 0 2px ${theme.colors.primary}20`};
  }
`;

const DatePresets = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
`;

const PresetButton = styled.button`
  padding: 0.5rem 0.75rem;
  border: 1px solid ${({theme}) => theme.colors.gray};
  border-radius: ${({theme}) => theme.borderRadius};
  background: white;
  color: ${({theme}) => theme.colors.text};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: ${({theme}) => theme.colors.primary};
    color: white;
    border-color: ${({theme}) => theme.colors.primary};
  }
`;

const TransitPresetButton = styled.button<{$active: boolean}>`
  padding: 0.5rem 0.75rem;
  border: 1px solid
    ${({theme, $active}) =>
      $active ? theme.colors.primary : theme.colors.gray};
  border-radius: ${({theme}) => theme.borderRadius};
  background: ${({theme, $active}) =>
    $active ? theme.colors.primary : 'white'};
  color: ${({theme, $active}) => ($active ? 'white' : theme.colors.text)};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  align-items: center;
  gap: 0.25rem;

  &:hover {
    background-color: ${({theme, $active}) =>
      $active ? theme.colors.primaryDark : theme.colors.primary};
    color: white;
    border-color: ${({theme}) => theme.colors.primary};
  }
`;

const DateRangeDisplay = styled.div`
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  background-color: ${({theme}) => theme.colors.background};
  border-radius: ${({theme}) => theme.borderRadius};
  font-size: 0.875rem;
  color: ${({theme}) => theme.colors.text};
  text-align: center;
  border: 1px solid ${({theme}) => theme.colors.gray};
`;

const RangeLimitInfo = styled.div`
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: ${({theme}) => theme.colors.disabled};
  text-align: center;
  font-style: italic;
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
      box-shadow: ${({theme, $disabled}) =>
        $disabled ? 'none' : `0 0 0 2px ${theme.colors.primary}20`};
    }
  }
`;

export default DashboardFilters;
