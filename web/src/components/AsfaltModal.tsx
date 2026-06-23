import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { apiService } from '../utils/api';
import { parseOtpremnicaPdf } from '../utils/parseOtpremnica';

// Styled Components (shared look with CreateItemModal)
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

const FileDropZone = styled.label<{ $dragging?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem;
  border: 2px dashed
    ${({ theme, $dragging }) => ($dragging ? theme.colors.primary : theme.colors.gray)};
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: ${({ theme, $dragging }) =>
    $dragging ? `${theme.colors.primary}10` : 'transparent'};
  color: ${({ theme, $dragging }) => ($dragging ? theme.colors.primary : '#666')};
  font-size: 0.875rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const AttachedFileNote = styled.p`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.primary};
  margin-top: 0.5rem;
  word-break: break-all;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
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

interface AsfaltModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface AsfaltFormData {
  title: string;
  code: string;
  registracija: string;
  neto?: number;
  prijevoznik: string;
}

const emptyForm: AsfaltFormData = {
  title: '',
  code: '',
  registracija: '',
  neto: undefined,
  prijevoznik: '',
};

const AsfaltModal: React.FC<AsfaltModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<AsfaltFormData>(emptyForm);
  const [parsing, setParsing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [dragging, setDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setPdfFile(null);
    setFormData(emptyForm);
    setError('');
    setParsing(false);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Molimo priložite PDF datoteku');
      return;
    }

    setError('');
    setPdfFile(file);
    setParsing(true);
    try {
      const parsed = await parseOtpremnicaPdf(file);
      setFormData({
        title: parsed.title,
        code: parsed.code,
        registracija: parsed.registracija,
        neto: parsed.neto,
        prijevoznik: parsed.prijevoznik,
      });
    } catch (err) {
      console.error('Error parsing PDF:', err);
      setError('Greška pri čitanju PDF-a. Polja možete unijeti ručno.');
    } finally {
      setParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragging) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const validateForm = (): boolean => {
    if (!pdfFile) {
      setError('PDF datoteka je obavezna');
      return false;
    }
    if (!formData.title.trim()) {
      setError('Naziv je obavezan');
      return false;
    }
    if (!formData.code.trim()) {
      setError('RN je obavezan');
      return false;
    }
    if (formData.neto !== undefined && isNaN(Number(formData.neto))) {
      setError('Neto mora biti broj');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm() || !pdfFile) return;

    setLoading(true);
    try {
      await apiService.createItemFromPdf(
        {
          title: formData.title.trim(),
          code: formData.code.trim(),
          registracija: formData.registracija.trim(),
          neto: formData.neto,
          prijevoznik: formData.prijevoznik,
        },
        pdfFile
      );
      onSuccess();
      resetState();
    } catch (err) {
      console.error('Error creating Asfalt item:', err);
      setError('Greška pri kreiranju dokumenta');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay>
      <ModalWrapper>
        <Backdrop onMouseDown={handleClose} />
        <ModalContent>
          <Title>Asfalt - novi dokument</Title>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <FormGroup>
            <Label>PDF otpremnica</Label>
            <FileDropZone
              $dragging={dragging}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}>
              {dragging
                ? 'Ispustite PDF ovdje'
                : pdfFile
                  ? 'Promijeni PDF datoteku (ili povucite i ispustite)'
                  : 'Kliknite ili povucite PDF datoteku ovdje'}
              <HiddenFileInput
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
              />
            </FileDropZone>
            {pdfFile && <AttachedFileNote>Priloženo: {pdfFile.name}</AttachedFileNote>}
            {parsing && <OptionalFieldNote>Čitanje PDF-a...</OptionalFieldNote>}
          </FormGroup>

          {pdfFile && (
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Label>Naziv</Label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Broj otpremnice"
                />
              </FormGroup>

              <FormGroup>
                <Label>RN</Label>
                <Input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Lokacija isporuke (broj)"
                />
              </FormGroup>

              <FormGroup>
                <Label>Registracija</Label>
                <Input
                  type="text"
                  value={formData.registracija}
                  onChange={e => setFormData({ ...formData, registracija: e.target.value })}
                  placeholder="Reg. oznaka vozila"
                />
              </FormGroup>

              <FormGroup>
                <Label>Neto / Težina</Label>
                <Input
                  type="number"
                  value={formData.neto === undefined ? '' : formData.neto}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      neto: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  placeholder="Neto masa"
                />
                {formData.neto !== undefined && (
                  <OptionalFieldNote>
                    Težina će biti automatski postavljena na: {formData.neto}
                  </OptionalFieldNote>
                )}
              </FormGroup>

              <FormGroup>
                <Label>Prijevoznik</Label>
                <Input
                  type="text"
                  value={formData.prijevoznik}
                  onChange={e => setFormData({ ...formData, prijevoznik: e.target.value })}
                  placeholder="Prijevoznik"
                />
              </FormGroup>

              <ButtonContainer>
                <Button type="button" onClick={handleClose} disabled={loading} variant="secondary">
                  Odustani
                </Button>
                <Button type="submit" disabled={loading || parsing} variant="primary">
                  {loading ? 'Kreiranje...' : 'Kreiraj'}
                </Button>
              </ButtonContainer>
            </form>
          )}
        </ModalContent>
      </ModalWrapper>
    </ModalOverlay>
  );
};

export default AsfaltModal;
