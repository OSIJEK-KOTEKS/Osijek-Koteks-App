import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import * as S from '../components/styled/Common';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import NoviZahtjevModal from '../components/NoviZahtjevModal';

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

const ContentTitle = styled.h2`
  margin: 0 0 ${({ theme }) => theme.spacing.large} 0;
  color: ${({ theme }) => theme.colors.text};
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

const PrijevozPage: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleSubmitZahtjev = async (data: {
    kamenolom: string;
    gradiliste: string;
    brojKamiona: number;
    prijevozNaDan: string;
  }) => {
    console.log('Novi zahtjev:', data);
    // TODO: Send data to backend API
    // For now, just log it
    alert(`Zahtjev kreiran:\nKamenolom: ${data.kamenolom}\nGradilište: ${data.gradiliste}\nBroj kamiona: ${data.brojKamiona}\nDatum: ${data.prijevozNaDan}`);
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
        <ContentTitle>Prijevoz</ContentTitle>
        <ContentText>
          Upravljajte zahtjevima za prijevoz.
        </ContentText>
        <ButtonSection>
          <S.Button onClick={() => setIsModalOpen(true)}>Novi zahtjev</S.Button>
        </ButtonSection>
      </DashboardContainer>

      <NoviZahtjevModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitZahtjev}
      />
    </S.PageContainer>
  );
};

export default PrijevozPage;
