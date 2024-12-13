import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import styled from 'styled-components';
import {User} from '../types';
import {apiService} from '../utils/api';
import * as S from '../components/styled/Common';
import Logo from '../components/Logo';
import EditUserModal from '../components/EditUserModal';
import CreateUserModal from '../components/CreateUserModal';

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

const HeaderTitle = styled.h1`
  margin: 0;
  color: ${({theme}) => theme.colors.text};
  font-size: 1.5rem;
`;

const UserCard = styled.div`
  background: ${({theme}) => theme.colors.white};
  padding: ${({theme}) => theme.spacing.medium};
  border-radius: ${({theme}) => theme.borderRadius};
  box-shadow: ${({theme}) => theme.shadows.main};
  margin-bottom: ${({theme}) => theme.spacing.medium};
  transition: transform 0.2s ease-in-out;

  &:hover {
    transform: translateY(-2px);
  }
`;

const UserHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: ${({theme}) => theme.spacing.medium};
`;

const UserDetails = styled.div`
  margin: 4px 0;
  color: ${({theme}) => theme.colors.text};
  font-size: 0.9rem;
`;

const UserName = styled.h3`
  margin: 0;
  color: ${({theme}) => theme.colors.text};
  font-size: 1.1rem;
  font-weight: 600;
`;

const Badge = styled.span<{role: User['role']}>`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.875rem;
  background-color: ${({role}) =>
    role === 'admin' ? '#e8f5e9' : role === 'bot' ? '#e3f2fd' : '#f5f5f5'};
  color: ${({role}) =>
    role === 'admin' ? '#2e7d32' : role === 'bot' ? '#1565c0' : '#616161'};
  margin-left: 8px;
`;

const CodesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

const CodeBadge = styled.span`
  background-color: ${({theme}) => theme.colors.gray};
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.875rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({theme}) => theme.spacing.large};
  color: ${({theme}) => theme.colors.text};
  background: ${({theme}) => theme.colors.white};
  border-radius: ${({theme}) => theme.borderRadius};
  box-shadow: ${({theme}) => theme.shadows.main};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: ${({theme}) => theme.spacing.large};
  color: ${({theme}) => theme.colors.primary};
`;

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateAvailableCodes = (fetchedUsers: User[]) => {
    // Extract all codes from all users
    const allCodes = fetchedUsers.reduce((codes: string[], user) => {
      return [...codes, ...user.codes];
    }, []);

    // Remove duplicates and sort
    const uniqueCodes = Array.from(new Set(allCodes)).sort((a, b) =>
      a.localeCompare(b, undefined, {numeric: true}),
    );

    setAvailableCodes(uniqueCodes);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await apiService.getUsers();
      setUsers(fetchedUsers);
      updateAvailableCodes(fetchedUsers);
      setError('');
    } catch (err) {
      setError('Greška pri dohvaćanju korisnika');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
  };

  const getRolePermissions = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return [
          'Full system access',
          'User management',
          'Document approval',
          'Data export',
          'System configuration',
        ];
      case 'user':
        return [
          'Document viewing',
          'Document approval',
          'Personal data access',
        ];
      case 'bot':
        return ['Automated document creation', 'System integration'];
      default:
        return [];
    }
  };

  const handleDataExport = async (user: User) => {
    try {
      const currentDate = new Date().toISOString();
      const exportData = {
        metadata: {
          exportDate: currentDate,
          exportVersion: '1.0',
          dataController: 'Osijek-Koteks',
          dataProtectionOfficerContact: 'it@osijek-koteks.hr',
        },
        personalData: {
          userId: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          company: user.company,
          role: user.role,
          phoneNumber: user.phoneNumber || 'Not provided',
          verificationStatus: user.isVerified ? 'Verified' : 'Not verified',
        },
        accessRights: {
          assignedCodes: user.codes,
          role: user.role,
          permissions: getRolePermissions(user.role),
        },
        dataProcessingConsent: {
          status: 'Active',
          lastUpdated: currentDate,
          consentVersion: '1.0',
          dataRetentionPeriod: '365 days',
          purposes: [
            'User authentication',
            'Document approval processing',
            'Location tracking for document verification',
            'Photo capture for document verification',
          ],
        },
        privacyRights: {
          rightToAccess: true,
          rightToRectification: true,
          rightToErasure: true,
          rightToDataPortability: true,
          rightToRestrictProcessing: true,
          howToExerciseRights:
            'Contact it@osijek-koteks.hr to exercise your data protection rights',
        },
        dataSharing: {
          thirdParties: [
            {
              name: 'Cloudinary',
              purpose: 'Photo storage for document verification',
              dataShared: ['Document verification photos'],
              location: 'Cloud service',
            },
          ],
        },
        technicalMeasures: {
          encryption: 'Data is encrypted in transit and at rest',
          accessControls: 'Role-based access control implemented',
          securityMeasures: [
            'Secure password hashing',
            'JWT-based authentication',
            'HTTPS encryption',
            'Regular security updates',
          ],
        },
      };

      const filename = `gdpr-data-export_${user.firstName}-${user.lastName}_${
        new Date().toISOString().split('T')[0]
      }.json`;

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting user data:', error);
      alert('Greška pri izvozu podataka');
    }
  };

  if (loading) {
    return (
      <S.PageContainer>
        <LoadingState>Učitavanje korisnika...</LoadingState>
      </S.PageContainer>
    );
  }

  return (
    <S.PageContainer>
      <Header>
        <HeaderLeft>
          <Logo />
          <HeaderTitle>Upravljanje korisnicima</HeaderTitle>
        </HeaderLeft>
        <ButtonGroup>
          <S.Button onClick={() => navigate('/dashboard')}>
            Natrag na dokumente
          </S.Button>
          <S.Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}>
            Dodaj korisnika
          </S.Button>
        </ButtonGroup>
      </Header>

      {error && <S.ErrorMessage>{error}</S.ErrorMessage>}

      {users.map(user => (
        <UserCard key={user._id}>
          <UserHeader>
            <div>
              <UserName>
                {user.firstName} {user.lastName}
                <Badge role={user.role}>
                  {user.role === 'admin'
                    ? 'Administrator'
                    : user.role === 'bot'
                    ? 'Bot'
                    : 'Korisnik'}
                </Badge>
              </UserName>
              <UserDetails>{user.email}</UserDetails>
              <UserDetails>Firma: {user.company}</UserDetails>
              <UserDetails>
                Status: {user.isVerified ? 'Verificiran' : 'Nije verificiran'}
              </UserDetails>
            </div>
            <ButtonGroup>
              <S.Button
                onClick={() => handleDataExport(user)}
                variant="secondary">
                Izvoz podataka
              </S.Button>
              <S.Button onClick={() => handleEdit(user)}>Uredi</S.Button>
            </ButtonGroup>
          </UserHeader>

          <CodesContainer>
            {user.codes.length > 0 ? (
              user.codes.map(code => <CodeBadge key={code}>{code}</CodeBadge>)
            ) : (
              <UserDetails>Nema dodijeljenih radnih naloga</UserDetails>
            )}
          </CodesContainer>
        </UserCard>
      ))}

      {users.length === 0 && !loading && (
        <EmptyState>Nema pronađenih korisnika</EmptyState>
      )}

      <EditUserModal
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onSuccess={() => {
          setSelectedUser(null);
          fetchUsers();
        }}
      />
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          fetchUsers();
        }}
        availableCodes={availableCodes}
      />
    </S.PageContainer>
  );
};

export default UserManagementPage;
