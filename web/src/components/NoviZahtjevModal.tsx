import React, { useState } from 'react';
import styled from 'styled-components';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 4px;
  font-size: 1rem;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 4px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  font-size: 1rem;
  background: ${({ theme, variant }) =>
    variant === 'primary' ? theme.colors.primary : theme.colors.gray};
  color: ${({ variant }) => (variant === 'primary' ? 'white' : 'black')};

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: 0.875rem;
  margin-top: 0.25rem;
`;

const Title = styled.h2`
  margin: 0 0 1.5rem 0;
  color: ${({ theme }) => theme.colors.text};
`;

interface NoviZahtjevModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    kamenolom: string;
    brojKamiona: number;
    prijevozNaDan: string;
  }) => Promise<void>;
}

const KAMENOLOMI = [
  'VELIČKI KAMEN',
  'KAMEN - PSUNJ',
  'MOLARIS',
  'PRODORINA',
];

const NoviZahtjevModal: React.FC<NoviZahtjevModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [kamenolom, setKamenolom] = useState('');
  const [brojKamiona, setBrojKamiona] = useState('');
  const [prijevozNaDan, setPrijevozNaDan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!kamenolom) {
      setError('Molimo odaberite kamenolom');
      return;
    }

    const brojKamionaNum = parseInt(brojKamiona, 10);
    if (!brojKamiona || brojKamionaNum < 1 || brojKamionaNum > 999) {
      setError('Broj kamiona mora biti između 1 i 999');
      return;
    }

    if (!prijevozNaDan) {
      setError('Molimo odaberite datum prijevoza');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        kamenolom,
        brojKamiona: brojKamionaNum,
        prijevozNaDan,
      });
      // Reset form
      setKamenolom('');
      setBrojKamiona('');
      setPrijevozNaDan('');
      onClose();
    } catch (err) {
      setError('Greška pri spremanju zahtjeva');
      console.error('Error submitting zahtjev:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setKamenolom('');
      setBrojKamiona('');
      setPrijevozNaDan('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <Title>Novi zahtjev</Title>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="kamenolom">Kamenolom</Label>
            <Select
              id="kamenolom"
              value={kamenolom}
              onChange={e => setKamenolom(e.target.value)}
              required>
              <option value="">Odaberite kamenolom...</option>
              {KAMENOLOMI.map(k => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="brojKamiona">Broj kamiona</Label>
            <Input
              id="brojKamiona"
              type="number"
              min="1"
              max="999"
              value={brojKamiona}
              onChange={e => setBrojKamiona(e.target.value)}
              placeholder="Unesite broj kamiona (1-999)"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="prijevozNaDan">Prijevoz na dan</Label>
            <Input
              id="prijevozNaDan"
              type="date"
              value={prijevozNaDan}
              onChange={e => setPrijevozNaDan(e.target.value)}
              required
            />
          </FormGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <ButtonGroup>
            <Button type="button" onClick={handleClose} disabled={isLoading}>
              Odustani
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? 'Spremanje...' : 'Spremi'}
            </Button>
          </ButtonGroup>
        </Form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default NoviZahtjevModal;
