import React from 'react';
import styled from 'styled-components';
import DatePicker, {registerLocale} from 'react-datepicker';
import hr from 'date-fns/locale/hr';
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
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  selectedDate,
  onDateChange,
  selectedCode,
  onCodeChange,
  availableCodes,
  sortOrder,
  onSortOrderChange,
}) => {
  // Handle date change including null value
  const handleDateChange = (date: Date | null) => {
    if (date) {
      onDateChange(date);
    }
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
      <FiltersGrid>
        <FilterSection>
          <FilterLabel htmlFor="date-picker">Datum</FilterLabel>
          <StyledDatePickerWrapper>
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              dateFormat="dd.MM.yyyy"
              locale="hr"
              maxDate={new Date()}
              placeholderText="Odaberi datum"
              className="date-picker"
            />
          </StyledDatePickerWrapper>
        </FilterSection>

        <FilterSection>
          <FilterLabel htmlFor="code-select">Radni nalog</FilterLabel>
          <Select
            id="code-select"
            value={selectedCode}
            onChange={e => onCodeChange(e.target.value)}>
            {allCodesOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FilterSection>

        <FilterSection>
          <FilterLabel htmlFor="sort-select">Sortiranje</FilterLabel>
          <Select
            id="sort-select"
            value={sortOrder}
            onChange={e => onSortOrderChange(e.target.value)}>
            <option value="pending-first">Na čekanju prvo</option>
            <option value="date-desc">Najnoviji prvo</option>
            <option value="date-asc">Najstariji prvo</option>
            <option value="approved-first">Odobreni prvo</option>
          </Select>
        </FilterSection>
      </FiltersGrid>
    </FiltersContainer>
  );
};

const FiltersContainer = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: ${({theme}) => theme.borderRadius};
  box-shadow: ${({theme}) => theme.shadows.main};
  margin-bottom: 2rem;
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

const FilterLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: ${({theme}) => theme.colors.text};
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid ${({theme}) => theme.colors.gray};
  border-radius: ${({theme}) => theme.borderRadius};
  background-color: white;
  font-size: 1rem;
  color: ${({theme}) => theme.colors.text};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({theme}) => theme.colors.primary};
  }
`;

const StyledDatePickerWrapper = styled.div`
  .react-datepicker-wrapper {
    width: 100%;
  }

  .react-datepicker__input-container input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid ${({theme}) => theme.colors.gray};
    border-radius: ${({theme}) => theme.borderRadius};
    font-size: 1rem;
    color: ${({theme}) => theme.colors.text};

    &:focus {
      outline: none;
      border-color: ${({theme}) => theme.colors.primary};
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
