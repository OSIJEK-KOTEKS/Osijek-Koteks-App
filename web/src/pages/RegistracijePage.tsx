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

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.main};
    transform: translateY(-2px);
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

const RegistracijePage: React.FC = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [registrations, setRegistrations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
              <RegistrationCard key={index}>
                <RegistrationText>{registration}</RegistrationText>
              </RegistrationCard>
            ))}
          </RegistrationGrid>
        )}
      </DashboardContainer>
    </S.PageContainer>
  );
};

export default RegistracijePage;
