import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import * as S from '../components/styled/Common';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import NoviZahtjevModal from '../components/NoviZahtjevModal';
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
  background-color: ${({ status, theme }) => {
    switch (status) {
      case 'approved':
        return '#d4edda';
      case 'rejected':
        return '#f8d7da';
      case 'completed':
        return '#d1ecf1';
      default:
        return '#fff3cd';
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
      default:
        return '#856404';
    }
  }};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${({ theme }) => theme.colors.gray};
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
}

const PrijevozPage: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      setRequests(data);
    } catch (error) {
      console.error('Error fetching transport requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmitZahtjev = async (data: {
    kamenolom: string;
    gradiliste: string;
    brojKamiona: number;
    prijevozNaDan: string;
    isplataPoT: number;
  }) => {
    try {
      console.log('Submitting transport request:', data);
      const response = await apiService.createTransportRequest(data);
      console.log('Transport request created:', response);
      alert(`Zahtjev uspješno kreiran!\nKamenolom: ${data.kamenolom}\nGradilište: ${data.gradiliste}\nBroj kamiona: ${data.brojKamiona}\nDatum: ${data.prijevozNaDan}`);
      // Refresh the list after creating a new request
      await fetchRequests();
    } catch (error) {
      console.error('Error creating transport request:', error);
      alert('Greška pri kreiranju zahtjeva. Molimo pokušajte ponovno.');
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
          <SmallButton onClick={() => setIsModalOpen(true)}>Novi zahtjev</SmallButton>
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
                <Th>Status</Th>
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
                  <Td>{request.isplataPoT}</Td>
                  <Td>
                    <StatusBadge status={request.status}>
                      {getStatusLabel(request.status)}
                    </StatusBadge>
                  </Td>
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
    </S.PageContainer>
  );
};

export default PrijevozPage;
