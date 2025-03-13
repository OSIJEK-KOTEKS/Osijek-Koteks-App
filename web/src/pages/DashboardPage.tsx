import React, {useState, useEffect, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {apiService, getImageUrl} from '../utils/api';
import {Item, ItemFilters} from '../types';
import styled from 'styled-components';
import * as S from '../components/styled/Common';
import ImageViewerModal from '../components/ImageViewerModal';
import LocationViewerModal from '../components/LocationViewerModal';
import PrintButton from 'src/components/PrintButton';
import Logo from '../components/Logo';
import DashboardFilters from '../components/DashboardFilters';
import CreateItemModal from '../components/CreateItemModal';
import PrintAllButton from '../components/PrintAllButton';
import PrintTableButton from 'src/components/PrintTableButton';
import ApproveButton from '../components/ApproveButton';
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

// Add this right after the StatusBadge component:
const TransitBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.875rem;
  background-color: #e3f2fd;
  color: #1565c0;
  margin-top: 8px;
  margin-left: 10px;
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
  const [inTransitOnly, setInTransitOnly] = useState(false);
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
  const [searchMode, setSearchMode] = useState(false);
  const [searchValue, setSearchValue] = useState('');
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

        let filters: ItemFilters;

        if (searchMode && searchValue) {
          filters = {
            searchTitle: searchValue,
          };
          console.log('Using search filters:', filters);
        } else {
          const startOfDay = new Date(selectedDate);
          startOfDay.setHours(0, 0, 0, 0);

          const endOfDay = new Date(selectedDate);
          endOfDay.setHours(23, 59, 59, 999);

          filters = {
            startDate: startOfDay.toISOString(),
            endDate: endOfDay.toISOString(),
            ...(selectedCode !== 'all' && {code: selectedCode}),
            sortOrder,
            ...(inTransitOnly && {inTransitOnly: true}), // Add this line
          };
          console.log('Using regular filters:', filters);
        }

        console.log('Making request with filters:', filters);

        const response = await apiService.getItems(currentPage, 10, filters);
        console.log('API Response:', response);

        if (isLoadingMore) {
          setItems(prevItems => [...prevItems, ...response.items]);
        } else {
          setItems(response.items);
        }

        setHasMore(response.pagination.hasMore);
        setTotalItems(response.pagination.total);
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
    [
      page,
      selectedDate,
      selectedCode,
      sortOrder,
      searchMode,
      searchValue,
      inTransitOnly,
    ], // Add inTransitOnly to dependencies
  );

  const fetchAllItemsForPrinting = async () => {
    try {
      setLoading(true);
      let allItems: Item[] = [];
      let currentPage = 1;
      let hasMoreItems = true;

      let filters: ItemFilters;
      if (searchMode && searchValue) {
        filters = {
          searchTitle: searchValue,
        };
      } else {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        filters = {
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
          ...(selectedCode !== 'all' && {code: selectedCode}),
          sortOrder,
          ...(inTransitOnly && {inTransitOnly: true}), // Add this line
        };
      }

      // Fetch all pages
      while (hasMoreItems) {
        const response = await apiService.getItems(currentPage, 100, filters);
        allItems = [...allItems, ...response.items];
        hasMoreItems = response.pagination.hasMore;
        currentPage++;
      }

      return allItems;
    } catch (error) {
      console.error('Error fetching all items:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(() => {
    if (searchValue.trim()) {
      console.log('Search triggered with:', searchValue);
      // First set all the states
      setLoading(true);
      setSearchMode(true);
      setPage(1);

      // Wait for state updates to complete before fetching
      Promise.resolve().then(() => {
        const searchFilters: ItemFilters = {
          searchTitle: searchValue,
        };
        console.log('Fetching with search filters:', searchFilters);

        // Pass explicit search filters
        apiService
          .getItems(1, 10, searchFilters)
          .then(response => {
            setItems(response.items);
            setHasMore(response.pagination.hasMore);
            setTotalItems(response.pagination.total);
            setError('');
          })
          .catch(err => {
            console.error('Error fetching items:', err);
            setError('Greška pri dohvaćanju dokumenata');
          })
          .finally(() => {
            setLoading(false);
          });
      });
    }
  }, [searchValue]);
  const clearSearch = useCallback(() => {
    console.log('Clearing search');
    setLoading(true);

    // Reset all filters to initial values
    setSearchMode(false);
    setSearchValue('');
    setPage(1);
    setSelectedDate(new Date()); // Reset date to today
    setSelectedCode('all'); // Reset code filter to 'all'
    setSortOrder('date-desc'); // Reset sort to default
    setInTransitOnly(false); // Reset inTransitOnly filter

    // Wait for state updates to complete
    Promise.resolve().then(() => {
      // Fetch items with initial filters
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const initialFilters: ItemFilters = {
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        sortOrder: 'date-desc',
      };

      apiService
        .getItems(1, 10, initialFilters)
        .then(response => {
          setItems(response.items);
          setHasMore(response.pagination.hasMore);
          setTotalItems(response.pagination.total);
          setError('');
        })
        .catch(err => {
          console.error('Error fetching items:', err);
          setError('Greška pri dohvaćanju dokumenata');
        })
        .finally(() => {
          setLoading(false);
        });
    });
  }, []);
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setPage(1);
    setItems([]);
    setHasMore(true);
  };
  useEffect(() => {
    if (!searchMode) {
      setPage(1); // Reset page when filters change
      setItems([]); // Clear existing items
      setHasMore(true); // Reset hasMore flag
      fetchItems(false);
    }
  }, [selectedDate, selectedCode, sortOrder, inTransitOnly]); // Add inTransitOnly as dependency

  // First, ensure your useEffect looks like this
  useEffect(() => {
    const initializeDashboard = async () => {
      await fetchItems();
      await fetchAvailableCodes(); // Now TypeScript should see it's being used
    };

    initializeDashboard();
  }, []); // Add both to dependency array

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) {
      return;
    }

    if (items.length >= totalItems) {
      setHasMore(false);
      return;
    }

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);

      let filters: ItemFilters;
      if (searchMode && searchValue) {
        filters = {
          searchTitle: searchValue,
        };
      } else {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        filters = {
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
          ...(selectedCode !== 'all' && {code: selectedCode}),
          sortOrder,
          ...(inTransitOnly && {inTransitOnly: true}), // Add this line
        };
      }

      const response = await apiService.getItems(nextPage, 10, filters);

      setItems(prevItems => {
        // Filter out duplicates
        const newItems = response.items.filter(
          newItem =>
            !prevItems.some(existingItem => existingItem._id === newItem._id),
        );
        return [...prevItems, ...newItems];
      });

      setHasMore(response.pagination.hasMore);
      setTotalItems(response.pagination.total);
    } catch (error) {
      console.error('Error loading more items:', error);
      setError('Greška pri učitavanju dodatnih dokumenata');
    } finally {
      setLoadingMore(false);
    }
  }, [
    hasMore,
    loadingMore,
    loading,
    items.length,
    totalItems,
    page,
    searchMode,
    searchValue,
    selectedDate,
    selectedCode,
    sortOrder,
    inTransitOnly, // Add inTransitOnly to dependencies
  ]);

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

  //Replace just the return section in DashboardPage.tsx
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
          <PrintTableButton
            items={items}
            totalItems={totalItems}
            isLoading={loading}
            onPrintAll={fetchAllItemsForPrinting}
          />
          <PrintAllButton
            items={items}
            totalItems={totalItems}
            isLoading={loading}
            onPrintAll={fetchAllItemsForPrinting}
          />
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
        onDateChange={handleDateChange}
        selectedCode={selectedCode}
        onCodeChange={setSelectedCode}
        availableCodes={availableCodes}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        searchMode={searchMode}
        onSearchModeChange={setSearchMode}
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearch={handleSearch}
        onClearSearch={clearSearch}
        inTransitOnly={inTransitOnly} // Add these two lines
        onInTransitChange={setInTransitOnly}
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
            {/* Add the in_transit badge here */}
            {item.in_transit && <TransitBadge>U tranzitu</TransitBadge>}
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

              {item.approvalStatus === 'odobreno' && item.approvalLocation && (
                <ActionButton onClick={() => setSelectedLocation(item)}>
                  Lokacija
                </ActionButton>
              )}

              {user?.role === 'admin' && (
                <ApproveButton item={item} onSuccess={() => fetchItems(true)} />
              )}

              <PrintButton item={item} />

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

      {hasMore && items.length > 0 && items.length < totalItems && (
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
