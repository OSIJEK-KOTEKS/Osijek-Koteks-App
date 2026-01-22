import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import * as S from '../components/styled/Common';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import NoviZahtjevModal from '../components/NoviZahtjevModal';
import NoviZahtjevZaPrijevoznike from '../components/NoviZahtjevZaPrijevoznike';
import EditZahtjevModal from '../components/EditZahtjevModal';
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

const SmallButton = styled(S.Button)`
  padding: 0.5rem 1rem !important;
  font-size: 0.875rem !important;
  min-width: auto !important;
  width: auto !important;
  max-width: fit-content !important;
`;

const ContentText = styled.p`
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.6;
`;

const ButtonSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.large};
  display: flex;
  gap: ${({ theme }) => theme.spacing.medium};
`;

const RequestsContainer = styled(DashboardContainer)`
  margin-top: ${({ theme }) => theme.spacing.large};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: ${({ theme }) => theme.spacing.medium};
`;

const Th = styled.th`
  text-align: left;
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.colors.background};
  border-bottom: 2px solid ${({ theme }) => theme.colors.gray};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const Td = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.gray};
  color: ${({ theme }) => theme.colors.text};
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  display: inline-block;
  background-color: ${({ status }) => {
    switch (status) {
      case 'approved':
        return '#d4edda';
      case 'rejected':
        return '#f8d7da';
      case 'completed':
        return '#d1ecf1';
      case 'pending':
        return '#fef3cd';
      default:
        return '#e9ecef';
    }
  }};
  color: ${({ status }) => {
    switch (status) {
      case 'approved':
        return '#155724';
      case 'rejected':
        return '#721c24';
      case 'completed':
        return '#0c5460';
      case 'pending':
        return '#856404';
      default:
        return '#495057';
    }
  }};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${({ theme }) => theme.colors.gray};
`;

const ActionButton = styled.button`
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: white;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    color: white;
  }
`;

const DeleteButton = styled.button`
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  border: 1px solid #dc3545;
  background: white;
  color: #dc3545;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #dc3545;
    color: white;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
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
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  color: ${({ theme }) => theme.colors.text};
`;

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const UserItem = styled.div`
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: 4px;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text};
`;

const ModalCloseButton = styled.button`
  margin-top: 1.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  font-size: 1rem;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  width: 100%;

  &:hover {
    opacity: 0.9;
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
  createdAt: string;
  userEmail: string;
  assignedTo: 'All' | string[];
}

const PrijevozPage: React.FC = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSpecificDriversModalOpen, setIsSpecificDriversModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignedUsersModalOpen, setIsAssignedUsersModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<TransportRequest | null>(null);
  const [selectedRequestForUsers, setSelectedRequestForUsers] = useState<TransportRequest | null>(null);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assignedUsers, setAssignedUsers] = useState<Array<{ _id: string; firstName: string; lastName: string }>>([]);
  const [uniqueRegistrations, setUniqueRegistrations] = useState<string[]>([]);

  const isAdmin = user?.role === 'admin';

  console.log('PrijevozPage - User:', user);
  console.log('PrijevozPage - isAdmin:', isAdmin);
  console.log('PrijevozPage - user.role:', user?.role);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error : ', err);
    }
  };

  const handleNavigateToDashboard = () => {
    navigate('/dashboard');
  };

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getTransportRequests();

      // Filter requests based on user role and assignment
      let filteredData = data;
      if (user) {
        if (user.role === 'admin') {
          // Admin sees all requests
          filteredData = data;
        } else {
          // Regular user sees only requests assigned to "All" or containing their user ID
          filteredData = data.filter((request: TransportRequest) => {
            if (request.assignedTo === 'All') {
              return true;
            }
            if (Array.isArray(request.assignedTo)) {
              return request.assignedTo.includes(user._id);
            }
            return false;
          });
        }
      }

      setRequests(filteredData);
    } catch (error) {
      console.error('Error fetching transport requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
      fetchUniqueRegistrations();
    }
  }, [user]);

  const fetchUniqueRegistrations = async () => {
    try {
      const registrations = await apiService.getUniqueRegistrations();
      setUniqueRegistrations(registrations);
      console.log('Unique registrations:', registrations);
    } catch (error) {
      console.error('Error fetching unique registrations:', error);
    }
  };

  const handleSubmitZahtjev = async (data: {
    kamenolom: string;
    gradiliste: string;
    brojKamiona: number;
    prijevozNaDan: string;
    isplataPoT: number;
  }) => {
    try {
      console.log('Submitting transport request:', data);
      const response = await apiService.createTransportRequest({
        ...data,
        assignedTo: 'All',
      });
      console.log('Transport request created:', response);
      alert(`Zahtjev uspješno kreiran!\nKamenolom: ${data.kamenolom}\nGradilište: ${data.gradiliste}\nBroj kamiona: ${data.brojKamiona}\nDatum: ${data.prijevozNaDan}`);
      // Refresh the list after creating a new request
      await fetchRequests();
    } catch (error) {
      console.error('Error creating transport request:', error);
      alert('Greška pri kreiranju zahtjeva. Molimo pokušajte ponovno.');
    }
  };

  const handleSubmitSpecificDriversZahtjev = async (data: {
    kamenolom: string;
    gradiliste: string;
    brojKamiona: number;
    prijevozNaDan: string;
    isplataPoT: number;
    selectedUserIds: string[];
  }) => {
    try {
      console.log('Submitting transport request for specific drivers:', data);
      const response = await apiService.createTransportRequest({
        kamenolom: data.kamenolom,
        gradiliste: data.gradiliste,
        brojKamiona: data.brojKamiona,
        prijevozNaDan: data.prijevozNaDan,
        isplataPoT: data.isplataPoT,
        assignedTo: data.selectedUserIds,
      });
      console.log('Transport request created:', response);
      alert(`Zahtjev uspješno kreiran za ${data.selectedUserIds.length} prijevoznika!\nKamenolom: ${data.kamenolom}\nGradilište: ${data.gradiliste}\nBroj kamiona: ${data.brojKamiona}\nDatum: ${data.prijevozNaDan}`);
      // Refresh the list after creating the request
      await fetchRequests();
    } catch (error) {
      console.error('Error creating transport request:', error);
      alert('Greška pri kreiranju zahtjeva. Molimo pokušajte ponovno.');
    }
  };

  const handleEditClick = (request: TransportRequest) => {
    setEditingRequest(request);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (data: {
    kamenolom: string;
    gradiliste: string;
    brojKamiona: number;
    prijevozNaDan: string;
    isplataPoT: number;
  }) => {
    if (!editingRequest) return;

    try {
      console.log('Updating transport request:', editingRequest._id, data);
      await apiService.updateTransportRequest(editingRequest._id, data);
      alert('Zahtjev uspješno ažuriran!');
      // Refresh the list after updating
      await fetchRequests();
      setIsEditModalOpen(false);
      setEditingRequest(null);
    } catch (error) {
      console.error('Error updating transport request:', error);
      alert('Greška pri ažuriranju zahtjeva. Molimo pokušajte ponovno.');
      throw error;
    }
  };

  const handleDeleteClick = async (request: TransportRequest) => {
    const confirmDelete = window.confirm(
      `Jeste li sigurni da želite obrisati zahtjev?\n\nKamenolom: ${request.kamenolom}\nGradilište: ${request.gradiliste}\nBroj kamiona: ${request.brojKamiona}\nDatum: ${request.prijevozNaDan}`
    );

    if (!confirmDelete) return;

    try {
      console.log('Deleting transport request:', request._id);
      await apiService.deleteTransportRequest(request._id);
      alert('Zahtjev uspješno obrisan!');
      // Refresh the list after deleting
      await fetchRequests();
    } catch (error) {
      console.error('Error deleting transport request:', error);
      alert('Greška pri brisanju zahtjeva. Molimo pokušajte ponovno.');
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Na čekanju';
      case 'approved':
        return 'Odobreno';
      case 'rejected':
        return 'Odbijeno';
      case 'completed':
        return 'Završeno';
      default:
        return status;
    }
  };

  const handleShowAssignedUsers = async (request: TransportRequest) => {
    if (request.assignedTo === 'All') return;

    try {
      setSelectedRequestForUsers(request);
      // Fetch user details for the assigned user IDs
      const userIds = request.assignedTo as string[];
      const userDetailsPromises = userIds.map(id => apiService.getUserById(id));
      const users = await Promise.all(userDetailsPromises);
      setAssignedUsers(users);
      setIsAssignedUsersModalOpen(true);
    } catch (error) {
      console.error('Error fetching assigned users:', error);
      alert('Greška pri učitavanju korisnika');
    }
  };

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
          <ContentTitle>Prijevoz</ContentTitle>
          {isAdmin && (
            <ButtonSection>
              <SmallButton onClick={() => setIsModalOpen(true)}>Novi zahtjev</SmallButton>
              <SmallButton onClick={() => setIsSpecificDriversModalOpen(true)}>
                Novi zahtjev za određene prijevoznike
              </SmallButton>
            </ButtonSection>
          )}
        </ContentHeader>
        <ContentText>
          Upravljajte zahtjevima za prijevoz.
        </ContentText>
        {uniqueRegistrations.length > 0 && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <strong>Unique Registrations ({uniqueRegistrations.length}):</strong>
            <div style={{ marginTop: '0.5rem' }}>
              {uniqueRegistrations.map((reg, index) => (
                <span key={index} style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.5rem',
                  margin: '0.25rem',
                  backgroundColor: '#e9ecef',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}>
                  {reg}
                </span>
              ))}
            </div>
          </div>
        )}
      </DashboardContainer>

      <RequestsContainer>
        <ContentTitle>Popis zahtjeva</ContentTitle>
        {isLoading ? (
          <EmptyState>Učitavanje...</EmptyState>
        ) : requests.length === 0 ? (
          <EmptyState>Nema zahtjeva za prikaz</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Datum</Th>
                <Th>Kamenolom</Th>
                <Th>Gradilište</Th>
                <Th>Broj kamiona</Th>
                <Th>Prijevoz na dan</Th>
                <Th>Isplata po t</Th>
                <Th>Prijevoznici</Th>
                <Th>Status</Th>
                {isAdmin && <Th>Akcije</Th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request._id}>
                  <Td>{new Date(request.createdAt).toLocaleDateString('hr-HR')}</Td>
                  <Td>{request.kamenolom}</Td>
                  <Td>{request.gradiliste}</Td>
                  <Td>{request.brojKamiona}</Td>
                  <Td>{request.prijevozNaDan}</Td>
                  <Td>{request.isplataPoT} €</Td>
                  <Td>
                    {request.assignedTo === 'All' ? (
                      'Svi'
                    ) : (
                      <ActionButton
                        onClick={() => handleShowAssignedUsers(request)}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Prikaži prijevoznike
                      </ActionButton>
                    )}
                  </Td>
                  <Td>
                    <StatusBadge status={request.status}>
                      {getStatusLabel(request.status)}
                    </StatusBadge>
                  </Td>
                  {isAdmin && (
                    <Td>
                      <ActionButtons>
                        <ActionButton onClick={() => handleEditClick(request)}>
                          Uredi
                        </ActionButton>
                        <DeleteButton onClick={() => handleDeleteClick(request)}>
                          Obriši
                        </DeleteButton>
                      </ActionButtons>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </RequestsContainer>

      <NoviZahtjevModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitZahtjev}
      />

      <NoviZahtjevZaPrijevoznike
        isOpen={isSpecificDriversModalOpen}
        onClose={() => setIsSpecificDriversModalOpen(false)}
        onSubmit={handleSubmitSpecificDriversZahtjev}
      />

      <EditZahtjevModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRequest(null);
        }}
        onSubmit={handleEditSubmit}
        request={editingRequest}
      />

      {isAssignedUsersModalOpen && (
        <ModalOverlay onClick={() => setIsAssignedUsersModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Dodijeljeni prijevoznici</ModalTitle>
            <UserList>
              {assignedUsers.map((user) => (
                <UserItem key={user._id}>
                  {user.firstName} {user.lastName}
                </UserItem>
              ))}
            </UserList>
            <ModalCloseButton onClick={() => setIsAssignedUsersModalOpen(false)}>
              Zatvori
            </ModalCloseButton>
          </ModalContent>
        </ModalOverlay>
      )}
    </S.PageContainer>
  );
};

export default PrijevozPage;
