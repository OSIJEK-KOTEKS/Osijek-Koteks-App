import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {apiService} from '../utils/api';
import {Item} from '../types';
import styled from 'styled-components';
import * as S from '../components/styled/Common';

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({theme}) => theme.spacing.large};
`;

const ItemsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({theme}) => theme.spacing.medium};
`;

const ItemCard = styled.div`
  background: ${({theme}) => theme.colors.white};
  padding: ${({theme}) => theme.spacing.medium};
  border-radius: ${({theme}) => theme.borderRadius};
  box-shadow: ${({theme}) => theme.shadows.main};
`;

const StatusBadge = styled.span<{status: Item['approvalStatus']}>`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.875rem;
  background-color: ${({status}) =>
    status === 'odobreno'
      ? '#e6f4ea'
      : status === 'odbijen'
      ? '#fce8e8'
      : '#fff3e0'};
  color: ${({status}) =>
    status === 'odobreno'
      ? '#34a853'
      : status === 'odbijen'
      ? '#ea4335'
      : '#fbbc04'};
  margin-top: 8px;
`;

const UserInfo = styled.div`
  margin-bottom: ${({theme}) => theme.spacing.medium};
`;

const ItemTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  color: ${({theme}) => theme.colors.text};
`;

const ItemDetails = styled.p`
  margin: 4px 0;
  color: ${({theme}) => theme.colors.text};
  font-size: 0.9rem;
`;

const DashboardPage = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const {user, signOut} = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const fetchedItems = await apiService.getItems();
      setItems(fetchedItems);
      setError('');
    } catch (err) {
      setError('Greška pri dohvaćanju dokumenata');
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setError('Greška pri odjavi');
    }
  };

  const handleOpenPdf = (pdfUrl: string) => {
    window.open(pdfUrl, '_blank');
  };

  if (loading) {
    return (
      <S.PageContainer>
        <div>Učitavanje...</div>
      </S.PageContainer>
    );
  }

  return (
    <S.PageContainer>
      <Header>
        <div>
          <h1>Dokumenti</h1>
          <UserInfo>
            Dobrodošli, {user?.firstName} {user?.lastName}
            {user?.company && ` (${user.company})`}
          </UserInfo>
        </div>
        <div>
          {user?.role === 'admin' && (
            <S.Button
              onClick={() => navigate('/users')}
              style={{marginRight: '1rem'}}>
              Korisnici
            </S.Button>
          )}
          <S.Button variant="secondary" onClick={handleLogout}>
            Odjava
          </S.Button>
        </div>
      </Header>

      {error && <S.ErrorMessage>{error}</S.ErrorMessage>}

      <ItemsGrid>
        {items.map(item => (
          <ItemCard key={item._id}>
            <ItemTitle>{item.title}</ItemTitle>
            <ItemDetails>
              <strong>RN:</strong> {item.code}
            </ItemDetails>
            <ItemDetails>
              <strong>Datum:</strong> {item.creationDate}
            </ItemDetails>
            <StatusBadge status={item.approvalStatus}>
              {item.approvalStatus}
            </StatusBadge>
            {item.approvedBy && (
              <ItemDetails>
                <strong>Odobrio:</strong> {item.approvedBy.firstName}{' '}
                {item.approvedBy.lastName}
              </ItemDetails>
            )}
            {item.approvalDate && (
              <ItemDetails>
                <strong>Datum odobrenja:</strong> {item.approvalDate}
              </ItemDetails>
            )}
            <S.Button
              onClick={() => handleOpenPdf(item.pdfUrl)}
              style={{marginTop: '1rem'}}>
              Otvori PDF
            </S.Button>
          </ItemCard>
        ))}
      </ItemsGrid>

      {items.length === 0 && !loading && (
        <div style={{textAlign: 'center', marginTop: '2rem'}}>
          Nema dostupnih dokumenata
        </div>
      )}
    </S.PageContainer>
  );
};

export default DashboardPage;
