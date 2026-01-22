import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import * as S from '../components/styled/Common';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.large};
  width: 100%;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.medium};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.medium};

  & > button,
  & button {
    padding: 1.152rem 1.536rem !important;
    font-size: 0.935rem !important;
    width: auto;
    min-width: 0;
  }

  & > ${S.Button}, & ${S.Button} {
    padding: 1.152rem 1.536rem !important;
    font-size: 0.935rem !important;
    width: auto;
    min-width: 0;
  }
`;

const DashboardContainer = styled.div`
  background: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.main};
  padding: ${({ theme }) => theme.spacing.large};
`;

const ContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.large};
`;

const ContentTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
`;

const ContentText = styled.p`
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.6;
  margin-bottom: ${({ theme }) => theme.spacing.large};
`;

const RegistrationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: ${({ theme }) => theme.spacing.medium};
`;

const RegistrationCard = styled.div`
  padding: 1rem;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.main};
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const RegistrationText = styled.div`
  font-size: 1rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  text-align: center;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${({ theme }) => theme.colors.gray};
  font-style: italic;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${({ theme }) => theme.colors.text};
`;

const StatsContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: ${({ theme }) => theme.spacing.large};
`;

const StatCard = styled.div`
  flex: 1;
  padding: 1.5rem;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary} 0%, #0056b3 100%);
  border-radius: 8px;
  color: white;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  opacity: 0.9;
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 600;
`;

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
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h2`
  margin: 0 0 1rem 0;
  color: ${({ theme }) => theme.colors.text};
`;

const ModalSubtitle = styled.p`
  margin: 0 0 1.5rem 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.875rem;
`;

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const UserItem = styled.div<{ selected?: boolean }>`
  padding: 1rem;
  background-color: ${({ selected, theme }) =>
    selected ? theme.colors.primary + '20' : theme.colors.background};
  border: 2px solid
    ${({ selected, theme }) => (selected ? theme.colors.primary : theme.colors.gray)};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background-color: ${({ theme }) => theme.colors.primary + '10'};
  }
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const UserName = styled.div`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const UserEmail = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.gray};
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const ModalButton = styled.button<{ primary?: boolean }>`
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  font-size: 1rem;
  transition: all 0.2s;
  background: ${({ primary, theme }) => (primary ? theme.colors.primary : '#e9ecef')};
  color: ${({ primary }) => (primary ? 'white' : '#495057')};

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

interface UserWithRegistrations {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  assignedRegistrations: string[];
}

const RegistracijePage: React.FC = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [registrations, setRegistrations] = useState<string[]>([]);
  const [allFullRegistrations, setAllFullRegistrations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<string | null>(null);
  const [users, setUsers] = useState<UserWithRegistrations[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    // Redirect non-admin users
    if (user && !isAdmin) {
      navigate('/dashboard');
    }
  }, [user, isAdmin, navigate]);

  // Extract first part of registration (up to and including first letter code)
  const getFirstPartOfRegistration = (registration: string): string => {
    // Pattern 1: With spaces - "PŽ 995 FD", "SB 004 NP", "NA 224 O"
    // Match: letters + space + numbers + space + 1-4 letters (not followed by more digits)
    const withSpaces = registration.match(/^([A-ZŠĐČĆŽ]+\s+\d+\s+[A-ZŠĐČĆŽ]{1,4})(?!\d)/i);
    if (withSpaces) return withSpaces[1];

    // Pattern 2: Without spaces - "NG341CP", "AB123CD"
    // Match: letters, then digits, then 1-4 letters
    const withoutSpaces = registration.match(/^([A-ZŠĐČĆŽ]+\d+[A-ZŠĐČĆŽ]{1,4})(?!\d)/i);
    if (withoutSpaces) return withoutSpaces[1];

    // Fallback: return original if no pattern matches
    return registration;
  };

  const fetchRegistrations = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getUniqueRegistrations();

      // Store all full registrations for matching later
      setAllFullRegistrations(data);

      // Extract first part of each registration and remove duplicates
      const firstParts = data.map(reg => getFirstPartOfRegistration(reg));
      const uniqueFirstParts = Array.from(new Set(firstParts)).sort();

      setRegistrations(uniqueFirstParts);
      console.log('Fetched registrations:', data);
      console.log('Unique first parts:', uniqueFirstParts);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersData = await apiService.getUsers();
      // Sort users alphabetically by first name
      const sortedUsers = usersData.sort((a, b) =>
        a.firstName.localeCompare(b.firstName, 'hr')
      );
      setUsers(sortedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleRegistrationClick = async (registration: string) => {
    setSelectedRegistration(registration);
    setSelectedUserId(null);
    setIsModalOpen(true);
    await fetchUsers();
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleAssignRegistration = async () => {
    if (!selectedRegistration || !selectedUserId) return;

    try {
      setIsAssigning(true);

      // Find all full registrations that start with the selected registration
      const matchingRegistrations = allFullRegistrations.filter(fullReg => {
        const firstPart = getFirstPartOfRegistration(fullReg);
        return firstPart === selectedRegistration;
      });

      console.log('Assigning registrations:', matchingRegistrations);

      // Get the current user's assigned registrations
      const selectedUser = users.find(u => u._id === selectedUserId);
      if (!selectedUser) return;

      // Merge with existing registrations and remove duplicates
      const updatedRegistrations = Array.from(
        new Set([...selectedUser.assignedRegistrations, ...matchingRegistrations])
      );

      // Update the user with the new registrations
      await apiService.updateUser(selectedUserId, {
        assignedRegistrations: updatedRegistrations,
      });

      alert(
        `Successfully assigned ${matchingRegistrations.length} registration(s) to ${selectedUser.firstName} ${selectedUser.lastName}`
      );

      setIsModalOpen(false);
      setSelectedRegistration(null);
      setSelectedUserId(null);
    } catch (error) {
      console.error('Error assigning registration:', error);
      alert('Failed to assign registration. Please try again.');
    } finally {
      setIsAssigning(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchRegistrations();
    }
  }, [user, isAdmin]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleNavigateToDashboard = () => {
    navigate('/dashboard');
  };

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  return (
    <S.PageContainer>
      <Header>
        <HeaderLeft>
          <Logo />
        </HeaderLeft>
        <HeaderActions>
          <S.Button onClick={handleNavigateToDashboard}>Početna</S.Button>
          <S.Button onClick={handleLogout}>Odjava</S.Button>
        </HeaderActions>
      </Header>

      <DashboardContainer>
        <ContentHeader>
          <ContentTitle>Registracije Vozila</ContentTitle>
        </ContentHeader>
        <ContentText>
          Pregled svih jedinstvenih registracijskih oznaka vozila u sustavu.
        </ContentText>

        <StatsContainer>
          <StatCard>
            <StatLabel>Ukupno registracija</StatLabel>
            <StatValue>{registrations.length}</StatValue>
          </StatCard>
        </StatsContainer>

        {isLoading ? (
          <LoadingState>Učitavanje...</LoadingState>
        ) : registrations.length === 0 ? (
          <EmptyState>Nema registracija za prikaz</EmptyState>
        ) : (
          <RegistrationGrid>
            {registrations.map((registration, index) => (
              <RegistrationCard key={index} onClick={() => handleRegistrationClick(registration)}>
                <RegistrationText>{registration}</RegistrationText>
              </RegistrationCard>
            ))}
          </RegistrationGrid>
        )}
      </DashboardContainer>

      {/* Assignment Modal */}
      {isModalOpen && (
        <ModalOverlay onClick={() => setIsModalOpen(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalTitle>Dodijeli registraciju: {selectedRegistration}</ModalTitle>
            <ModalSubtitle>
              Odaberite korisnika kojem želite dodijeliti ovu registraciju. Svi zapisi koji
              započinju s "{selectedRegistration}" bit će dodijeljeni odabranom korisniku.
            </ModalSubtitle>

            <UserList>
              {users.map(user => (
                <UserItem
                  key={user._id}
                  selected={selectedUserId === user._id}
                  onClick={() => handleUserSelect(user._id)}
                >
                  <UserName>
                    {user.firstName} {user.lastName}
                  </UserName>
                </UserItem>
              ))}
            </UserList>

            <ModalActions>
              <ModalButton onClick={() => setIsModalOpen(false)}>Odustani</ModalButton>
              <ModalButton
                primary
                onClick={handleAssignRegistration}
                disabled={!selectedUserId || isAssigning}
              >
                {isAssigning ? 'Dodjeljivanje...' : 'Dodijeli'}
              </ModalButton>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}
    </S.PageContainer>
  );
};

export default RegistracijePage;
