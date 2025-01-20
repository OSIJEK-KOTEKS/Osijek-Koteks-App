import React, {useState, useEffect, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {apiService, getImageUrl} from '../utils/api';
import {Item, ItemFilters} from '../types';
import styled from 'styled-components';
import * as S from '../components/styled/Common';
import ImageViewerModal from '../components/ImageViewerModal';
import LocationViewerModal from '../components/LocationViewerModal';
import Logo from '../components/Logo';
import DashboardFilters from '../components/DashboardFilters';
import CreateItemModal from '../components/CreateItemModal';

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
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({theme}) => theme.spacing.small};
  margin-top: ${({theme}) => theme.spacing.medium};
  flex-wrap: wrap;
`;

const PhotoButtonsGroup = styled.div`
  display: flex;
  gap: ${({theme}) => theme.spacing.small};
  width: 100%;
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

const LoadMoreButton = styled(S.Button)`
  margin: 20px auto;
  display: block;
`;

const Dashboard: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedLocation, setSelectedLocation] = useState<Item | null>(null);
  const [selectedCode, setSelectedCode] = useState('all');
  const [sortOrder, setSortOrder] = useState('date-desc');
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [isCreateModalVisible, setCreateModalVisible] =
    useState<boolean>(false);

  const {user, signOut} = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem('userToken');

  const fetchAvailableCodes = useCallback(async () => {
    try {
      const codes = await apiService.getUniqueCodes();
      setAvailableCodes(codes);
    } catch (error) {
      console.error('Error fetching codes:', error);
    }
  }, []);

  const fetchItems = useCallback(
    async (isLoadingMore: boolean = false) => {
      try {
        const currentPage = isLoadingMore ? page : 1;

        if (isLoadingMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const filters: ItemFilters = {
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
          ...(selectedCode !== 'all' && {code: selectedCode}),
          sortOrder,
        };

        const response = await apiService.getItems(currentPage, 10, filters);

        if (isLoadingMore) {
          setItems(prevItems => [...prevItems, ...response.items]);
        } else {
          setItems(response.items);
        }

        setHasMore(response.pagination.hasMore);
        setTotalItems(response.pagination.total);
        setPage(currentPage);
        setError('');
      } catch (err) {
        console.error('Error fetching items:', err);
        setError('Greška pri dohvaćanju dokumenata');
      } finally {
        if (isLoadingMore) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [page, selectedDate, selectedCode, sortOrder],
  );

  useEffect(() => {
    fetchItems();
    fetchAvailableCodes();
  }, []);

  useEffect(() => {
    if (page > 1) {
      fetchItems(true);
    }
  }, [page]);

  useEffect(() => {
    console.log('Filters changed, refetching items with:', {
      selectedDate,
      selectedCode,
      sortOrder,
    });
    fetchItems(false);
    setPage(1);
  }, [selectedDate, selectedCode, sortOrder]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) {
      return;
    }

    if (items.length >= totalItems) {
      setHasMore(false);
      return;
    }

    setPage(prevPage => prevPage + 1);
  }, [hasMore, loadingMore, loading, items.length, totalItems]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setError('Greška pri odjavi');
    }
  };

  const handleDelete = async (itemId: string) => {
    if (window.confirm('Jeste li sigurni da želite izbrisati ovaj dokument?')) {
      try {
        setLoading(true);
        await apiService.deleteItem(itemId);
        setItems(prevItems => prevItems.filter(item => item._id !== itemId));
      } catch (err) {
        console.error('Error deleting item:', err);
        setError('Greška pri brisanju dokumenta');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading && !loadingMore) {
    return (
      <S.PageContainer>
        <LoadingContainer>Učitavanje...</LoadingContainer>
      </S.PageContainer>
    );
  }

  // Replace just the return section in DashboardPage.tsx
  return (
    <S.PageContainer>
      <Header>
        <HeaderLeft>
          <Logo />
          <div>
            <h1>Dokumenti ({totalItems})</h1>
            <UserInfo>
              Dobrodošli, {user?.firstName} {user?.lastName}
              {user?.company && ` (${user.company})`}
            </UserInfo>
          </div>
        </HeaderLeft>
        <HeaderActions>
          {(user?.role === 'admin' || user?.role === 'bot') && (
            <S.Button
              onClick={() => setCreateModalVisible(true)}
              variant="primary"
              id="create_item">
              Dodaj dokument
            </S.Button>
          )}
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
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        selectedCode={selectedCode}
        onCodeChange={setSelectedCode}
        availableCodes={availableCodes}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      <ItemsGrid>
        {items.map(item => (
          <ItemCard key={item._id}>
            <ItemTitle>{item.title}</ItemTitle>
            {item.registracija && (
              <ItemDetails>
                <strong>Registracija:</strong> {item.registracija}
              </ItemDetails>
            )}
            <ItemDetails>
              <strong>RN:</strong> {item.code}
            </ItemDetails>
            <ItemDetails>
              <strong>Datum i vrijeme:</strong>{' '}
              {item.creationTime
                ? `${item.creationDate} ${item.creationTime}`
                : item.creationDate}
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
              <ActionButton onClick={() => window.open(item.pdfUrl, '_blank')}>
                Otvori PDF
              </ActionButton>

              {item.approvalStatus === 'odobreno' && (
                <PhotoButtonsGroup>
                  {item.approvalPhotoFront?.url && (
                    <ActionButton
                      onClick={() =>
                        setSelectedImage(
                          getImageUrl(item.approvalPhotoFront!.url!),
                        )
                      }>
                      Registracija
                    </ActionButton>
                  )}
                  {item.approvalPhotoBack?.url && (
                    <ActionButton
                      onClick={() =>
                        setSelectedImage(
                          getImageUrl(item.approvalPhotoBack!.url!),
                        )
                      }>
                      Materijal
                    </ActionButton>
                  )}
                </PhotoButtonsGroup>
              )}

              {item.approvalLocation?.coordinates?.latitude &&
                item.approvalLocation?.coordinates?.longitude && (
                  <ActionButton onClick={() => setSelectedLocation(item)}>
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

      {items.length === 0 && !loading && (
        <EmptyMessage>Nema dostupnih dokumenata</EmptyMessage>
      )}

      {hasMore && !loading && items.length > 0 && (
        <LoadMoreButton onClick={handleLoadMore} disabled={loadingMore}>
          {loadingMore ? 'Učitavanje...' : 'Učitaj još'}
        </LoadMoreButton>
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

      {(user?.role === 'admin' || user?.role === 'bot') && (
        <CreateItemModal
          isOpen={isCreateModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onSuccess={() => {
            setCreateModalVisible(false);
            fetchItems(false);
          }}
        />
      )}
    </S.PageContainer>
  );
};

export default Dashboard;
