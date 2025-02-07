import React, {useState, useRef} from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import {Item} from '../types';
import {apiService} from '../utils/api';
import {Button} from './styled/Common';

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
  max-width: 800px; // Increased from 32rem
  min-height: 500px;
  max-height: 90vh;
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

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${({theme}) => theme.colors.background};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({theme}) => theme.colors.gray};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({theme}) => theme.colors.disabled};
  }
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

const CancelButton = styled(Button)`
  width: 200px;
  background-color: ${({theme}) => theme.colors.gray};
  color: ${({theme}) => theme.colors.text};

  &:hover {
    background-color: ${({theme}) => theme.colors.disabled};
  }
`;

const ConfirmButton = styled(Button)`
  width: 200px;
  background-color: ${({theme}) => theme.colors.primary};

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

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  onSuccess: () => void;
}
const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [photoFront, setPhotoFront] = useState<File | null>(null);
  const [photoBack, setPhotoBack] = useState<File | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isBackPhoto: boolean = false,
  ) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        alert('Molimo odaberite JPEG ili PNG datoteku');
        return;
      }
      if (isBackPhoto) {
        setPhotoBack(file);
      } else {
        setPhotoFront(file);
      }
    }
  };

  const handleApprove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!photoFront || !photoBack) {
      alert('Obje fotografije su obavezne');
      return;
    }

    setLoading(true);
    try {
      const fixedLocation = {
        coordinates: {
          latitude: 45.56204169974961,
          longitude: 18.678308891755552,
        },
        accuracy: 10,
        timestamp: new Date(),
      };

      await apiService.updateItemApproval(
        item._id,
        'odobreno',
        photoFront,
        photoBack,
        fixedLocation,
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
            <Label>Fotografija registracije</Label>
            <FileInputWrapper>
              <FileInput
                ref={frontInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={e => handleFileChange(e, false)}
                onClick={e => e.stopPropagation()}
              />
            </FileInputWrapper>
            {photoFront && (
              <SuccessText>Fotografija uspješno odabrana</SuccessText>
            )}
          </FileInputSection>

          <FileInputSection>
            <Label>Fotografija materijala</Label>
            <FileInputWrapper>
              <FileInput
                ref={backInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={e => handleFileChange(e, true)}
                onClick={e => e.stopPropagation()}
              />
            </FileInputWrapper>
            {photoBack && (
              <SuccessText>Fotografija uspješno odabrana</SuccessText>
            )}
          </FileInputSection>

          <Alert>Lokacija će biti automatski dodana prilikom odobrenja.</Alert>
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
            disabled={!photoFront || !photoBack || loading}
            type="button">
            {loading ? 'Učitavanje...' : 'Odobri'}
          </ConfirmButton>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>,
    document.body,
  );
};

export default ApprovalModal;
