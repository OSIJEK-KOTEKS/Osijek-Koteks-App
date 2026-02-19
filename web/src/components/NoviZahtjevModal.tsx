import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { codeToTextMapping, getFormattedCode } from '../utils/codeMapping';
import { apiService } from '../utils/api';

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

const ToggleRow = styled.div`
  display: flex;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 4px;
  overflow: hidden;
`;

const ToggleOption = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 0.65rem 1rem;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : 'white')};
  color: ${({ $active }) => ($active ? 'white' : '#333')};
  transition: background 0.2s, color 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

const SelectionContainer = styled.div`
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 4px;
  padding: 0.5rem;
`;

const SectionLabel = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.5rem 0.5rem 0.25rem;
  margin-top: 0.25rem;

  &:first-child {
    margin-top: 0;
  }
`;

const CheckboxItem = styled.label<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'pointer')};
  border-radius: 4px;
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};

  &:hover {
    background-color: ${({ theme, $disabled }) => ($disabled ? 'transparent' : theme.colors.background)};
  }
`;

const Checkbox = styled.input`
  cursor: pointer;

  &:disabled {
    cursor: default;
  }
`;

const ItemName = styled.span`
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text};
`;

const GroupTag = styled.span`
  font-size: 0.75rem;
  color: #888;
  font-style: italic;
  margin-left: 0.25rem;
`;

const MapPreview = styled.div`
  margin-top: 0.5rem;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #ddd;

  img {
    display: block;
    width: 100%;
    height: 150px;
    object-fit: cover;
  }
`;

const MapLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #666;
`;

interface CodeLocationData {
  _id: string;
  code: string;
  latitude: number;
  longitude: number;
}

interface NoviZahtjevModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    kamenolom: string;
    gradiliste: string;
    brojKamiona: number;
    prijevozNaDan: string;
    isplataPoT: number;
    assignedTo: 'All' | string[];
  }) => Promise<void>;
  codeLocations?: CodeLocationData[];
}

const KAMENOLOMI = [
  'VELIČKI KAMEN VELIČANKA',
  'VELIČKI KAMEN VETOVO',
  'KAMEN - PSUNJ',
  'MOLARIS',
  'PRODORINA',
];

interface PrijevozUser {
  _id: string;
  firstName: string;
  lastName: string;
}

interface Group {
  _id: string;
  name: string;
  users: PrijevozUser[];
}

const getStaticMapUrl = (lat: number, lng: number): string => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=13&size=460x150&scale=2&markers=color:red|${lat},${lng}&key=${apiKey}`;
};

const NoviZahtjevModal: React.FC<NoviZahtjevModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  codeLocations = [],
}) => {
  const [kamenolom, setKamenolom] = useState('');
  const [gradiliste, setGradiliste] = useState('');

  const kamenolomLocation = useMemo(() => {
    if (!kamenolom) return null;
    return codeLocations.find(loc => loc.code === kamenolom) || null;
  }, [kamenolom, codeLocations]);

  const gradilisteLocation = useMemo(() => {
    if (!gradiliste) return null;
    return codeLocations.find(loc => loc.code === gradiliste) || null;
  }, [gradiliste, codeLocations]);
  const [brojKamiona, setBrojKamiona] = useState('');
  const [prijevozNaDan, setPrijevozNaDan] = useState<Date | null>(null);
  const [isplataPoT, setIsplataPoT] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignMode, setAssignMode] = useState<'all' | 'specific'>('all');
  const [prijevozUsers, setPrijevozUsers] = useState<PrijevozUser[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (isOpen && assignMode === 'specific' && prijevozUsers.length === 0) {
      fetchSelectionData();
    }
  }, [isOpen, assignMode]);

  const fetchSelectionData = async () => {
    setIsLoadingData(true);
    try {
      const [users, groupsData] = await Promise.all([
        apiService.getUsersWithPrijevozAccess(),
        apiService.getGroups(),
      ]);
      setPrijevozUsers(users);
      setGroups(groupsData);
    } catch (error: any) {
      console.error('Error fetching selection data:', error);
      setError(`Greška pri učitavanju podataka: ${error?.response?.data?.message || error.message}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Compute which user IDs are covered by selected groups
  const usersInSelectedGroups = useMemo(() => {
    const userIdSet = new Set<string>();
    for (const groupId of selectedGroupIds) {
      const group = groups.find(g => g._id === groupId);
      if (group) {
        for (const user of group.users) {
          userIdSet.add(typeof user === 'string' ? user : user._id);
        }
      }
    }
    return userIdSet;
  }, [selectedGroupIds, groups]);

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroupIds(prev => {
      const newSelection = prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId];

      // When a group is selected, remove its users from individual selection
      const group = groups.find(g => g._id === groupId);
      if (group && !prev.includes(groupId)) {
        const groupUserIds = group.users.map(u => typeof u === 'string' ? u : u._id);
        setSelectedUserIds(prevUsers => prevUsers.filter(uid => !groupUserIds.includes(uid)));
      }

      return newSelection;
    });
  };

  const handleUserToggle = (userId: string) => {
    // Don't allow toggling users that are in selected groups
    if (usersInSelectedGroups.has(userId)) return;

    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Resolve final list of unique user IDs from selected groups + individual users
  const resolveAssignedUserIds = (): string[] => {
    const allUserIds = new Set<string>();

    // Add users from selected groups
    for (const groupId of selectedGroupIds) {
      const group = groups.find(g => g._id === groupId);
      if (group) {
        for (const user of group.users) {
          allUserIds.add(typeof user === 'string' ? user : user._id);
        }
      }
    }

    // Add individually selected users
    for (const userId of selectedUserIds) {
      allUserIds.add(userId);
    }

    return Array.from(allUserIds);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      setError('Isplata po (t) mora biti pozitivan broj');
      return;
    }

    if (assignMode === 'specific') {
      const resolvedIds = resolveAssignedUserIds();
      if (resolvedIds.length === 0) {
        setError('Molimo odaberite barem jednog prijevoznika ili grupu');
        return;
      }
    }

    const formattedDate = format(prijevozNaDan, 'dd/MM/yyyy');

    setIsLoading(true);
    try {
      await onSubmit({
        kamenolom,
        gradiliste,
        brojKamiona: brojKamionaNum,
        prijevozNaDan: formattedDate,
        isplataPoT: isplataPoTNum,
        assignedTo: assignMode === 'all' ? 'All' : resolveAssignedUserIds(),
      });
      resetForm();
      onClose();
    } catch (err) {
      setError('Greška pri spremanju zahtjeva');
      console.error('Error submitting zahtjev:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setKamenolom('');
    setGradiliste('');
    setBrojKamiona('');
    setPrijevozNaDan(null);
    setIsplataPoT('');
    setAssignMode('all');
    setSelectedUserIds([]);
    setSelectedGroupIds([]);
    setError('');
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onMouseDown={handleClose}>
      <ModalContent onMouseDown={e => e.stopPropagation()}>
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
            {kamenolom && kamenolomLocation && (
              <>
                <MapPreview>
                  <img
                    src={getStaticMapUrl(kamenolomLocation.latitude, kamenolomLocation.longitude)}
                    alt={`Lokacija: ${kamenolom}`}
                  />
                </MapPreview>
                <MapLabel>
                  <span>{kamenolomLocation.latitude.toFixed(5)}, {kamenolomLocation.longitude.toFixed(5)}</span>
                  <a
                    href={`https://www.google.com/maps?q=${kamenolomLocation.latitude},${kamenolomLocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit' }}
                  >
                    Otvori u Maps
                  </a>
                </MapLabel>
              </>
            )}
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
            {gradiliste && gradilisteLocation && (
              <>
                <MapPreview>
                  <img
                    src={getStaticMapUrl(gradilisteLocation.latitude, gradilisteLocation.longitude)}
                    alt={`Lokacija: ${getFormattedCode(gradiliste)}`}
                  />
                </MapPreview>
                <MapLabel>
                  <span>{gradilisteLocation.latitude.toFixed(5)}, {gradilisteLocation.longitude.toFixed(5)}</span>
                  <a
                    href={`https://www.google.com/maps?q=${gradilisteLocation.latitude},${gradilisteLocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit' }}
                  >
                    Otvori u Maps
                  </a>
                </MapLabel>
              </>
            )}
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
            <Label htmlFor="isplataPoT">Isplata po (t) za ovu relaciju</Label>
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

          <FormGroup>
            <Label>Dodjeli prijevoznicima</Label>
            <ToggleRow>
              <ToggleOption
                type="button"
                $active={assignMode === 'all'}
                onClick={() => setAssignMode('all')}
              >
                Svi prijevoznici
              </ToggleOption>
              <ToggleOption
                type="button"
                $active={assignMode === 'specific'}
                onClick={() => {
                  setAssignMode('specific');
                  if (prijevozUsers.length === 0) {
                    fetchSelectionData();
                  }
                }}
              >
                Određeni prijevoznici
              </ToggleOption>
            </ToggleRow>
          </FormGroup>

          {assignMode === 'specific' && (
            <FormGroup>
              <Label>Odaberite grupe i prijevoznike</Label>
              <SelectionContainer>
                {isLoadingData ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                    Učitavanje...
                  </div>
                ) : (
                  <>
                    {groups.length > 0 && (
                      <>
                        <SectionLabel>Grupe</SectionLabel>
                        {groups.map(group => {
                          const memberCount = group.users ? group.users.length : 0;
                          return (
                            <CheckboxItem key={`group-${group._id}`}>
                              <Checkbox
                                type="checkbox"
                                checked={selectedGroupIds.includes(group._id)}
                                onChange={() => handleGroupToggle(group._id)}
                              />
                              <ItemName>
                                {group.name}
                                <GroupTag>({memberCount} {memberCount === 1 ? 'član' : 'članova'})</GroupTag>
                              </ItemName>
                            </CheckboxItem>
                          );
                        })}
                      </>
                    )}

                    <SectionLabel>Prijevoznici</SectionLabel>
                    {prijevozUsers.length === 0 ? (
                      <div style={{ padding: '0.5rem', textAlign: 'center', color: '#666' }}>
                        Nema dostupnih korisnika
                      </div>
                    ) : (
                      prijevozUsers.map(user => {
                        const isInGroup = usersInSelectedGroups.has(user._id);
                        return (
                          <CheckboxItem key={`user-${user._id}`} $disabled={isInGroup}>
                            <Checkbox
                              type="checkbox"
                              checked={selectedUserIds.includes(user._id) || isInGroup}
                              disabled={isInGroup}
                              onChange={() => handleUserToggle(user._id)}
                            />
                            <ItemName>
                              {`${user.firstName} ${user.lastName}`}
                              {isInGroup && <GroupTag>(u grupi)</GroupTag>}
                            </ItemName>
                          </CheckboxItem>
                        );
                      })
                    )}
                  </>
                )}
              </SelectionContainer>
            </FormGroup>
          )}

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
