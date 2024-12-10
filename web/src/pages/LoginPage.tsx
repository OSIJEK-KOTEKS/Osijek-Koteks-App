// src/pages/LoginPage.tsx
import React, {useState} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {apiService} from '../utils/api';
import {
  Container,
  Card,
  Input,
  Button,
  ErrorMessage,
  Title,
} from '../components/styled/Common';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {signIn} = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const response = await apiService.login(email, password);
      await signIn(response.token);
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, {replace: true});
    } catch (err) {
      setError('Neispravni podaci za prijavu');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container as="main">
      <Card>
        <Title as="h1">Prijava</Title>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <form onSubmit={handleSubmit}>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Lozinka"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Prijava u tijeku...' : 'Prijavi se'}
          </Button>
        </form>
      </Card>
    </Container>
  );
};

export default LoginPage;
