import React, {useState, useEffect, useCallback, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {apiService, getImageUrl} from '../utils/api';
import {Item, ItemFilters, ItemUser} from '../types';
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

// ORIGINAL STYLED COMPONENTS - Restored from project
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
  width: 100%;

  /* Make buttons smaller and more responsive */
  & > button {
    flex: 1 1 calc(25% - ${({theme}) => theme.spacing.small}); /* 4 buttons per row max */
    min-width: 80px; /* Minimum button width */
    max-width: 120px; /* Maximum button width to prevent overflow */
    padding: 6px 8px !important; /* Smaller padding */
    font-size: 0.8rem !important; /* Smaller font */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-sizing: border-box;
  }

  /* For narrow cards, allow 3 buttons per row */
  @media (max-width: 400px) {
    & > button {
      flex: 1 1 calc(33.333% - ${({theme}) => theme.spacing.small});
      min-width: 70px;
      max-width: 100px;
      padding: 5px 6px !important;
      font-size: 0.75rem !important;
    }
  }
`;
const PhotoButtonsGroup = styled.div`
  display: flex;
  flex-wrap: wrap; /* Add this to prevent overflow */
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

const DashboardContainer = styled.div`
  background: ${({theme}) => theme.colors.white};
  border-radius: ${({theme}) => theme.borderRadius};
  box-shadow: ${({theme}) => theme.shadows.main};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${({theme}) => theme.spacing.medium};

  /* Target all buttons within HeaderActions and reduce their size by 15% */
  & > button,
  & button {
    padding: 0.638rem 0.85rem !important; /* Original was ~0.75rem 1rem, reduced by 15% */
    font-size: 0.935rem !important; /* Original was ~1.1rem, reduced by 15% */
  }

  /* For buttons that specifically have the S.Button styling */
  & > ${S.Button}, & ${S.Button} {
    padding: 0.638rem 0.85rem !important;
    font-size: 0.935rem !important;
  }
`;

// Alternative approach: Create a smaller variant of the button
const SmallButton = styled(S.Button)`
  padding: 0.638rem 0.85rem; /* 15% smaller than standard */
  font-size: 0.935rem; /* 15% smaller font */
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
  // Main state
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [inTransitOnly, setInTransitOnly] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  // Filter states
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedLocation, setSelectedLocation] = useState<Item | null>(null);
  const [selectedCode, setSelectedCode] = useState('all');
  const [selectedPrijevoznik, setSelectedPrijevoznik] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [sortOrder, setSortOrder] = useState('date-desc');

  // Available options for filters
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);
  const [availableCarriers, setAvailableCarriers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ItemUser[]>([]);

  // Search states
  const [searchMode, setSearchMode] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [registrationSearchValue, setRegistrationSearchValue] = useState('');
  const [searchType, setSearchType] = useState<'title' | 'registration'>(
    'title',
  );

  // Modal states
  const [isCreateModalVisible, setCreateModalVisible] =
    useState<boolean>(false);

  // Other states
  const [totalWeight, setTotalWeight] = useState(0);

  // Refs for preventing race conditions
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Hooks
  const {user, signOut} = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem('userToken');

  // Utility functions
  const getDisplayNameForUser = (item: Item): string => {
    if (!item.createdBy) return 'Nepoznato';

    // Check if this user should be grouped
    if (
      item.createdBy.email === 'vetovo.vaga@velicki-kamen.hr' ||
      item.createdBy.email === 'velicki.vaga@velicki-kamen.hr'
    ) {
      return 'VELIČKI KAMEN d.o.o.';
    }

    if (item.createdBy.email === 'vaga.fukinac@kamen-psunj.hr') {
      return 'KAMEN - PSUNJ d.o.o.';
    }

    // For all other users, use existing logic
    return `${item.createdBy.firstName} ${item.createdBy.lastName}`;
  };

  const formatWeight = (weightInKg: number) => {
    const weightInTons = weightInKg / 1000;
    return weightInTons.toFixed(3);
  };

  // FIXED: Add safe date parsing function
  const safeParseDate = (dateString: string): string => {
    if (!dateString) return 'N/A';

    // If it's already a formatted Croatian date string (dd.mm.yyyy), return as is
    if (dateString.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
      return dateString;
    }

    // Try to parse as ISO date or other formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.log('Failed to parse date:', dateString); // Debug log
      return dateString; // Return original string instead of N/A to see what we're getting
    }

    return date.toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // FIXED: Add safe date and time formatting
  const formatDateAndTime = (
    creationDate: string,
    creationTime?: string,
  ): string => {
    const formattedDate = safeParseDate(creationDate);

    if (!formattedDate || formattedDate === 'N/A') {
      console.log('formatDateAndTime - bad date:', creationDate); // Debug log
      return creationTime ? `${creationDate} ${creationTime}` : creationDate; // Show original data for debugging
    }

    return creationTime ? `${formattedDate} ${creationTime}` : formattedDate;
  };

  const showRestrictedMessage =
    user?.role === 'admin' && user?.codes && user.codes.length > 0;

  // FIXED: Main fetch function with proper pagination logic
  const fetchItems = useCallback(
    async (
      pageNumber: number = 1,
      append: boolean = false,
      signal?: AbortSignal,
    ) => {
      // Prevent multiple simultaneous requests
      if (isFetchingRef.current && !signal) {
        console.log('Fetch already in progress, skipping...');
        return;
      }

      try {
        isFetchingRef.current = true;

        // Set loading states
        if (append && pageNumber > 1) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        let filters: ItemFilters;

        if (searchMode && searchValue.trim()) {
          // Search mode filters
          filters = {
            searchTitle: searchValue.trim(),
          };
        } else if (searchMode && registrationSearchValue.trim()) {
          filters = {
            searchRegistration: registrationSearchValue.trim(),
          };
        } else {
          // Normal mode filters with date range
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
            ...(selectedUser !== 'all' && {createdByUser: selectedUser}),
            sortOrder,
            ...(inTransitOnly && {inTransitOnly: true}),
          };
        }

        console.log(`Fetching page ${pageNumber} with filters:`, filters);

        const response = await apiService.getItems(pageNumber, 10, filters);

        if (signal?.aborted) {
          return;
        }

        // Update items based on append mode
        if (append && pageNumber > 1) {
          setItems(prevItems => {
            // Prevent duplicates
            const existingIds = new Set(prevItems.map(item => item._id));
            const newItems = response.items.filter(
              item => !existingIds.has(item._id),
            );
            return [...prevItems, ...newItems];
          });
        } else {
          setItems(response.items);
          setPage(pageNumber); // Set page to current page
        }

        // Update pagination info
        setHasMore(response.pagination.hasMore);
        setTotalItems(response.pagination.total);
        setTotalWeight(response.totalWeight || 0);
        setError('');
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Fetch aborted');
          return;
        }
        console.error('Error fetching items:', err);
        setError('Greška pri dohvaćanju dokumenata');
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      startDate,
      endDate,
      selectedCode,
      selectedPrijevoznik,
      selectedUser,
      sortOrder,
      inTransitOnly,
      searchMode,
      searchValue,
      registrationSearchValue,
    ],
  );

  // Fetch functions for filter options
  const fetchAvailableCodes = useCallback(async () => {
    try {
      console.log('Fetching available codes...');
      const codes = await apiService.getUniqueCodes();

      // Ensure deduplication and filtering on frontend
      const uniqueCodes = Array.from(new Set(codes))
        .filter(code => code != null && code !== '')
        .map(code => String(code).trim())
        .filter(code => code !== '')
        .sort();

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

      // Ensure deduplication and filtering on frontend
      const uniqueCarriers = Array.from(new Set(carriers))
        .filter(carrier => carrier != null && carrier !== '')
        .map(carrier => String(carrier).trim())
        .filter(carrier => carrier !== '')
        .sort();

      console.log('Processed unique carriers:', uniqueCarriers);
      setAvailableCarriers(uniqueCarriers);
    } catch (error) {
      console.error('Error fetching carriers:', error);
    }
  }, []);

  const fetchAvailableUsers = useCallback(async () => {
    try {
      console.log('Fetching available users...');
      const users = await apiService.getUniqueUsers();
      console.log('Processed unique users:', users);
      setAvailableUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  // FIXED: Load more handler
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading || isFetchingRef.current) {
      console.log('Skipping load more:', {
        hasMore,
        loadingMore,
        loading,
        isFetching: isFetchingRef.current,
      });
      return;
    }

    if (items.length >= totalItems) {
      console.log('All items loaded');
      setHasMore(false);
      return;
    }

    const nextPage = page + 1;
    console.log(`Loading more items, page ${nextPage}`);

    setPage(nextPage);
    await fetchItems(nextPage, true); // append = true
  }, [
    hasMore,
    loadingMore,
    loading,
    page,
    fetchItems,
    items.length,
    totalItems,
  ]);

  // FIXED: Filter change handler
  const handleFilterChange = useCallback(() => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Reset pagination and fetch first page
    setPage(1);
    setItems([]);
    setHasMore(true);

    fetchItems(1, false, abortControllerRef.current.signal);
  }, [fetchItems]);

  // Date range change handler
  const handleDateRangeChange = useCallback(
    (newStartDate: Date, newEndDate: Date) => {
      setStartDate(newStartDate);
      setEndDate(newEndDate);
      // handleFilterChange will be triggered by the useEffect
    },
    [],
  );

  // User change handler
  const handleUserChange = useCallback((user: string) => {
    console.log('User filter changed:', user);
    setSelectedUser(user);
    // handleFilterChange will be triggered by the useEffect
  }, []);

  // FIXED: Effects with proper dependencies
  useEffect(() => {
    if (!searchMode) {
      handleFilterChange();
    }
  }, [
    startDate,
    endDate,
    selectedCode,
    selectedPrijevoznik,
    selectedUser,
    sortOrder,
    inTransitOnly,
    searchMode, // Added searchMode to dependencies
    handleFilterChange,
  ]);

  // Initial load effect
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        abortControllerRef.current = new AbortController();
        await fetchItems(1, false, abortControllerRef.current.signal);

        // Fetch filter options
        await Promise.all([
          fetchAvailableCodes(),
          fetchAvailableCarriers(),
          fetchAvailableUsers(),
        ]);
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      }
    };

    initializeDashboard();
  }, []); // Empty dependency array for initial load only

  // Search handlers
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

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setSearchMode(true);
      setPage(1);
      setItems([]);
      setHasMore(true);

      fetchItems(1, false, abortControllerRef.current.signal);
    }
  }, [searchValue, registrationSearchValue, searchType, fetchItems]);

  const clearSearch = useCallback(() => {
    console.log('Clearing search');

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setSearchMode(false);
    setSearchValue('');
    setRegistrationSearchValue('');
    setSearchType('title');
    setPage(1);
    setItems([]);
    setHasMore(true);

    // Reset to today's date
    const today = new Date();
    setStartDate(today);
    setEndDate(today);
    setSelectedCode('all');
    setSelectedPrijevoznik('all');
    setSelectedUser('all');
    setSortOrder('date-desc');
    setInTransitOnly(false);
  }, []);

  // FIXED: Refresh handler
  const handleRefresh = useCallback(async () => {
    console.log('Manual refresh triggered');

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setPage(1);
    setItems([]);
    setHasMore(true);

    await fetchItems(1, false, abortControllerRef.current.signal);
  }, [fetchItems]);

  // Other handlers
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
        await apiService.deleteItem(itemId);
        setItems(prevItems => prevItems.filter(item => item._id !== itemId));
      } catch (error) {
        console.error('Error deleting item:', error);
        setError('Greška pri brisanju dokumenta');
      }
    }
  };

  const handleApprovalSuccess = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  // Utility functions for printing
  const formatDateRangeForPrint = (
    startDate: Date,
    endDate: Date,
    selectedCode: string,
    selectedPrijevoznik: string,
    selectedUser: string,
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
      dateRangeText = `${startDate.toLocaleDateString('hr-HR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })} - ${endDate.toLocaleDateString('hr-HR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })}`;
    }

    const filters: string[] = [];

    if (selectedCode !== 'all') {
      filters.push(`Šifra: ${getFormattedCode(selectedCode)}`);
    }

    if (selectedPrijevoznik !== 'all') {
      filters.push(`Prijevoznik: ${selectedPrijevoznik}`);
    }

    if (selectedUser !== 'all') {
      // Handle grouped users
      if (selectedUser.startsWith('group_')) {
        const groupName = selectedUser.replace('group_', '');
        const matchingUsers = availableUsers.filter(u =>
          groupName === 'velicki_kamen'
            ? [
                'vetovo.vaga@velicki-kamen.hr',
                'velicki.vaga@velicki-kamen.hr',
              ].includes(u.email)
            : groupName === 'kamen_psunj'
            ? ['vaga.fukinac@kamen-psunj.hr'].includes(u.email)
            : false,
        );

        if (matchingUsers.length === 1) {
          const user = matchingUsers[0];
          filters.push(
            `Dobavljač: ${
              user.displayName || `${user.firstName} ${user.lastName}`
            }`,
          );
        } else {
          filters.push(`Dobavljač: Grupa (${matchingUsers.length} korisnika)`);
        }
      } else {
        // Single user logic
        const user = availableUsers.find(u => u._id === selectedUser);
        if (user) {
          filters.push(
            `Dobavljač: ${
              user.displayName || `${user.firstName} ${user.lastName}`
            }`,
          );
        }
      }
    }

    if (inTransitOnly) {
      filters.push('Samo u tranzitu');
    }

    return filters.length > 0
      ? `${dateRangeText} (${filters.join(', ')})`
      : dateRangeText;
  };

  const fetchAllItemsForPrinting = async () => {
    try {
      setLoading(true);
      let allItems: Item[] = [];
      let currentPage = 1;
      let hasMoreItems = true;

      let filters: ItemFilters;
      if (searchMode && (searchValue || registrationSearchValue)) {
        filters =
          searchType === 'title'
            ? {searchTitle: searchValue}
            : {searchRegistration: registrationSearchValue};
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
          ...(selectedUser !== 'all' && {createdByUser: selectedUser}),
          sortOrder,
          ...(inTransitOnly && {inTransitOnly: true}),
        };
      }

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

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Render JSX - RESTORED ORIGINAL LAYOUT
  return (
    <S.PageContainer>
      <Header>
        <HeaderLeft>
          <Logo />
        </HeaderLeft>
        <HeaderActions>
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
              selectedPrijevoznik,
              selectedUser,
              inTransitOnly,
            )}
            selectedCode={selectedCode}
            inTransitOnly={inTransitOnly}
          />
          {/* Print and Export buttons */}
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
              selectedPrijevoznik,
              selectedUser,
              inTransitOnly,
            )}
          />
          {/* Document creation buttons */}
          {(user?.role === 'admin' || user?.role === 'bot') && (
            <S.Button
              id="create_item"
              onClick={() => setCreateModalVisible(true)}>
              Dodaj novi dokument
            </S.Button>
          )}

          {/* User Management button - only for admins */}
          {user?.role === 'admin' && (
            <S.Button onClick={() => navigate('/users')}>
              Upravljanje korisnicima
            </S.Button>
          )}

          <PrintAllButton
            items={items}
            totalItems={totalItems}
            totalWeight={totalWeight}
            isLoading={loading}
            onPrintAll={fetchAllItemsForPrinting}
          />

          {/* Logout button */}
          <S.Button onClick={handleLogout}>Odjava</S.Button>
        </HeaderActions>
      </Header>

      {showRestrictedMessage && (
        <RestrictedAccessMessage>
          <RestrictedAccessIcon>🔒</RestrictedAccessIcon>
          Ograničen pristup: Možete vidjeti samo dokumente s šiframa{' '}
          {user?.codes?.join(', ')}
        </RestrictedAccessMessage>
      )}

      <DashboardContainer>
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
          selectedUser={selectedUser}
          onUserChange={handleUserChange}
          availableUsers={availableUsers}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          searchValue={searchValue}
          onSearchValueChange={setSearchValue}
          registrationSearchValue={registrationSearchValue}
          onRegistrationSearchValueChange={setRegistrationSearchValue}
          searchType={searchType}
          onSearchTypeChange={setSearchType}
          onSearch={handleSearch}
          onClearSearch={clearSearch}
          searchMode={searchMode}
          onSearchModeChange={setSearchMode}
          inTransitOnly={inTransitOnly}
          onInTransitChange={setInTransitOnly}
        />
      </DashboardContainer>

      {error && <S.ErrorMessage>{error}</S.ErrorMessage>}

      {/* Total Weight Display - ORIGINAL STYLING */}
      {totalWeight > 0 && (
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

      {loading && page === 1 ? (
        <LoadingContainer>Učitavanje...</LoadingContainer>
      ) : (
        <>
          {/* ORIGINAL ITEMS GRID LAYOUT */}
          <ItemsGrid>
            {items.map(item => (
              <ItemCard key={item._id}>
                <ItemTitle>{item.title}</ItemTitle>

                {item.createdBy && (
                  <ItemDetails>
                    <strong>Dobavljač:</strong> {getDisplayNameForUser(item)}
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

                {/* Display prijevoznik if it exists */}
                {item.prijevoznik && (
                  <ItemDetails>
                    <strong>Prijevoznik:</strong> {item.prijevoznik}
                  </ItemDetails>
                )}

                {item.registracija && (
                  <ItemDetails>
                    <strong>Registracija:</strong> {item.registracija}
                  </ItemDetails>
                )}

                {/* Display tezina in tons */}
                {item.tezina !== undefined && (
                  <ItemDetails>
                    <strong>Težina:</strong> {(item.tezina / 1000).toFixed(3)} t
                  </ItemDetails>
                )}

                {item.neto !== undefined &&
                  item.approvalStatus === 'odobreno' && (
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
                              item.neto < -5 || item.neto > 5
                                ? '600'
                                : 'normal',
                          }}>
                          {item.neto}%
                        </span>
                      )}
                    </ItemDetails>
                  )}

                <ItemDetails>
                  <strong>Datum i vrijeme:</strong>{' '}
                  {formatDateAndTime(item.creationDate, item.creationTime)}
                </ItemDetails>

                <div>
                  <StatusBadge status={item.approvalStatus}>
                    {item.approvalStatus === 'odobreno'
                      ? 'Odobreno'
                      : item.approvalStatus === 'odbijen'
                      ? 'Odbijeno'
                      : 'Na čekanju'}
                  </StatusBadge>

                  {/* Show in transit badge */}
                  {item.in_transit && (
                    <TransitBadge>🚛 U tranzitu</TransitBadge>
                  )}
                </div>

                {item.approvalStatus === 'odobreno' && item.approvedBy && (
                  <ItemDetails>
                    <strong>Odobrio:</strong> {item.approvedBy.firstName}{' '}
                    {item.approvedBy.lastName}
                    {item.approvalDate && (
                      <> ({safeParseDate(item.approvalDate)})</>
                    )}
                  </ItemDetails>
                )}

                {/* ORIGINAL BUTTON LAYOUT */}
                <ButtonGroup>
                  <PhotoButtonsGroup>
                    <PrintButton item={item} />

                    {/* RESTORED: Original PDF button */}
                    <ActionButton
                      onClick={() => {
                        try {
                          window.open(item.pdfUrl, '_blank');
                        } catch (error) {
                          console.error('Error opening PDF:', error);
                        }
                      }}>
                      PDF
                    </ActionButton>

                    {/* Show approval photos if they exist */}
                    {item.approvalPhotoFront?.url && (
                      <ActionButton
                        onClick={() => {
                          const imageUrl = item.approvalPhotoFront?.url;
                          if (imageUrl) {
                            setSelectedImage(getImageUrl(imageUrl));
                          }
                        }}>
                        Registracija
                      </ActionButton>
                    )}

                    {item.approvalPhotoBack?.url && (
                      <ActionButton
                        onClick={() => {
                          const imageUrl = item.approvalPhotoBack?.url;
                          if (imageUrl) {
                            setSelectedImage(getImageUrl(imageUrl));
                          }
                        }}>
                        materijal
                      </ActionButton>
                    )}
                  </PhotoButtonsGroup>

                  {/* RESTORED: PC User Approval PDF Document */}
                  {item.approvalDocument?.url && (
                    <ActionButton
                      onClick={async () => {
                        try {
                          const pdfUrl = item.approvalDocument!.url!;

                          // Extract filename from URL for download
                          const urlParts = pdfUrl.split('/');
                          const filename = `${
                            urlParts[urlParts.length - 1]
                          }.pdf`;

                          // Try to download the PDF
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
                          // Fallback to opening in new tab
                          window.open(item.approvalDocument!.url!, '_blank');
                        }
                      }}>
                      Dokumentacija PDF
                    </ActionButton>
                  )}

                  {/* Location button */}
                  {item.approvalLocation && (
                    <ActionButton onClick={() => setSelectedLocation(item)}>
                      Lokacija odobrenja
                    </ActionButton>
                  )}

                  {/* Approval buttons based on user role */}
                  {user?.role === 'admin' &&
                    item.approvalStatus === 'na čekanju' && (
                      <ApproveButton
                        item={item}
                        onSuccess={handleApprovalSuccess}
                      />
                    )}

                  {user?.role === 'pc-user' &&
                    item.approvalStatus === 'na čekanju' && (
                      <PCUserApproveButton
                        item={item}
                        onSuccess={handleApprovalSuccess}
                      />
                    )}

                  {/* Delete button for admin */}
                  {user?.role === 'admin' && (
                    <DeleteButton onClick={() => handleDelete(item._id)}>
                      Obriši
                    </DeleteButton>
                  )}
                </ButtonGroup>
              </ItemCard>
            ))}
          </ItemsGrid>

          {/* Load More Button */}
          {hasMore && !loading && items.length > 0 && (
            <LoadMoreButton
              onClick={handleLoadMore}
              disabled={loadingMore}
              style={{
                backgroundColor: loadingMore ? '#ccc' : undefined,
                cursor: loadingMore ? 'not-allowed' : 'pointer',
              }}>
              {loadingMore ? 'Učitavanje...' : 'Učitaj više'}
            </LoadMoreButton>
          )}

          {/* Loading indicator for load more */}
          {loadingMore && (
            <div style={{textAlign: 'center', padding: '20px'}}>
              <LoadingContainer>Učitavanje dodatnih stavki...</LoadingContainer>
            </div>
          )}

          {/* No more items message */}
          {!hasMore && items.length > 0 && (
            <div style={{textAlign: 'center', padding: '20px', color: '#666'}}>
              Nema više stavki za učitavanje
            </div>
          )}

          {/* No items found message */}
          {!loading && items.length === 0 && !error && (
            <EmptyMessage>
              {searchMode
                ? 'Nema rezultata pretrage'
                : 'Nema dokumenata za prikaz'}
            </EmptyMessage>
          )}
        </>
      )}

      {/* Modals */}
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
            handleRefresh();
          }}
        />
      )}
    </S.PageContainer>
  );
};

export default Dashboard;
