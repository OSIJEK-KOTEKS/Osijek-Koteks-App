import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {apiService, getImageUrl} from '../utils/api';
import {Item} from '../types';
import styled from 'styled-components';
import * as S from '../components/styled/Common';
import ImageViewerModal from '../components/ImageViewerModal';
import LocationViewerModal from '../components/LocationViewerModal';
import Logo from '../components/Logo';
import DashboardFilters from '../components/DashboardFilters';

// Styled Components
const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({theme}) => theme.spacing.large};
  width: 100%;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({theme}) => theme.spacing.medium};
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
  transition: transform 0.2s ease-in-out;

  &:hover {
    transform: translateY(-2px);
  }
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
  color: ${({theme}) => theme.colors.text};
  font-size: 0.9rem;
`;

const ItemTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  color: ${({theme}) => theme.colors.text};
  font-weight: 600;
`;

const ItemDetails = styled.p`
  margin: 4px 0;
  color: ${({theme}) => theme.colors.text};
  font-size: 0.9rem;

  strong {
    font-weight: 600;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({theme}) => theme.spacing.small};
  margin-top: ${({theme}) => theme.spacing.medium};
  flex-wrap: wrap;
`;

const ActionButton = styled(S.Button)`
  flex: 1;
  min-width: auto;
  padding: 8px 16px;
  font-size: 0.9rem;
`;

const DeleteButton = styled(ActionButton)`
  background-color: ${({theme}) => theme.colors.error};

  &:hover {
    background-color: ${({theme}) => theme.colors.error};
    opacity: 0.9;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: ${({theme}) => theme.colors.primary};
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: ${({theme}) => theme.spacing.large};
  color: ${({theme}) => theme.colors.text};
  background: ${({theme}) => theme.colors.white};
  border-radius: ${({theme}) => theme.borderRadius};
  box-shadow: ${({theme}) => theme.shadows.main};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${({theme}) => theme.spacing.medium};
`;

const Dashboard: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Item | null>(null);
  const [selectedRange, setSelectedRange] = useState('7days');
  const [selectedCode, setSelectedCode] = useState('all');
  const [sortOrder, setSortOrder] = useState('date-desc');
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);

  const {user, signOut} = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem('userToken');

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      // Extract unique codes from items
      const codes = Array.from(new Set(items.map(item => item.code))).sort();
      setAvailableCodes(codes);
    }
  }, [items]);

  const getFilteredItems = (
    items: Item[],
    selectedCode: string,
    dateRange: string,
    sortOrder: string,
  ) => {
    let filtered = [...items];

    // Date range filter
    if (dateRange !== 'all') {
      const today = new Date();
      const daysToSubtract = dateRange === '7days' ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(today.getDate() - daysToSubtract);

      filtered = filtered.filter(item => {
        const [day, month, year] = item.creationDate.split('.');
        const itemDate = new Date(Number(year), Number(month) - 1, Number(day));
        return itemDate >= startDate;
      });
    }

    // Code filter
    if (selectedCode !== 'all') {
      filtered = filtered.filter(item => item.code === selectedCode);
    }

    // Sorting
    filtered.sort((a, b) => {
      // First handle approval status sorting
      if (sortOrder === 'approved-first') {
        if (a.approvalStatus === 'odobreno' && b.approvalStatus !== 'odobreno')
          return -1;
        if (a.approvalStatus !== 'odobreno' && b.approvalStatus === 'odobreno')
          return 1;
      } else if (sortOrder === 'pending-first') {
        if (
          a.approvalStatus === 'na čekanju' &&
          b.approvalStatus !== 'na čekanju'
        )
          return -1;
        if (
          a.approvalStatus !== 'na čekanju' &&
          b.approvalStatus === 'na čekanju'
        )
          return 1;
      }

      // If approval status is the same or not sorting by approval, sort by date
      const [dayA, monthA, yearA] = a.creationDate.split('.');
      const [dayB, monthB, yearB] = b.creationDate.split('.');

      const dateA = new Date(Number(yearA), Number(monthA) - 1, Number(dayA));
      const dateB = new Date(Number(yearB), Number(monthB) - 1, Number(dayB));

      // For approval status sorting, use date as secondary sort
      if (sortOrder === 'approved-first' || sortOrder === 'pending-first') {
        return dateB.getTime() - dateA.getTime(); // Newer first as secondary sort
      }

      // For date-based sorting
      return sortOrder === 'date-desc'
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });

    return filtered;
  };

  useEffect(() => {
    const filtered = getFilteredItems(
      items,
      selectedCode,
      selectedRange,
      sortOrder,
    );
    setFilteredItems(filtered);
  }, [items, selectedCode, selectedRange, sortOrder]);

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

  const handleDelete = async (itemId: string) => {
    if (window.confirm('Jeste li sigurni da želite izbrisati ovaj dokument?')) {
      try {
        setLoading(true);
        await apiService.deleteItem(itemId);
        setItems(prevItems => prevItems.filter(item => item._id !== itemId));
        setError('');
      } catch (err) {
        console.error('Error deleting item:', err);
        setError('Greška pri brisanju dokumenta');
      } finally {
        setLoading(false);
      }
    }
  };

  const showLocationModal = (item: Item) => {
    setSelectedLocation(item);
  };

  if (loading) {
    return (
      <S.PageContainer>
        <LoadingContainer>Učitavanje...</LoadingContainer>
      </S.PageContainer>
    );
  }

  return (
    <S.PageContainer>
      <Header>
        <HeaderLeft>
          <Logo />
          <div>
            <h1>Dokumenti</h1>
            <UserInfo>
              Dobrodošli, {user?.firstName} {user?.lastName}
              {user?.company && ` (${user.company})`}
            </UserInfo>
          </div>
        </HeaderLeft>
        <HeaderActions>
          {user?.role === 'admin' && (
            <S.Button onClick={() => navigate('/users')}>Korisnici</S.Button>
          )}
          <S.Button variant="secondary" onClick={handleLogout}>
            Odjava
          </S.Button>
        </HeaderActions>
      </Header>

      {error && <S.ErrorMessage>{error}</S.ErrorMessage>}

      <DashboardFilters
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        selectedCode={selectedCode}
        onCodeChange={setSelectedCode}
        availableCodes={availableCodes}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      <ItemsGrid>
        {filteredItems.map(item => (
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
            <ButtonGroup>
              <ActionButton onClick={() => handleOpenPdf(item.pdfUrl)}>
                Otvori PDF
              </ActionButton>

              {item.approvalPhoto?.url && (
                <ActionButton
                  onClick={() =>
                    setSelectedImage(getImageUrl(item.approvalPhoto!.url!))
                  }>
                  Pogledaj Sliku
                </ActionButton>
              )}

              {item.approvalLocation && (
                <ActionButton onClick={() => showLocationModal(item)}>
                  Lokacija
                </ActionButton>
              )}

              {user?.role === 'admin' && (
                <DeleteButton onClick={() => handleDelete(item._id)}>
                  Izbriši
                </DeleteButton>
              )}
            </ButtonGroup>
          </ItemCard>
        ))}
      </ItemsGrid>

      {filteredItems.length === 0 && !loading && (
        <EmptyMessage>Nema dostupnih dokumenata</EmptyMessage>
      )}

      {selectedImage && token && (
        <ImageViewerModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
          token={token}
        />
      )}

      {selectedLocation?.approvalLocation && (
        <LocationViewerModal
          location={selectedLocation.approvalLocation}
          onClose={() => setSelectedLocation(null)}
          approvalDate={selectedLocation.approvalDate}
        />
      )}
    </S.PageContainer>
  );
};

export default Dashboard;
