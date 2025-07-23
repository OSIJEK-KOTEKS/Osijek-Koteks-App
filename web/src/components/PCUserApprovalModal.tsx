import React, {useState} from 'react';
import styled from 'styled-components';
import ReactDOM from 'react-dom';
import {Item} from '../types';
import {apiService} from '../utils/api';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: ${({theme}) => theme.colors.white};
  border-radius: ${({theme}) => theme.borderRadius};
  padding: ${({theme}) => theme.spacing.medium};
  width: 90%;
  max-width: 600px;
  max-height: 70vh;
  margin: auto;
  box-shadow: ${({theme}) => theme.shadows.main};
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: ${({theme}) => theme.spacing.medium};
  color: ${({theme}) => theme.colors.text};
  text-align: center;
`;

const ContentSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({theme}) => theme.spacing.medium};
  overflow-y: auto;
  padding-right: ${({theme}) => theme.spacing.small};
  min-height: 0;
`;

const FileInputSection = styled.div`
  background: ${({theme}) => theme.colors.background};
  padding: ${({theme}) => theme.spacing.medium};
  border-radius: ${({theme}) => theme.borderRadius};
  border: 1px solid ${({theme}) => theme.colors.gray};
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  margin-bottom: ${({theme}) => theme.spacing.small};
  color: ${({theme}) => theme.colors.text};
  font-size: 0.9rem;
`;

const FileInputWrapper = styled.div`
  position: relative;
`;

const FileInput = styled.input`
  width: 100%;
  padding: ${({theme}) => theme.spacing.small};
  border: 2px dashed ${({theme}) => theme.colors.primary};
  border-radius: ${({theme}) => theme.borderRadius};
  background: ${({theme}) => theme.colors.white};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({theme}) => theme.colors.primaryDark};
    background: ${({theme}) => theme.colors.background};
  }
`;

const NumberInput = styled.input`
  width: 100%;
  padding: ${({theme}) => theme.spacing.small};
  border: 1px solid ${({theme}) => theme.colors.gray};
  border-radius: ${({theme}) => theme.borderRadius};
  background: ${({theme}) => theme.colors.white};
  font-size: 0.9rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({theme}) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({theme}) => theme.colors.primary}20;
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const Alert = styled.div`
  background-color: #e3f2fd;
  border: 1px solid #90caf9;
  color: #1976d2;
  padding: ${({theme}) => theme.spacing.small};
  border-radius: ${({theme}) => theme.borderRadius};
  text-align: center;
  font-weight: 500;
  font-size: 0.85rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({theme}) => theme.spacing.small};
  margin-top: ${({theme}) => theme.spacing.medium};
  padding-top: ${({theme}) => theme.spacing.small};
  border-top: 1px solid ${({theme}) => theme.colors.gray};
  flex-shrink: 0;
`;

const CancelButton = styled.button`
  width: 150px;
  background-color: ${({theme}) => theme.colors.gray};
  color: ${({theme}) => theme.colors.text};
  padding: ${({theme}) => theme.spacing.small};
  border: none;
  border-radius: ${({theme}) => theme.borderRadius};
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;

  &:hover {
    background-color: ${({theme}) => theme.colors.disabled};
  }
`;

const ConfirmButton = styled.button`
  width: 150px;
  background-color: ${({theme}) => theme.colors.primary};
  color: white;
  padding: ${({theme}) => theme.spacing.small};
  border: none;
  border-radius: ${({theme}) => theme.borderRadius};
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;

  &:hover {
    background-color: ${({theme}) => theme.colors.primaryDark};
  }

  &:disabled {
    background-color: ${({theme}) => theme.colors.disabled};
    cursor: not-allowed;
  }
`;

const SuccessText = styled.div`
  color: ${({theme}) => theme.colors.success};
  font-size: 0.875rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &::before {
    content: '✓';
    font-weight: bold;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  margin-top: ${({theme}) => theme.spacing.small};
  background: ${({theme}) => theme.colors.background};
  padding: ${({theme}) => theme.spacing.small};
  border-radius: ${({theme}) => theme.borderRadius};
  border: 1px solid ${({theme}) => theme.colors.gray};
`;

const Checkbox = styled.input`
  margin-right: ${({theme}) => theme.spacing.small};
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  color: ${({theme}) => theme.colors.text};
  font-weight: 500;
  cursor: pointer;
`;

interface PCUserApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  onSuccess: () => void;
}

const PCUserApprovalModal: React.FC<PCUserApprovalModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<File | null>(null);
  const [inTransit, setInTransit] = useState(false);
  const [netoSecond, setNetoSecond] = useState<string>(''); // Second neto input
  const [calculatedPercentage, setCalculatedPercentage] = useState<
    number | null
  >(null);

  // Get first neto from the item (created during item creation)
  const netoFirst = item.neto;

  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Molimo odaberite PDF datoteku');
        return;
      }
      setPdfDocument(file);
    }
  };

  const handleNetoSecondChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid numbers (including decimals)
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setNetoSecond(value);
      calculatePercentage(value);
    }
  };

  const calculatePercentage = (secondValue: string) => {
    if (netoFirst && secondValue && secondValue !== '' && netoFirst !== 0) {
      const secondNum = parseFloat(secondValue);

      if (!isNaN(secondNum)) {
        // Calculate difference (second - first)
        const difference = secondNum - netoFirst;
        // Calculate percentage of first input that difference represents
        const percentage = (difference / netoFirst) * 100;
        // Round to 2 decimal places
        setCalculatedPercentage(Math.round(percentage * 100) / 100);
      } else {
        setCalculatedPercentage(null);
      }
    } else {
      setCalculatedPercentage(null);
    }
  };

  const handleApprove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!pdfDocument) {
      alert('PDF dokument je obavezan');
      return;
    }

    // Validate second neto input if provided
    if (netoSecond && (isNaN(Number(netoSecond)) || Number(netoSecond) < 0)) {
      alert('Molimo unesite ispravnu vrijednost za drugi neto');
      return;
    }

    // Check if first neto exists when second neto is provided
    if (netoSecond && !netoFirst) {
      alert(
        'Ne mogu izračunati postotak jer prvi neto nije definiran u dokumentu',
      );
      return;
    }

    setLoading(true);
    try {
      // Create FormData object
      const formData = new FormData();
      formData.append('pdfDocument', pdfDocument);
      formData.append('approvalStatus', 'odobreno');
      formData.append('inTransit', inTransit.toString());

      // Add calculated percentage if both neto values are provided
      if (calculatedPercentage !== null) {
        // Round to 2 decimal places before sending to server
        const roundedPercentage = Math.round(calculatedPercentage * 100) / 100;
        formData.append('neto', roundedPercentage.toString());
      }

      // Make API call (custom call for PC users)
      await apiService.updateItemApprovalWithPdf(
        item._id,
        'odobreno',
        pdfDocument,
        inTransit,
        calculatedPercentage !== null
          ? Math.round(calculatedPercentage * 100) / 100
          : undefined, // Pass rounded percentage
      );

      onSuccess();
      onClose();
      alert('Dokument uspješno odobren');
    } catch (error) {
      console.error('Error approving item:', error);
      alert('Greška pri odobrenju dokumenta');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <Title>Odobri dokument</Title>

        <ContentSection>
          <FileInputSection>
            <Label>PDF dokument</Label>
            <FileInputWrapper>
              <FileInput
                ref={inputRef}
                type="file"
                id="file-input"
                accept="application/pdf"
                onChange={handleFileChange}
                onClick={e => e.stopPropagation()}
              />
            </FileInputWrapper>
            {pdfDocument && (
              <SuccessText>
                PDF dokument uspješno odabran: {pdfDocument.name}
              </SuccessText>
            )}
          </FileInputSection>

          {/* Add Neto input field - only second neto since first comes from item */}
          {netoFirst !== undefined && (
            <FileInputSection>
              <Label>Neto kalkulacija</Label>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}>
                <div>
                  <label
                    style={{
                      fontSize: '0.875rem',
                      color: '#666',
                      marginBottom: '0.5rem',
                      display: 'block',
                    }}>
                    Prvi neto (iz dokumenta):
                  </label>
                  <div
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#f5f5f5',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      color: '#666',
                    }}>
                    {netoFirst}
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: '0.875rem',
                      color: '#666',
                      marginBottom: '0.5rem',
                      display: 'block',
                    }}>
                    Drugi neto (unesite vrijednost):
                  </label>
                  <NumberInput
                    type="text"
                    value={netoSecond}
                    onChange={handleNetoSecondChange}
                    placeholder="Unesite drugi neto"
                    id="neto-value"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                {calculatedPercentage !== null && (
                  <div
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#e8f5e9',
                      borderRadius: '8px',
                      border: '1px solid #a5d6a7',
                    }}>
                    <label
                      style={{
                        fontSize: '0.875rem',
                        color: '#2e7d32',
                        fontWeight: '600',
                        display: 'block',
                      }}>
                      Izračunati postotak:
                    </label>
                    <div
                      style={{
                        fontSize: '1rem',
                        color: '#1b5e20',
                        fontWeight: '700',
                        marginTop: '0.25rem',
                      }}>
                      {calculatedPercentage.toFixed(2)}%
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#388e3c',
                        marginTop: '0.25rem',
                      }}>
                      Razlika:{' '}
                      {netoSecond
                        ? (parseFloat(netoSecond) - netoFirst).toFixed(2)
                        : '0'}
                    </div>
                  </div>
                )}
              </div>
            </FileInputSection>
          )}

          {netoFirst === undefined && (
            <FileInputSection>
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#fff3e0',
                  borderRadius: '8px',
                  border: '1px solid #ffcc02',
                  textAlign: 'center',
                }}>
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#f57c00',
                    fontWeight: '500',
                  }}>
                  Neto kalkulacija nije dostupna
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#ef6c00',
                    marginTop: '0.25rem',
                  }}>
                  Prvi neto nije definiran u ovom dokumentu
                </div>
              </div>
            </FileInputSection>
          )}

          {/* Add in_transit checkbox */}
          <CheckboxContainer>
            <Checkbox
              type="checkbox"
              id="inTransit"
              checked={inTransit}
              onChange={() => setInTransit(!inTransit)}
            />
            <CheckboxLabel htmlFor="inTransit">U tranzitu</CheckboxLabel>
          </CheckboxContainer>

          <Alert>
            Sustav će automatski zabilježiti lokaciju ureda prilikom odobrenja.
          </Alert>
        </ContentSection>

        <ButtonGroup>
          <CancelButton
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            disabled={loading}
            type="button">
            Odustani
          </CancelButton>
          <ConfirmButton
            onClick={handleApprove}
            disabled={!pdfDocument || loading}
            type="button"
            id="approve">
            {loading ? 'Učitavanje...' : 'Odobri'}
          </ConfirmButton>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>,
    document.body,
  );
};

export default PCUserApprovalModal;
