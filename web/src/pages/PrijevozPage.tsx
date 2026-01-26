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
import { getCodeDescription } from '../utils/codeMapping';

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

const RegistrationCheckbox = styled.div`
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.colors.gray};
  }

  input {
    margin-right: 0.75rem;
    cursor: pointer;
  }

  label {
    cursor: pointer;
    flex: 1;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const ModalButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  font-size: 1rem;
  flex: 1;
  background: ${({ variant, theme }) =>
    variant === 'primary' ? theme.colors.primary : '#6c757d'};
  color: white;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RequestInfo = styled.div`
  background-color: ${({ theme }) => theme.colors.background};
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const InfoValue = styled.span`
  color: ${({ theme }) => theme.colors.text};
`;

const RegistrationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 1rem;
`;

const SelectionSummary = styled.div`
  text-align: center;
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.colors.primary}20;
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
  margin-bottom: 1rem;
`;

const AcceptancesSection = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.main};
`;

const AcceptancesTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.5rem;
`;

const AcceptanceCard = styled.div`
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.gray};
`;

const AcceptanceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
`;

const AcceptanceInfo = styled.div`
  flex: 1;
`;

const AcceptanceUser = styled.div`
  font-weight: 600;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 0.5rem;
`;

const AcceptanceDetail = styled.div`
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
`;

const AcceptanceActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ApproveButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    background-color: #218838;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DeclineButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    background-color: #c82333;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RegistrationTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const RegistrationTag = styled.span`
  padding: 0.25rem 0.5rem;
  background-color: ${({ theme }) => theme.colors.gray};
  border-radius: 4px;
  font-size: 0.85rem;
`;

const EmptyAcceptances = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${({ theme }) => theme.colors.gray};
  font-style: italic;
`;

const ExpandedRow = styled.tr`
  background-color: ${({ theme }) => theme.colors.background};
`;

const ExpandedCell = styled.td`
  padding: 1.5rem !important;
  border-bottom: 2px solid ${({ theme }) => theme.colors.gray};
`;

const AcceptancesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const AcceptanceItem = styled.div`
  background-color: white;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 8px;
  padding: 1rem;
`;

const AcceptanceItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const AcceptanceItemUser = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const AcceptanceItemStatus = styled.span<{ status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: ${({ status }) => {
    switch (status) {
      case 'approved':
        return '#d4edda';
      case 'declined':
        return '#f8d7da';
      case 'pending':
        return '#fff3cd';
      default:
        return '#e9ecef';
    }
  }};
  color: ${({ status }) => {
    switch (status) {
      case 'approved':
        return '#155724';
      case 'declined':
        return '#721c24';
      case 'pending':
        return '#856404';
      default:
        return '#495057';
    }
  }};
`;

const AcceptanceItemDetail = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text};
  margin: 0.25rem 0;
`;

const ClickableRow = styled.tr`
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.colors.background};
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
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<TransportRequest | null>(null);
  const [selectedRequestForUsers, setSelectedRequestForUsers] = useState<TransportRequest | null>(null);
  const [acceptingRequest, setAcceptingRequest] = useState<TransportRequest | null>(null);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assignedUsers, setAssignedUsers] = useState<Array<{ _id: string; firstName: string; lastName: string }>>([]);
  const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>([]);
  const [pendingAcceptances, setPendingAcceptances] = useState<any[]>([]);
  const [isLoadingAcceptances, setIsLoadingAcceptances] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [requestAcceptances, setRequestAcceptances] = useState<any[]>([]);
  const [isLoadingRequestAcceptances, setIsLoadingRequestAcceptances] = useState(false);

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
      if (isAdmin) {
        fetchPendingAcceptances();
      }
    }
  }, [user, isAdmin]);

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

  // Extract first part of registration (same logic as RegistracijePage)
  const getFirstPartOfRegistration = (registration: string): string => {
    // Pattern 1: With spaces - "PŽ 995 FD", "SB 004 NP", "NA 224 O"
    const withSpaces = registration.match(/^([A-ZŠĐČĆŽ]+\s+\d+\s+[A-ZŠĐČĆŽ]{1,4})(?!\d)/i);
    if (withSpaces) return withSpaces[1];

    // Pattern 2: Without spaces - "NG341CP", "AB123CD"
    const withoutSpaces = registration.match(/^([A-ZŠĐČĆŽ]+\d+[A-ZŠĐČĆŽ]{1,4})(?!\d)/i);
    if (withoutSpaces) return withoutSpaces[1];

    // Fallback: return original if no pattern matches
    return registration;
  };

  // Get unique first parts of user's registrations
  const getUserUniqueRegistrations = (): string[] => {
    if (!user?.assignedRegistrations) return [];

    const firstParts = user.assignedRegistrations.map(reg => getFirstPartOfRegistration(reg));
    return Array.from(new Set(firstParts)).sort();
  };

  // Get all full registrations that match a first part
  const getFullRegistrationsForFirstPart = (firstPart: string): string[] => {
    if (!user?.assignedRegistrations) return [];

    return user.assignedRegistrations.filter(fullReg => {
      const fp = getFirstPartOfRegistration(fullReg);
      return fp === firstPart;
    });
  };

  const handleAcceptClick = (request: TransportRequest) => {
    setAcceptingRequest(request);
    setSelectedRegistrations([]);
    setIsAcceptModalOpen(true);
  };

  const handleRegistrationToggle = (firstPartRegistration: string) => {
    setSelectedRegistrations(prev => {
      // Get all full registrations that match this first part
      const fullRegs = getFullRegistrationsForFirstPart(firstPartRegistration);

      // Check if any of the full registrations are already selected
      const isSelected = fullRegs.some(reg => prev.includes(reg));

      if (isSelected) {
        // Remove all full registrations that match this first part
        return prev.filter(r => !fullRegs.includes(r));
      } else {
        // Count how many unique first parts are currently selected
        const currentUniqueCount = getUserUniqueRegistrations().filter(fp => {
          const regs = getFullRegistrationsForFirstPart(fp);
          return regs.some(reg => prev.includes(reg));
        }).length;

        // Check if we have room (each unique first part = 1 truck)
        if (acceptingRequest && currentUniqueCount < acceptingRequest.brojKamiona) {
          // Add ALL full registrations that match this first part
          return [...prev, ...fullRegs];
        }

        return prev;
      }
    });
  };

  const handleAcceptSubmit = async () => {
    if (!acceptingRequest || selectedRegistrations.length === 0) return;

    try {
      await apiService.acceptTransportRequest(acceptingRequest._id, selectedRegistrations);

      // Extract unique first parts for display
      const firstParts = selectedRegistrations.map(reg => getFirstPartOfRegistration(reg));
      const uniqueFirstParts = Array.from(new Set(firstParts));

      alert(
        `✅ Zahtjev uspješno poslan!\n\n` +
        `Detalji zahtjeva:\n` +
        `• Kamenolom: ${acceptingRequest.kamenolom}\n` +
        `• Gradilište: ${acceptingRequest.gradiliste}\n` +
        `• Datum prijevoza: ${acceptingRequest.prijevozNaDan}\n` +
        `• Isplata po t: ${acceptingRequest.isplataPoT}€\n\n` +
        `Odabrane registracije:\n${uniqueFirstParts.join(', ')}\n\n` +
        `Status: Čeka se odobrenje administratora.`
      );

      setIsAcceptModalOpen(false);
      setAcceptingRequest(null);
      setSelectedRegistrations([]);
      await fetchRequests();
    } catch (error: any) {
      console.error('Error accepting request:', error);

      // Check if it's a duplicate registration error
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already used')) {
        const overlapping = error.response?.data?.overlappingRegistrations || [];

        alert(
          `❌ Ne možete prihvatiti ovaj zahtjev\n\n` +
          `Razlog: Već ste koristili neke od ovih registracija za ovaj zahtjev.\n\n` +
          `Registracije koje su već korištene:\n${overlapping.join(', ')}\n\n` +
          `Napomena: Možete prihvatiti ovaj zahtjev samo s registracijama koje niste već koristili.`
        );
      } else {
        alert('Greška pri prihvaćanju zahtjeva. Molimo pokušajte ponovno.');
      }
    }
  };

  const fetchPendingAcceptances = async () => {
    try {
      setIsLoadingAcceptances(true);
      const acceptances = await apiService.getPendingAcceptances();
      setPendingAcceptances(acceptances);
    } catch (error) {
      console.error('Error fetching pending acceptances:', error);
    } finally {
      setIsLoadingAcceptances(false);
    }
  };

  const handleApproveAcceptance = async (acceptanceId: string) => {
    try {
      await apiService.reviewAcceptance(acceptanceId, 'approved');
      alert('Zahtjev odobren!');
      await fetchPendingAcceptances();
      await fetchRequests();
    } catch (error) {
      console.error('Error approving acceptance:', error);
      alert('Greška pri odobravanju zahtjeva.');
    }
  };

  const handleDeclineAcceptance = async (acceptanceId: string) => {
    try {
      await apiService.reviewAcceptance(acceptanceId, 'declined');
      alert('Zahtjev odbijen!');
      await fetchPendingAcceptances();
    } catch (error) {
      console.error('Error declining acceptance:', error);
      alert('Greška pri odbijanju zahtjeva.');
    }
  };

  const handleRequestClick = async (requestId: string) => {
    if (expandedRequestId === requestId) {
      // Collapse if already expanded
      setExpandedRequestId(null);
      setRequestAcceptances([]);
    } else {
      // Expand and fetch acceptances for this request
      setExpandedRequestId(requestId);
      setIsLoadingRequestAcceptances(true);
      try {
        const acceptances = await apiService.getAcceptancesForRequest(requestId);
        setRequestAcceptances(acceptances);
      } catch (error) {
        console.error('Error fetching acceptances for request:', error);
        setRequestAcceptances([]);
      } finally {
        setIsLoadingRequestAcceptances(false);
      }
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
                <Th>Akcije</Th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <React.Fragment key={request._id}>
                  {isAdmin ? (
                    <ClickableRow onClick={() => handleRequestClick(request._id)}>
                      <Td>{new Date(request.createdAt).toLocaleDateString('hr-HR')}</Td>
                      <Td>{request.kamenolom}</Td>
                      <Td>{getCodeDescription(request.gradiliste)}</Td>
                      <Td>{request.brojKamiona}</Td>
                      <Td>{request.prijevozNaDan}</Td>
                      <Td>{request.isplataPoT} €</Td>
                      <Td>
                        {request.assignedTo === 'All' ? (
                          'Svi'
                        ) : (
                          <ActionButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowAssignedUsers(request);
                            }}
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
                      <Td>
                        <ActionButtons>
                          <ActionButton onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(request);
                          }}>
                            Uredi
                          </ActionButton>
                          <DeleteButton onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(request);
                          }}>
                            Obriši
                          </DeleteButton>
                        </ActionButtons>
                      </Td>
                    </ClickableRow>
                  ) : (
                    <tr>
                      <Td>{new Date(request.createdAt).toLocaleDateString('hr-HR')}</Td>
                      <Td>{request.kamenolom}</Td>
                      <Td>{getCodeDescription(request.gradiliste)}</Td>
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
                      <Td>
                        <ActionButton onClick={() => handleAcceptClick(request)}>
                          Prihvati
                        </ActionButton>
                      </Td>
                    </tr>
                  )}
                  {isAdmin && expandedRequestId === request._id && (
                    <ExpandedRow>
                      <ExpandedCell colSpan={9}>
                        {isLoadingRequestAcceptances ? (
                          <div style={{ textAlign: 'center', padding: '1rem', color: '#999' }}>
                            Učitavanje prihvaćanja...
                          </div>
                        ) : requestAcceptances.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '1rem', color: '#999', fontStyle: 'italic' }}>
                            Nema prihvaćanja za ovaj zahtjev
                          </div>
                        ) : (
                          <AcceptancesList>
                            <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>Prihvaćanja za ovaj zahtjev:</h4>
                            {requestAcceptances.map((acceptance) => {
                              const firstParts: string[] = acceptance.registrations.map((reg: string) => getFirstPartOfRegistration(reg));
                              const uniqueFirstParts: string[] = Array.from(new Set(firstParts));

                              return (
                                <AcceptanceItem key={acceptance._id}>
                                  <AcceptanceItemHeader>
                                    <AcceptanceItemUser>
                                      {acceptance.userId?.firstName} {acceptance.userId?.lastName}
                                    </AcceptanceItemUser>
                                    <AcceptanceItemStatus status={acceptance.status}>
                                      {acceptance.status === 'approved' ? 'Prihvaćeno' : acceptance.status === 'declined' ? 'Odbijeno' : 'Na čekanju'}
                                    </AcceptanceItemStatus>
                                  </AcceptanceItemHeader>
                                  <AcceptanceItemDetail>
                                    Email: {acceptance.userId?.email}
                                  </AcceptanceItemDetail>
                                  <AcceptanceItemDetail>
                                    Firma: {acceptance.userId?.company}
                                  </AcceptanceItemDetail>
                                  <AcceptanceItemDetail>
                                    Broj kamiona: {acceptance.acceptedCount}
                                  </AcceptanceItemDetail>
                                  <AcceptanceItemDetail>
                                    Datum prihvaćanja: {new Date(acceptance.createdAt).toLocaleDateString('hr-HR')}
                                  </AcceptanceItemDetail>
                                  {acceptance.reviewedAt && (
                                    <AcceptanceItemDetail>
                                      Pregledano: {new Date(acceptance.reviewedAt).toLocaleDateString('hr-HR')}
                                    </AcceptanceItemDetail>
                                  )}
                                  <RegistrationTags style={{ marginTop: '0.5rem' }}>
                                    {uniqueFirstParts.map((firstPart: string, idx: number) => (
                                      <RegistrationTag key={idx}>{firstPart}</RegistrationTag>
                                    ))}
                                  </RegistrationTags>
                                </AcceptanceItem>
                              );
                            })}
                          </AcceptancesList>
                        )}
                      </ExpandedCell>
                    </ExpandedRow>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </Table>
        )}
      </RequestsContainer>

      {/* Admin section for pending acceptances */}
      {isAdmin && (
        <AcceptancesSection>
          <AcceptancesTitle>Zahtjevi korisnika za prihvaćanje</AcceptancesTitle>
          {isLoadingAcceptances ? (
            <EmptyAcceptances>Učitavanje...</EmptyAcceptances>
          ) : pendingAcceptances.length === 0 ? (
            <EmptyAcceptances>Nema zahtjeva na čekanju</EmptyAcceptances>
          ) : (
            pendingAcceptances.map((acceptance) => {
              // Extract unique first parts from all registrations
              const firstParts: string[] = acceptance.registrations.map((reg: string) => getFirstPartOfRegistration(reg));
              const uniqueFirstParts: string[] = Array.from(new Set(firstParts));

              return (
                <AcceptanceCard key={acceptance._id}>
                  <AcceptanceHeader>
                    <AcceptanceInfo>
                      <AcceptanceUser>
                        {acceptance.userId?.firstName} {acceptance.userId?.lastName}
                      </AcceptanceUser>
                      <AcceptanceDetail>
                        Email: {acceptance.userId?.email}
                      </AcceptanceDetail>
                      <AcceptanceDetail>
                        Firma: {acceptance.userId?.company}
                      </AcceptanceDetail>
                      <AcceptanceDetail>
                        Kamenolom: {acceptance.requestId?.kamenolom}
                      </AcceptanceDetail>
                      <AcceptanceDetail>
                        Gradilište: {getCodeDescription(acceptance.requestId?.gradiliste)}
                      </AcceptanceDetail>
                      <AcceptanceDetail>
                        Broj kamiona: {acceptance.acceptedCount}
                      </AcceptanceDetail>
                      <AcceptanceDetail>
                        Isplata po t: {acceptance.requestId?.isplataPoT}€
                      </AcceptanceDetail>
                      <AcceptanceDetail>
                        Datum zahtjeva: {new Date(acceptance.createdAt).toLocaleDateString('hr-HR')}
                      </AcceptanceDetail>
                      <RegistrationTags>
                        {uniqueFirstParts.map((firstPart: string, idx: number) => (
                          <RegistrationTag key={idx}>{firstPart}</RegistrationTag>
                        ))}
                      </RegistrationTags>
                    </AcceptanceInfo>
                    <AcceptanceActions>
                      <ApproveButton onClick={() => handleApproveAcceptance(acceptance._id)}>
                        Prihvaćeno
                      </ApproveButton>
                      <DeclineButton onClick={() => handleDeclineAcceptance(acceptance._id)}>
                        Odbij
                      </DeclineButton>
                    </AcceptanceActions>
                  </AcceptanceHeader>
                </AcceptanceCard>
              );
            })
          )}
        </AcceptancesSection>
      )}

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

      {isAcceptModalOpen && acceptingRequest && (
        <ModalOverlay onClick={() => setIsAcceptModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>Prihvati zahtjev za prijevoz</ModalTitle>

            <RequestInfo>
              <InfoRow>
                <InfoLabel>Kamenolom:</InfoLabel>
                <InfoValue>{acceptingRequest.kamenolom}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Gradilište:</InfoLabel>
                <InfoValue>{getCodeDescription(acceptingRequest.gradiliste)}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Broj kamiona:</InfoLabel>
                <InfoValue>{acceptingRequest.brojKamiona}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Datum prijevoza:</InfoLabel>
                <InfoValue>{acceptingRequest.prijevozNaDan}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Isplata po t:</InfoLabel>
                <InfoValue>{acceptingRequest.isplataPoT} €</InfoValue>
              </InfoRow>
            </RequestInfo>

            <SelectionSummary>
              Odabrano{' '}
              {
                getUserUniqueRegistrations().filter(fp => {
                  const regs = getFullRegistrationsForFirstPart(fp);
                  return regs.some(reg => selectedRegistrations.includes(reg));
                }).length
              }{' '}
              od {acceptingRequest.brojKamiona} kamiona
            </SelectionSummary>

            <div style={{ marginBottom: '1rem', fontWeight: 500 }}>
              Odaberite registracije (max {acceptingRequest.brojKamiona}):
            </div>

            {user?.assignedRegistrations && user.assignedRegistrations.length > 0 ? (
              <RegistrationsList>
                {getUserUniqueRegistrations().map((firstPart) => {
                  const fullRegs = getFullRegistrationsForFirstPart(firstPart);
                  const isChecked = fullRegs.some(reg => selectedRegistrations.includes(reg));

                  // Count how many unique first parts are currently selected
                  const currentUniqueCount = getUserUniqueRegistrations().filter(fp => {
                    const regs = getFullRegistrationsForFirstPart(fp);
                    return regs.some(reg => selectedRegistrations.includes(reg));
                  }).length;

                  const canSelect = currentUniqueCount < acceptingRequest.brojKamiona;

                  return (
                    <RegistrationCheckbox key={firstPart}>
                      <input
                        type="checkbox"
                        id={`reg-${firstPart}`}
                        checked={isChecked}
                        onChange={() => handleRegistrationToggle(firstPart)}
                        disabled={!isChecked && !canSelect}
                      />
                      <label htmlFor={`reg-${firstPart}`}>
                        {firstPart}
                      </label>
                    </RegistrationCheckbox>
                  );
                })}
              </RegistrationsList>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                Nemate dodijeljene registracije. Kontaktirajte administratora.
              </div>
            )}

            <ModalActions>
              <ModalButton variant="secondary" onClick={() => setIsAcceptModalOpen(false)}>
                Odustani
              </ModalButton>
              <ModalButton
                variant="primary"
                onClick={handleAcceptSubmit}
                disabled={selectedRegistrations.length === 0}
              >
                Prihvati (
                {
                  getUserUniqueRegistrations().filter(fp => {
                    const regs = getFullRegistrationsForFirstPart(fp);
                    return regs.some(reg => selectedRegistrations.includes(reg));
                  }).length
                }
                )
              </ModalButton>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}
    </S.PageContainer>
  );
};

export default PrijevozPage;
