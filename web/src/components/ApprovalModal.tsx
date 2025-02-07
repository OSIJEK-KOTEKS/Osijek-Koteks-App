import React, {useState} from 'react';
import styled from 'styled-components';
import {Item} from '../types';
import {apiService} from '../utils/api';
import {Button} from './styled/Common';

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
`;

const ModalContent = styled.div`
  background: ${({theme}) => theme.colors.white};
  border-radius: ${({theme}) => theme.borderRadius};
  padding: ${({theme}) => theme.spacing.large};
  max-width: 32rem;
  width: 100%;
  margin: 1rem;
  box-shadow: ${({theme}) => theme.shadows.main};
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: ${({theme}) => theme.spacing.large};
  color: ${({theme}) => theme.colors.text};
`;

const FileInputSection = styled.div`
  margin-bottom: ${({theme}) => theme.spacing.medium};
`;

const Label = styled.label`
  display: block;
  font-weight: 500;
  margin-bottom: ${({theme}) => theme.spacing.small};
  color: ${({theme}) => theme.colors.text};
`;

const FileInput = styled.input`
  width: 100%;
  padding: ${({theme}) => theme.spacing.medium};
  border: 1px solid ${({theme}) => theme.colors.gray};
  border-radius: ${({theme}) => theme.borderRadius};
  margin-bottom: ${({theme}) => theme.spacing.small};
`;

const Alert = styled.div`
  background-color: #e3f2fd;
  border: 1px solid #90caf9;
  color: #1976d2;
  padding: ${({theme}) => theme.spacing.medium};
  border-radius: ${({theme}) => theme.borderRadius};
  margin-bottom: ${({theme}) => theme.spacing.medium};
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({theme}) => theme.spacing.small};
  margin-top: ${({theme}) => theme.spacing.large};
`;

const CancelButton = styled(Button)`
  background-color: ${({theme}) => theme.colors.gray};
  color: ${({theme}) => theme.colors.text};

  &:hover {
    background-color: ${({theme}) => theme.colors.disabled};
  }
`;

const ConfirmButton = styled(Button)`
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
  margin-top: 0.25rem;
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

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isBackPhoto: boolean = false,
  ) => {
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

  const handleApprove = async () => {
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

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <Title>Odobri dokument</Title>

        <FileInputSection>
          <Label>Fotografija registracije</Label>
          <FileInput
            type="file"
            accept="image/jpeg,image/png"
            onChange={e => handleFileChange(e, false)}
          />
          {photoFront && <SuccessText>✓ Fotografija odabrana</SuccessText>}
        </FileInputSection>

        <FileInputSection>
          <Label>Fotografija materijala</Label>
          <FileInput
            type="file"
            accept="image/jpeg,image/png"
            onChange={e => handleFileChange(e, true)}
          />
          {photoBack && <SuccessText>✓ Fotografija odabrana</SuccessText>}
        </FileInputSection>

        <Alert>Lokacija će biti automatski dodana prilikom odobrenja.</Alert>

        <ButtonGroup>
          <CancelButton onClick={onClose} disabled={loading} type="button">
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
    </ModalOverlay>
  );
};

export default ApprovalModal;
