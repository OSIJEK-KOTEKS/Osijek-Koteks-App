// src/pages/UserManagementPage.tsx
import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {apiService} from '../utils/api';
import {User} from '../types';
import styled from 'styled-components';
import * as S from '../components/styled/Common';

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({theme}) => theme.spacing.large};
`;

const UserCard = styled.div`
  background: ${({theme}) => theme.colors.white};
  padding: ${({theme}) => theme.spacing.medium};
  border-radius: ${({theme}) => theme.borderRadius};
  box-shadow: ${({theme}) => theme.shadows.main};
  margin-bottom: ${({theme}) => theme.spacing.medium};
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
`;

const UserName = styled.h3`
  margin: 0;
  color: ${({theme}) => theme.colors.text};
  font-size: 1.1rem;
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

const UserManagementPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await apiService.getUsers();
      setUsers(fetchedUsers);
      setError('');
    } catch (err) {
      setError('Greška pri dohvaćanju korisnika');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    // For future implementation
    console.log('Edit user:', user);
  };

  const handleExportData = (user: User) => {
    const data = {
      personalData: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        role: user.role,
      },
      codes: user.codes,
      isVerified: user.isVerified,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${user.firstName}-${user.lastName}-data.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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
        <h1>Upravljanje korisnicima</h1>
        <ButtonGroup>
          <S.Button onClick={() => navigate('/dashboard')}>
            Natrag na dokumente
          </S.Button>
          <S.Button variant="primary">Dodaj korisnika</S.Button>
        </ButtonGroup>
      </Header>

      {error && <S.ErrorMessage>{error}</S.ErrorMessage>}

      {users.map(user => (
        <UserCard key={user._id}>
          <UserHeader>
            <div>
              <UserName>
                {user.firstName} {user.lastName}
                <Badge role={user.role}>{user.role}</Badge>
              </UserName>
              <UserDetails>{user.email}</UserDetails>
              <UserDetails>Firma: {user.company}</UserDetails>
              <UserDetails>
                Status: {user.isVerified ? 'Verificiran' : 'Nije verificiran'}
              </UserDetails>
            </div>
            <ButtonGroup>
              <S.Button
                onClick={() => handleExportData(user)}
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
        <div style={{textAlign: 'center', marginTop: '2rem'}}>
          Nema pronađenih korisnika
        </div>
      )}
    </S.PageContainer>
  );
};

export default UserManagementPage;
