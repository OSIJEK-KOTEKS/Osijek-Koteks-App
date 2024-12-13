import React, {useState} from 'react';
import styled from 'styled-components';
import {User, RegistrationData} from '../types';
import {apiService} from '../utils/api';

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
  width: 95%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: ${({theme}) => theme.colors.text};
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid ${({theme}) => theme.colors.gray};
  border-radius: 4px;
  font-size: 1rem;
`;

const Select = styled.select`
  padding: 0.5rem;
  border: 1px solid ${({theme}) => theme.colors.gray};
  border-radius: 4px;
  font-size: 1rem;
`;

const CodesInputSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const CodesInputRow = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: start;
`;

const CodesSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid ${({theme}) => theme.colors.gray};
  border-radius: 4px;
  font-size: 1rem;
  flex: 1;
`;

const CodesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const CodeBadge = styled.div`
  background: ${({theme}) => theme.colors.gray};
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const RemoveCodeButton = styled.button`
  background: none;
  border: none;
  color: ${({theme}) => theme.colors.error};
  cursor: pointer;
  padding: 0;
  font-size: 1.2rem;
  line-height: 1;
  display: flex;
  align-items: center;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
`;

const Button = styled.button<{variant?: 'primary' | 'secondary'}>`
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  background: ${({theme, variant}) =>
    variant === 'primary' ? theme.colors.primary : theme.colors.gray};
  color: ${({variant}) => (variant === 'primary' ? 'white' : 'black')};

  &:hover {
    opacity: 0.9;
  }
`;

const ErrorMessage = styled.div`
  color: ${({theme}) => theme.colors.error};
  font-size: 0.875rem;
  margin-top: 0.5rem;
`;

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableCodes: string[];
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableCodes,
}) => {
  const [formData, setFormData] = useState<RegistrationData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    company: '',
    role: 'user',
    codes: [],
  });
  const [newCode, setNewCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateForm = () => {
    if (!formData.email || !formData.email.includes('@')) {
      setError('Unesite ispravnu email adresu');
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('Lozinka mora imati najmanje 6 znakova');
      return false;
    }
    if (!formData.firstName || !formData.lastName) {
      setError('Ime i prezime su obavezni');
      return false;
    }
    if (!formData.company) {
      setError('Firma je obavezna');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      await apiService.createUser(formData);
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        company: '',
        role: 'user',
        codes: [],
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Greška pri kreiranju korisnika');
      console.error('Error creating user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualCodeAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!/^\d{5}$/.test(newCode)) {
      setError('Kod mora sadržavati točno 5 brojeva');
      return;
    }

    if (formData.codes.includes(newCode)) {
      setError('Ovaj kod već postoji');
      return;
    }

    setFormData(prev => ({
      ...prev,
      codes: [...prev.codes, newCode].sort(),
    }));
    setNewCode('');
    setError('');
  };

  const handleExistingCodeAdd = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    if (!selectedCode) return;

    if (!formData.codes.includes(selectedCode)) {
      setFormData(prev => ({
        ...prev,
        codes: [...prev.codes, selectedCode].sort(),
      }));
    }
    e.target.value = ''; // Reset select after adding
  };

  const handleRemoveCode = (codeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      codes: prev.codes.filter(code => code !== codeToRemove),
    }));
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <h2>Dodaj novog korisnika</h2>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              required
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </FormGroup>

          <FormGroup>
            <Label>Lozinka</Label>
            <Input
              type="password"
              value={formData.password}
              onChange={e =>
                setFormData({...formData, password: e.target.value})
              }
              required
              placeholder="Minimalno 6 znakova"
              autoComplete="new-password"
            />
          </FormGroup>

          <FormGroup>
            <Label>Ime</Label>
            <Input
              type="text"
              value={formData.firstName}
              onChange={e =>
                setFormData({...formData, firstName: e.target.value})
              }
              required
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
          </FormGroup>

          <FormGroup>
            <Label>Prezime</Label>
            <Input
              type="text"
              value={formData.lastName}
              onChange={e =>
                setFormData({...formData, lastName: e.target.value})
              }
              required
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
          </FormGroup>

          <FormGroup>
            <Label>Firma</Label>
            <Input
              type="text"
              value={formData.company}
              onChange={e =>
                setFormData({...formData, company: e.target.value})
              }
              required
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
          </FormGroup>

          <FormGroup>
            <Label>Uloga</Label>
            <Select
              value={formData.role}
              onChange={e =>
                setFormData({
                  ...formData,
                  role: e.target.value as User['role'],
                })
              }>
              <option value="user">Korisnik</option>
              <option value="admin">Administrator</option>
              <option value="bot">Bot</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Radni nalozi</Label>
            <CodesInputSection>
              <CodesInputRow>
                <Input
                  type="text"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  placeholder="Unesi 5 brojeva"
                  maxLength={5}
                  pattern="\d{5}"
                  autoComplete="off"
                />
                <Button type="button" onClick={handleManualCodeAdd}>
                  Dodaj
                </Button>
              </CodesInputRow>

              <CodesInputRow>
                <CodesSelect value="" onChange={handleExistingCodeAdd}>
                  <option value="">Odaberi postojeći kod...</option>
                  {availableCodes
                    .filter(code => !formData.codes.includes(code))
                    .map(code => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                </CodesSelect>
              </CodesInputRow>
            </CodesInputSection>

            <CodesList>
              {formData.codes.map(code => (
                <CodeBadge key={code}>
                  {code}
                  <RemoveCodeButton
                    type="button"
                    onClick={() => handleRemoveCode(code)}>
                    ×
                  </RemoveCodeButton>
                </CodeBadge>
              ))}
            </CodesList>
          </FormGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <ButtonGroup>
            <Button type="button" onClick={onClose}>
              Odustani
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? 'Kreiranje...' : 'Kreiraj'}
            </Button>
          </ButtonGroup>
        </Form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default CreateUserModal;
