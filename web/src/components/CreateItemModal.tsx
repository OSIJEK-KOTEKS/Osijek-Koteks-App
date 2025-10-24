import React, { useState } from 'react';
import styled from 'styled-components';
import { apiService } from '../utils/api';
import { CreateItemInput } from '../types';

// Styled Components
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  overflow-y: auto;
`;

const ModalWrapper = styled.div`
  display: flex;
  position: fixed;
  inset: 0;
  align-items: center;
  justify-content: center;
  padding: 0 1rem;
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  transition: opacity 0.3s;
`;

const ModalContent = styled.div`
  position: relative;
  width: 100%;
  max-width: 32rem;
  max-height: 60vh;
  background: white;
  padding: 1.5rem;
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.main};
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const Title = styled.h2`
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const ErrorMessage = styled.div`
  margin-bottom: 1rem;
  padding: 0.75rem;
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: #fee2e2;
  color: #dc2626;
  font-size: 0.875rem;
`;

const FormGroup = styled.div`
  margin-bottom: 0.75rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: 1rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary}20;
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  ${({ variant, theme }) =>
    variant === 'primary'
      ? `
    background-color: ${theme.colors.primary};
    color: white;
    
    &:hover:not(:disabled) {
      background-color: ${theme.colors.primaryDark};
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  `
      : `
    background-color: #f3f4f6;
    color: ${theme.colors.text};
    
    &:hover:not(:disabled) {
      background-color: #e5e7eb;
    }
  `}
`;

const OptionalFieldNote = styled.p`
  font-size: 0.75rem;
  color: #666;
  margin-top: 0.25rem;
  font-style: italic;
`;

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateItemModal: React.FC<CreateItemModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateItemInput>({
    title: '',
    code: '',
    registracija: '',
    neto: undefined,
    tezina: undefined,
    prijevoznik: '',
    pdfUrl: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('Naziv je obavezan');
      return false;
    }
    if (!formData.code.trim()) {
      setError('RN je obavezan');
      return false;
    }
    if (!formData.pdfUrl.trim()) {
      setError('PDF link je obavezan');
      return false;
    }
    // Validate that neto is a number if provided
    if (formData.neto !== undefined && isNaN(Number(formData.neto))) {
      setError('Neto mora biti broj');
      return false;
    }
    // Validate that tezina is a number if provided
    if (formData.tezina !== undefined && isNaN(Number(formData.tezina))) {
      setError('Težina mora biti broj');
      return false;
    }
    return true;
  };

  // Handler for neto changes that also updates tezina
  const handleNetoChange = (value: string) => {
    const netoValue = value === '' ? undefined : Number(value);
    setFormData({
      ...formData,
      neto: netoValue,
      tezina: netoValue, // Automatically set tezina to the same value
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const now = new Date();
      const creationTime = now.toLocaleTimeString('hr-HR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      // Clean up the data before sending
      const itemData = {
        ...formData,
        creationTime,
        // Only include prijevoznik if it has a value
        ...(formData.prijevoznik &&
          formData.prijevoznik.trim() && {
            prijevoznik: formData.prijevoznik.trim(),
          }),
      };

      await apiService.createItem(itemData);
      onSuccess();
      onClose();
      setFormData({
        title: '',
        code: '',
        registracija: '',
        neto: undefined,
        tezina: undefined,
        prijevoznik: '',
        pdfUrl: '',
      });
      setError('');
    } catch (err) {
      console.error('Error creating item:', err);
      setError('Greška pri kreiranju dokumenta');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay>
      <ModalWrapper>
        <Backdrop onClick={onClose} />
        <ModalContent>
          <Title>Kreiraj novi dokument</Title>

          <form onSubmit={handleSubmit}>
            {error && <ErrorMessage>{error}</ErrorMessage>}

            <FormGroup>
              <Label>Naziv</Label>
              <Input
                data-testid="title-input"
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Unesite naziv dokumenta"
                id="item_name"
              />
            </FormGroup>

            <FormGroup>
              <Label>RN</Label>
              <Input
                type="text"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                placeholder="Unesite RN"
                id="radni_nalog"
              />
            </FormGroup>

            <FormGroup>
              <Label>Registracija</Label>
              <Input
                type="text"
                value={formData.registracija}
                onChange={e => setFormData({ ...formData, registracija: e.target.value })}
                placeholder="Unesite registraciju"
                id="registracija"
              />
            </FormGroup>

            {/* Updated neto field that also sets tezina */}
            <FormGroup>
              <Label>Neto / Težina</Label>
              <Input
                type="number"
                value={formData.neto === undefined ? '' : formData.neto}
                onChange={e => handleNetoChange(e.target.value)}
                placeholder="Unesite neto (automatski postavlja i težinu)"
                id="neto"
              />
              {formData.neto !== undefined && (
                <OptionalFieldNote>
                  Težina će biti automatski postavljena na: {formData.tezina}
                </OptionalFieldNote>
              )}
            </FormGroup>

            {/* NEW: Prijevoznik field */}
            <FormGroup>
              <Label>Prijevoznik</Label>
              <Input
                type="text"
                value={formData.prijevoznik}
                onChange={e => setFormData({ ...formData, prijevoznik: e.target.value })}
                placeholder="Unesite prijevoznika (opcionalno)"
                id="prijevoznik"
              />
              <OptionalFieldNote>Opcionalno polje za unos prijevoznika</OptionalFieldNote>
            </FormGroup>

            <FormGroup>
              <Label>PDF Link</Label>
              <Input
                type="text"
                value={formData.pdfUrl}
                onChange={e => setFormData({ ...formData, pdfUrl: e.target.value })}
                placeholder="Unesite PDF link"
                id="pdf_link"
              />
            </FormGroup>

            <ButtonContainer>
              <Button type="button" onClick={onClose} disabled={loading} variant="secondary">
                Odustani
              </Button>
              <Button type="submit" disabled={loading} variant="primary" id="finish_item">
                {loading ? 'Kreiranje...' : 'Kreiraj'}
              </Button>
            </ButtonContainer>
          </form>
        </ModalContent>
      </ModalWrapper>
    </ModalOverlay>
  );
};

export default CreateItemModal;
