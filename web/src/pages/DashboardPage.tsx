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
import PrintButton from '../components/PrintButton';
import DashboardFilters from '../components/DashboardFilters';
import CreateItemModal from '../components/CreateItemModal';
import PrintAllButton from '../components/PrintAllButton';
import PrintTableButton from 'src/components/PrintTableButton';
import ApproveButton from '../components/ApproveButton';
import PCUserApproveButton from '../components/PCUserApproveButton';
import ExportExcelButton from '../components/ExportExcelButton';
import {getFormattedCode, getCodeDescription} from '../utils/codeMapping';
import AdminCodeEditor from '../components/AdminCodeEditor';

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

const RestrictedAccessMessage = styled.div`
  background: ${({theme}) => theme.colors.primary}15;
  border: 1px solid ${({theme}) => theme.colors.primary}40;
  color: ${({theme}) => theme.colors.primary};
  padding: ${({theme}) => theme.spacing.medium};
  border-radius: ${({theme}) => theme.borderRadius};
  margin-bottom: ${({theme}) => theme.spacing.medium};
  display: flex;
  align-items: center;
  gap: ${({theme}) => theme.spacing.small};
`;

const RestrictedAccessIcon = styled.span`
  font-size: 1.2rem;
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

// Styled component for total weight display
const TotalWeightContainer = styled.div`
  background: ${({theme}) => theme.colors.white};
  padding: ${({theme}) => theme.spacing.medium};
  border-radius: ${({theme}) => theme.borderRadius};
  box-shadow: ${({theme}) => theme.shadows.main};
  margin-bottom: ${({theme}) => theme.spacing.medium};
  text-align: center;
  border-left: 4px solid ${({theme}) => theme.colors.primary};
`;

const TotalWeightValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({theme}) => theme.colors.primary};
  margin-bottom: 0.25rem;
`;

const TotalWeightLabel = styled.div`
  font-size: 0.9rem;
  color: ${({theme}) => theme.colors.text};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Dashboard: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [inTransitOnly, setInTransitOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Date state for date range
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const [selectedLocation, setSelectedLocation] = useState<Item | null>(null);
  const [selectedCode, setSelectedCode] = useState('all');
  // NEW: Add prijevoznik filtering states
  const [selectedPrijevoznik, setSelectedPrijevoznik] = useState('all');
  const [availableCarriers, setAvailableCarriers] = useState<string[]>([]);

  const [sortOrder, setSortOrder] = useState('date-desc');
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchMode, setSearchMode] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [registrationSearchValue, setRegistrationSearchValue] = useState('');
  const [searchType, setSearchType] = useState<'title' | 'registration'>(
    'title',
  ); // Track what we're searching for
  const [totalItems, setTotalItems] = useState(0);
  const [isCreateModalVisible, setCreateModalVisible] =
    useState<boolean>(false);
  // Add state for total weight from backend
  const [totalWeight, setTotalWeight] = useState(0);

  const {user, signOut} = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem('userToken');

  // Format weight display in tons
  const formatWeight = (weightInKg: number) => {
    const weightInTons = weightInKg / 1000;
    return weightInTons.toFixed(3);
  };

  const showRestrictedMessage =
    user?.role === 'admin' && user?.codes && user.codes.length > 0;

  const fetchAvailableCodes = useCallback(async () => {
    try {
      console.log('Fetching available codes...');
      const codes = await apiService.getUniqueCodes();

      // Ensure deduplication and filtering on frontend - handle different data types
      const uniqueCodes = Array.from(new Set(codes))
        .filter(code => code != null && code !== '') // Remove null/undefined/empty values
        .map(code => String(code).trim()) // Convert to string and trim
        .filter(code => code !== '') // Remove empty strings after trimming
        .sort();

      console.log('Raw codes from API:', codes);
      console.log(
        'Raw codes types:',
        codes.map(code => typeof code),
      );
      console.log('Processed unique codes:', uniqueCodes);

      setAvailableCodes(uniqueCodes);
    } catch (error) {
      console.error('Error fetching codes:', error);
    }
  }, []);

  const fetchAvailableCarriers = useCallback(async () => {
    try {
      console.log('Fetching available carriers...');
      const carriers = await apiService.getUniqueCarriers();

      // Ensure deduplication and filtering on frontend - handle different data types
      const uniqueCarriers = Array.from(new Set(carriers))
        .filter(carrier => carrier != null && carrier !== '') // Remove null/undefined/empty values
        .map(carrier => String(carrier).trim()) // Convert to string and trim
        .filter(carrier => carrier !== '') // Remove empty strings after trimming
        .sort();

      console.log('Raw carriers from API:', carriers);
      console.log(
        'Raw carriers types:',
        carriers.map(carrier => typeof carrier),
      );
      console.log('Processed unique carriers:', uniqueCarriers);

      setAvailableCarriers(uniqueCarriers);
    } catch (error) {
      console.error('Error fetching carriers:', error);
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
          // Updated to use date range
          const startOfDay = new Date(startDate);
          startOfDay.setHours(0, 0, 0, 0);

          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);

          filters = {
            startDate: startOfDay.toISOString(),
            endDate: endOfDay.toISOString(),
            ...(selectedCode !== 'all' && {code: selectedCode}),
            // NEW: Add prijevoznik filter
            ...(selectedPrijevoznik !== 'all' && {
              prijevoznik: selectedPrijevoznik,
            }),
            sortOrder,
            ...(inTransitOnly && {inTransitOnly: true}),
          };
          console.log('Using date range filters:', filters);
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
        // Set total weight from backend response
        setTotalWeight(response.totalWeight || 0);
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
      startDate,
      endDate,
      selectedCode,
      selectedPrijevoznik, // NEW: Add prijevoznik dependency
      sortOrder,
      searchMode,
      searchValue,
      inTransitOnly,
    ],
  );

  const handleApprovalSuccess = useCallback(() => {
    setPage(1);
    setItems([]);
    setHasMore(true);
    fetchItems(false);
  }, [fetchItems]);

  const formatDateRangeForPrint = (
    startDate: Date,
    endDate: Date,
    selectedCode: string,
    selectedPrijevoznik: string,
    inTransitOnly: boolean,
  ) => {
    const isSameDay = startDate.toDateString() === endDate.toDateString();

    let dateRangeText = '';
    if (isSameDay) {
      dateRangeText = startDate.toLocaleDateString('hr-HR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } else {
      const startStr = startDate.toLocaleDateString('hr-HR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const endStr = endDate.toLocaleDateString('hr-HR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      dateRangeText = `${startStr} - ${endStr}`;
    }

    // ADD THE MISSING FILTERS LOGIC
    const filters = [];
    if (selectedCode !== 'all') {
      filters.push(`RN: ${selectedCode}`);
    }
    if (selectedPrijevoznik !== 'all') {
      filters.push(`Prijevoznik: ${selectedPrijevoznik}`);
    }
    if (inTransitOnly) {
      filters.push('U tranzitu');
    }

    if (filters.length > 0) {
      dateRangeText += ` (${filters.join(', ')})`;
    }

    return dateRangeText;
  };

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
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);

        filters = {
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
          ...(selectedCode !== 'all' && {code: selectedCode}),
          ...(selectedPrijevoznik !== 'all' && {
            prijevoznik: selectedPrijevoznik,
          }),
          sortOrder,
          ...(inTransitOnly && {inTransitOnly: true}),
        };
      }

      // ADD THE MISSING WHILE LOOP LOGIC
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
    const currentSearchValue =
      searchType === 'title' ? searchValue : registrationSearchValue;

    if (currentSearchValue.trim()) {
      console.log(
        'Search triggered with:',
        currentSearchValue,
        'type:',
        searchType,
      );
      setLoading(true);
      setSearchMode(true);
      setPage(1);

      Promise.resolve().then(() => {
        const searchFilters: ItemFilters =
          searchType === 'title'
            ? {searchTitle: currentSearchValue}
            : {searchRegistration: currentSearchValue};

        console.log('Fetching with search filters:', searchFilters);

        apiService
          .getItems(1, 10, searchFilters)
          .then(response => {
            setItems(response.items);
            setHasMore(response.pagination.hasMore);
            setTotalItems(response.pagination.total);
            setTotalWeight(response.totalWeight || 0);
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
  }, [searchValue, registrationSearchValue, searchType]);
  const clearSearch = useCallback(() => {
    console.log('Clearing search');
    setLoading(true);

    setSearchMode(false);
    setSearchValue('');
    setRegistrationSearchValue(''); // ADD THIS LINE
    setSearchType('title'); // ADD THIS LINE
    setPage(1);
    // Reset to today's date range
    const today = new Date();
    setStartDate(today);
    setEndDate(today);
    setSelectedCode('all');
    setSelectedPrijevoznik('all');
    setSortOrder('date-desc');
    setInTransitOnly(false);

    Promise.resolve().then(() => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const initialFilters: ItemFilters = {
        startDate: todayStart.toISOString(),
        endDate: todayEnd.toISOString(),
        sortOrder: 'date-desc',
      };

      apiService
        .getItems(1, 10, initialFilters)
        .then(response => {
          setItems(response.items);
          setHasMore(response.pagination.hasMore);
          setTotalItems(response.pagination.total);
          setTotalWeight(response.totalWeight || 0);
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

  // Updated date range change handler
  const handleDateRangeChange = (newStartDate: Date, newEndDate: Date) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setPage(1);
    setItems([]);
    setHasMore(true);
  };

  useEffect(() => {
    if (!searchMode) {
      setPage(1);
      setItems([]);
      setHasMore(true);
      fetchItems(false);
      // REMOVED: Don't fetch codes again here since they don't change based on filters
    }
  }, [
    startDate,
    endDate,
    selectedCode,
    selectedPrijevoznik,
    sortOrder,
    inTransitOnly,
  ]);

  useEffect(() => {
    let isMounted = true;

    const initializeDashboard = async () => {
      try {
        await fetchItems();
        if (isMounted) {
          await fetchAvailableCodes();
          await fetchAvailableCarriers();
        }
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      }
    };

    initializeDashboard();

    return () => {
      isMounted = false;
    };
  }, []); // Keep empty dependency array - only run once on mount

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) {
      console.log('Skipping load more:', {
        hasMore,
        loadingMore,
        loading,
      });
      return;
    }

    if (items.length >= totalItems) {
      console.log('All items loaded');
      setHasMore(false);
      return;
    }

    console.log('Loading more items, increasing page');
    setPage(prevPage => prevPage + 1);
  }, [hasMore, loadingMore, loading, items.length, totalItems]);

  useEffect(() => {
    if (page > 1) {
      console.log('Page changed to:', page);
      fetchItems(true);
    }
  }, [page, fetchItems]);

  const handleRefresh = useCallback(async () => {
    console.log('Manual refresh triggered');
    setPage(1);
    setItems([]);
    await fetchItems(false);
    // Don't fetch codes again during refresh unless they actually change
  }, [fetchItems]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setError('Greška pri odjavi');
    }
  };

  const handleCodeUpdate = async (
    itemId: string,
    newCode: string,
  ): Promise<boolean> => {
    try {
      const response = await apiService.updateItemCode(itemId, newCode);

      if (response) {
        // Update the item in your local state
        setItems(prevItems =>
          prevItems.map(item =>
            item._id === itemId ? {...item, code: newCode} : item,
          ),
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating code:', error);
      return false;
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

  // Format date range for display
  const formatDateRangeDisplay = () => {
    const isSameDay = startDate.toDateString() === endDate.toDateString();

    if (isSameDay) {
      return startDate.toLocaleDateString('hr-HR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }

    const startStr = startDate.toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const endStr = endDate.toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${startStr} - ${endStr}`;
  };

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
            totalWeight={totalWeight}
            isLoading={loading}
            onPrintAll={fetchAllItemsForPrinting}
            dateRange={formatDateRangeForPrint(
              startDate,
              endDate,
              selectedCode,
              selectedPrijevoznik, // NEW: Add this parameter
              inTransitOnly,
            )}
          />
          <ExportExcelButton
            items={items}
            totalItems={totalItems}
            totalWeight={totalWeight}
            isLoading={loading}
            onExportAll={fetchAllItemsForPrinting}
            dateRange={formatDateRangeForPrint(
              startDate,
              endDate,
              selectedCode,
              selectedPrijevoznik, // NEW: Add this parameter
              inTransitOnly,
            )}
            selectedCode={selectedCode}
            inTransitOnly={inTransitOnly}
          />
          <PrintAllButton
            items={items}
            totalItems={totalItems}
            totalWeight={totalWeight}
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

      {/* Restricted access message */}
      {showRestrictedMessage && (
        <RestrictedAccessMessage>
          <RestrictedAccessIcon>🔒</RestrictedAccessIcon>
          <div>
            <strong>Ograničeni pristup:</strong> Kao administrator s
            dodijeljenim kodovima, vidite samo stavke za kodove:{' '}
            <strong>{user.codes.join(', ')}</strong>
          </div>
        </RestrictedAccessMessage>
      )}

      {error && <S.ErrorMessage>{error}</S.ErrorMessage>}

      <DashboardFilters
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={handleDateRangeChange}
        selectedCode={selectedCode}
        onCodeChange={setSelectedCode}
        availableCodes={availableCodes}
        selectedPrijevoznik={selectedPrijevoznik}
        onPrijevoznikChange={setSelectedPrijevoznik}
        availableCarriers={availableCarriers}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        searchMode={searchMode}
        onSearchModeChange={setSearchMode}
        // ADD ALL THESE PROPS:
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        registrationSearchValue={registrationSearchValue}
        onRegistrationSearchValueChange={setRegistrationSearchValue}
        searchType={searchType}
        onSearchTypeChange={setSearchType}
        onSearch={handleSearch}
        onClearSearch={clearSearch}
        inTransitOnly={inTransitOnly}
        onInTransitChange={setInTransitOnly}
      />

      {/* Total Weight Display - shows total for ALL filtered items */}
      {totalItems > 0 && totalWeight > 0 && (
        <TotalWeightContainer>
          <TotalWeightValue>{formatWeight(totalWeight)} t</TotalWeightValue>
          <TotalWeightLabel>
            Ukupna težina ({totalItems}{' '}
            {totalItems === 1
              ? 'kamion'
              : totalItems < 2
              ? 'kamiona'
              : 'kamiona'}
            )
          </TotalWeightLabel>
        </TotalWeightContainer>
      )}

      <ItemsGrid>
        {items.map(item => (
          <ItemCard key={item._id}>
            <ItemTitle>{item.title}</ItemTitle>
            {item.registracija && (
              <ItemDetails>
                <strong>Registracija:</strong> {item.registracija}
              </ItemDetails>
            )}

            {user?.role === 'admin' ? (
              <AdminCodeEditor
                item={item}
                availableCodes={availableCodes}
                onCodeUpdate={handleCodeUpdate}
              />
            ) : (
              <ItemDetails>
                <strong>RN:</strong> {getFormattedCode(item.code)}
              </ItemDetails>
            )}

            {/* NEW: Display prijevoznik if it exists */}
            {item.prijevoznik && (
              <ItemDetails>
                <strong>Prijevoznik:</strong> {item.prijevoznik}
              </ItemDetails>
            )}

            {/* Display tezina in tons */}
            {item.tezina !== undefined && (
              <ItemDetails>
                <strong>Težina:</strong> {(item.tezina / 1000).toFixed(3)} t
              </ItemDetails>
            )}
            {item.neto !== undefined && item.approvalStatus === 'odobreno' && (
              <ItemDetails>
                <strong>Razlika u vaganju:</strong>{' '}
                {item.neto > 1000 ? (
                  <span>/</span>
                ) : (
                  <span
                    style={{
                      color:
                        item.neto < -5
                          ? '#f44336'
                          : item.neto > 5
                          ? '#4caf50'
                          : 'inherit',
                      fontWeight:
                        item.neto < -5 || item.neto > 5 ? '600' : 'normal',
                    }}>
                    {item.neto}%
                  </span>
                )}
              </ItemDetails>
            )}
            <ItemDetails>
              <strong>Datum i vrijeme:</strong>{' '}
              {item.creationTime
                ? `${item.creationDate} ${item.creationTime}`
                : item.creationDate}
            </ItemDetails>
            <StatusBadge status={item.approvalStatus}>
              {item.approvalStatus}
            </StatusBadge>
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
              <PrintButton item={item} />
              {item.approvalStatus === 'odobreno' && (
                <>
                  {(item.approvalPhotoFront?.url ||
                    item.approvalPhotoBack?.url) && (
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

                  {item.approvalDocument?.url && (
                    <ActionButton
                      onClick={async () => {
                        try {
                          const pdfUrl = item.approvalDocument!.url!;

                          const urlParts = pdfUrl.split('/');
                          const filename = `${
                            urlParts[urlParts.length - 1]
                          }.pdf`;

                          const response = await fetch(pdfUrl);
                          const blob = await response.blob();

                          const blobUrl = window.URL.createObjectURL(
                            new Blob([blob], {type: 'application/pdf'}),
                          );

                          const a = document.createElement('a');
                          a.href = blobUrl;
                          a.download = filename;
                          document.body.appendChild(a);
                          a.click();

                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(blobUrl);
                        } catch (error) {
                          console.error('Error downloading PDF:', error);
                          window.open(item.approvalDocument!.url!, '_blank');
                        }
                      }}>
                      Dokumentacija PDF
                    </ActionButton>
                  )}
                </>
              )}
              {item.approvalStatus === 'odobreno' && item.approvalLocation && (
                <ActionButton onClick={() => setSelectedLocation(item)}>
                  Lokacija
                </ActionButton>
              )}
              {item.approvalStatus === 'na čekanju' && (
                <>
                  {user?.role === 'admin' && (
                    <ApproveButton
                      item={item}
                      onSuccess={handleApprovalSuccess}
                    />
                  )}
                  {user?.role === 'pc-user' && (
                    <PCUserApproveButton
                      item={item}
                      onSuccess={handleApprovalSuccess}
                    />
                  )}
                </>
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
        <EmptyMessage>
          Nema dostupnih dokumenata za period: {formatDateRangeDisplay()}
          {selectedCode !== 'all' && ` (${selectedCode})`}
          {selectedPrijevoznik !== 'all' && ` - ${selectedPrijevoznik}`}
        </EmptyMessage>
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
