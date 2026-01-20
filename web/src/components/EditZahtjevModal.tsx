import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parse } from 'date-fns';
import { codeToTextMapping, getFormattedCode } from '../utils/codeMapping';

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

const DatePickerWrapper = styled.div`
  .react-datepicker-wrapper {
    width: 100%;
  }

  .react-datepicker__input-container input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid ${({ theme }) => theme.colors.gray};
    border-radius: 4px;
    font-size: 1rem;

    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.colors.primary};
    }
  }
`;

interface TransportRequest {
  _id: string;
  kamenolom: string;
  gradiliste: string;
  brojKamiona: number;
  prijevozNaDan: string;
  isplataPoT: number;
  status: string;
}

interface EditZahtjevModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    kamenolom: string;
    gradiliste: string;
    brojKamiona: number;
    prijevozNaDan: string;
    isplataPoT: number;
  }) => Promise<void>;
  request: TransportRequest | null;
}

const KAMENOLOMI = [
  'VELIČKI KAMEN',
  'KAMEN - PSUNJ',
  'MOLARIS',
  'PRODORINA',
];

const EditZahtjevModal: React.FC<EditZahtjevModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  request,
}) => {
  const [kamenolom, setKamenolom] = useState('');
  const [gradiliste, setGradiliste] = useState('');
  const [brojKamiona, setBrojKamiona] = useState('');
  const [prijevozNaDan, setPrijevozNaDan] = useState<Date | null>(null);
  const [isplataPoT, setIsplataPoT] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Populate form when request changes
  useEffect(() => {
    if (request) {
      setKamenolom(request.kamenolom);
      setGradiliste(request.gradiliste);
      setBrojKamiona(request.brojKamiona.toString());
      setIsplataPoT(request.isplataPoT.toString());

      // Parse the date from dd/MM/yyyy format
      try {
        const parsedDate = parse(request.prijevozNaDan, 'dd/MM/yyyy', new Date());
        setPrijevozNaDan(parsedDate);
      } catch (err) {
        console.error('Error parsing date:', err);
        setPrijevozNaDan(null);
      }
    }
  }, [request]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!kamenolom) {
      setError('Molimo odaberite kamenolom');
      return;
    }

    if (!gradiliste) {
      setError('Molimo odaberite gradilište');
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

    const isplataPoTNum = parseFloat(isplataPoT);
    if (!isplataPoT || isNaN(isplataPoTNum) || isplataPoTNum < 0) {
      setError('Isplata po t mora biti pozitivan broj');
      return;
    }

    // Format date to dd/mm/yyyy
    const formattedDate = format(prijevozNaDan, 'dd/MM/yyyy');

    setIsLoading(true);
    try {
      await onSubmit({
        kamenolom,
        gradiliste,
        brojKamiona: brojKamionaNum,
        prijevozNaDan: formattedDate,
        isplataPoT: isplataPoTNum,
      });
      onClose();
    } catch (err) {
      setError('Greška pri spremanju izmjena');
      console.error('Error updating zahtjev:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError('');
      onClose();
    }
  };

  if (!isOpen || !request) return null;

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <Title>Uredi zahtjev</Title>
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
            <Label htmlFor="gradiliste">Gradilište</Label>
            <Select
              id="gradiliste"
              value={gradiliste}
              onChange={e => setGradiliste(e.target.value)}
              required>
              <option value="">Odaberite gradilište...</option>
              {Object.keys(codeToTextMapping).sort().map(code => (
                <option key={code} value={code}>
                  {getFormattedCode(code)}
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
            <DatePickerWrapper>
              <DatePicker
                selected={prijevozNaDan}
                onChange={(date: Date | null) => setPrijevozNaDan(date)}
                dateFormat="dd/MM/yyyy"
                placeholderText="DD/MM/YYYY"
                required
              />
            </DatePickerWrapper>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="isplataPoT">Isplata po t za ovu relaciju</Label>
            <Input
              id="isplataPoT"
              type="number"
              step="0.01"
              min="0"
              value={isplataPoT}
              onChange={e => setIsplataPoT(e.target.value)}
              placeholder="Unesite iznos (npr. 0.55, 2, 6)"
              required
            />
          </FormGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <ButtonGroup>
            <Button type="button" onClick={handleClose} disabled={isLoading}>
              Odustani
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? 'Spremanje...' : 'Spremi izmjene'}
            </Button>
          </ButtonGroup>
        </Form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default EditZahtjevModal;
