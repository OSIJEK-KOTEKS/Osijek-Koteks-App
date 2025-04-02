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
  padding: ${({theme}) => theme.spacing.large};
  width: 90%;
  max-width: 600px;
  margin: auto;
  box-shadow: ${({theme}) => theme.shadows.main};
  display: flex;
  flex-direction: column;
  position: relative;
`;

const Title = styled.h2`
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: ${({theme}) => theme.spacing.large};
  color: ${({theme}) => theme.colors.text};
  text-align: center;
`;

const ContentSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({theme}) => theme.spacing.large};
  overflow-y: auto;
  padding-right: ${({theme}) => theme.spacing.medium};
`;

const FileInputSection = styled.div`
  background: ${({theme}) => theme.colors.background};
  padding: ${({theme}) => theme.spacing.large};
  border-radius: ${({theme}) => theme.borderRadius};
  border: 1px solid ${({theme}) => theme.colors.gray};
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  margin-bottom: ${({theme}) => theme.spacing.medium};
  color: ${({theme}) => theme.colors.text};
  font-size: 1rem;
`;

const FileInputWrapper = styled.div`
  position: relative;
`;

const FileInput = styled.input`
  width: 100%;
  padding: ${({theme}) => theme.spacing.medium};
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

const Alert = styled.div`
  background-color: #e3f2fd;
  border: 1px solid #90caf9;
  color: #1976d2;
  padding: ${({theme}) => theme.spacing.medium};
  border-radius: ${({theme}) => theme.borderRadius};
  text-align: center;
  font-weight: 500;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({theme}) => theme.spacing.medium};
  margin-top: ${({theme}) => theme.spacing.large};
  padding-top: ${({theme}) => theme.spacing.medium};
  border-top: 1px solid ${({theme}) => theme.colors.gray};
`;

const CancelButton = styled.button`
  width: 200px;
  background-color: ${({theme}) => theme.colors.gray};
  color: ${({theme}) => theme.colors.text};
  padding: ${({theme}) => theme.spacing.medium};
  border: none;
  border-radius: ${({theme}) => theme.borderRadius};
  cursor: pointer;
  font-weight: 500;

  &:hover {
    background-color: ${({theme}) => theme.colors.disabled};
  }
`;

const ConfirmButton = styled.button`
  width: 200px;
  background-color: ${({theme}) => theme.colors.primary};
  color: white;
  padding: ${({theme}) => theme.spacing.medium};
  border: none;
  border-radius: ${({theme}) => theme.borderRadius};
  cursor: pointer;
  font-weight: 500;

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

// Add checkbox styles
const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  margin-top: ${({theme}) => theme.spacing.medium};
  background: ${({theme}) => theme.colors.background};
  padding: ${({theme}) => theme.spacing.medium};
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

  const handleApprove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!pdfDocument) {
      alert('PDF dokument je obavezan');
      return;
    }

    setLoading(true);
    try {
      // Create FormData object
      const formData = new FormData();
      formData.append('pdfDocument', pdfDocument);
      formData.append('approvalStatus', 'odobreno');
      formData.append('inTransit', inTransit.toString());

      // Make API call (custom call for PC users)
      await apiService.updateItemApprovalWithPdf(
        item._id,
        'odobreno',
        pdfDocument,
        inTransit,
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
            type="button">
            {loading ? 'Učitavanje...' : 'Odobri'}
          </ConfirmButton>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>,
    document.body,
  );
};

export default PCUserApprovalModal;
