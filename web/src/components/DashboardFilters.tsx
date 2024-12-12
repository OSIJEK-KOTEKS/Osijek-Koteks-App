import React from 'react';
import styled from 'styled-components';

const FiltersContainer = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
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
  color: #333;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background-color: white;
  font-size: 1rem;
  color: #333;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #2196f3;
  }
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
`;

interface FiltersProps {
  selectedRange: string;
  onRangeChange: (range: string) => void;
  selectedCode: string;
  onCodeChange: (code: string) => void;
  availableCodes: string[];
  sortOrder: string;
  onSortOrderChange: (order: string) => void;
}

const DashboardFilters: React.FC<FiltersProps> = ({
  selectedRange,
  onRangeChange,
  selectedCode,
  onCodeChange,
  availableCodes,
  sortOrder,
  onSortOrderChange,
}) => {
  return (
    <FiltersContainer>
      <FiltersGrid>
        <FilterSection>
          <FilterLabel htmlFor="dateRange">Vremenski period</FilterLabel>
          <Select
            id="dateRange"
            value={selectedRange}
            onChange={e => onRangeChange(e.target.value)}>
            <option value="7days">Zadnjih 7 dana</option>
            <option value="30days">Zadnjih 30 dana</option>
            <option value="all">Svi dokumenti</option>
          </Select>
        </FilterSection>

        <FilterSection>
          <FilterLabel htmlFor="workOrder">Radni nalog</FilterLabel>
          <Select
            id="workOrder"
            value={selectedCode}
            onChange={e => onCodeChange(e.target.value)}>
            <option value="all">Svi Radni Nalozi</option>
            {availableCodes.map(code => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </FilterSection>

        <FilterSection>
          <FilterLabel htmlFor="sortOrder">Sortiranje</FilterLabel>
          <Select
            id="sortOrder"
            value={sortOrder}
            onChange={e => onSortOrderChange(e.target.value)}>
            <option value="date-desc">Najnoviji prvo</option>
            <option value="date-asc">Najstariji prvo</option>
            <option value="approved-first">Odobreni</option>
            <option value="pending-first">Na čekanju</option>
          </Select>
        </FilterSection>
      </FiltersGrid>
    </FiltersContainer>
  );
};

export default DashboardFilters;
