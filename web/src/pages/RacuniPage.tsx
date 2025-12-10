import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import * as S from '../components/styled/Common';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';

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
    padding: 0.638rem 0.85rem !important;
    font-size: 0.935rem !important;
  }

  /* For buttons that specifically have the S.Button styling */
  & > ${S.Button}, & ${S.Button} {
    padding: 0.638rem 0.85rem !important;
    font-size: 0.935rem !important;
  }
`;

const DashboardContainer = styled.div`
  background: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.main};
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.large};
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.main};
`;

const RacuniPage: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

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
        <EmptyMessage>Ovdje će biti prikaz računa.</EmptyMessage>
      </DashboardContainer>
    </S.PageContainer>
  );
};

export default RacuniPage;
