import React, {useState, FormEvent} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import styled from 'styled-components';
import {useAuth} from '../contexts/AuthContext';
import {apiService} from '../utils/api';

interface LocationState {
  from?: {
    pathname: string;
  };
}

// Styled Components
const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0rem 1.5rem;
  background-color: ${({theme}) => theme.colors.background};
`;

const ContentContainer = styled.div`
  width: 100%;
  max-width: 28rem;
  margin: 0 auto;
`;

const LogoContainer = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const Logo = styled.img`
  height: 80px;
  width: auto;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  text-align: center;
  color: ${({theme}) => theme.colors.text};
  margin-top: 1.5rem;
  margin-bottom: 2rem;
`;

const Card = styled.div`
  background: ${({theme}) => theme.colors.white};
  padding: 2rem;
  border-radius: ${({theme}) => theme.borderRadius};
  box-shadow: ${({theme}) => theme.shadows.main};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({theme}) => theme.colors.text};
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid ${({theme}) => theme.colors.gray};
  border-radius: ${({theme}) => theme.borderRadius};
  font-size: 1rem;
  transition: all 0.2s ease-in-out;

  &:focus {
    outline: none;
    border-color: ${({theme}) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({theme}) => theme.colors.primary}20;
  }
`;

const ErrorMessage = styled.div`
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: ${({theme}) => theme.borderRadius};
  font-size: 0.875rem;
`;

const Button = styled.button<{isLoading?: boolean}>`
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: ${({theme, isLoading}) =>
    isLoading ? theme.colors.disabled : theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({theme}) => theme.borderRadius};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: ${({isLoading}) => (isLoading ? 'not-allowed' : 'pointer')};
  transition: background-color 0.2s ease-in-out;

  &:hover:not(:disabled) {
    background-color: ${({theme}) => theme.colors.primaryDark};
  }

  &:disabled {
    opacity: 0.7;
  }
`;

const Divider = styled.div`
  position: relative;
  width: 100%;
  margin: 1.5rem 0;
  text-align: center;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background-color: ${({theme}) => theme.colors.gray};
  }

  span {
    position: relative;
    background-color: white;
    padding: 0 0.5rem;
    color: ${({theme}) => theme.colors.text};
    font-size: 0.875rem;
  }
`;

const ForgotPasswordButton = styled.button`
  background: none;
  border: none;
  color: ${({theme}) => theme.colors.primary};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease-in-out;

  &:hover {
    color: ${({theme}) => theme.colors.primaryDark};
  }
`;

const Footer = styled.div`
  text-align: center;
  margin-top: 2rem;
  color: ${({theme}) => theme.colors.text};
  font-size: 0.875rem;

  a {
    color: ${({theme}) => theme.colors.primary};
    text-decoration: none;
    transition: color 0.2s ease-in-out;

    &:hover {
      color: ${({theme}) => theme.colors.primaryDark};
    }
  }
`;

export default function LoginPage(): JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {signIn} = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const response = await apiService.login(email, password);
      await signIn(response.token, response.user);
      const locationState = location.state as LocationState;
      const from = locationState?.from?.pathname || '/dashboard';
      navigate(from, {replace: true});
    } catch (err) {
      console.error('Login error:', err);
      setError('Neispravni podaci za prijavu');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (): void => {
    alert('Kontaktirajte nas na: it@osijek-koteks.hr');
  };

  return (
    <PageContainer>
      <ContentContainer>
        <LogoContainer>
          <Logo src="/images/logo.png" alt="Osijek-Koteks Logo" />
          <Title>Prijava u sustav</Title>
        </LogoContainer>

        <Card>
          <Form onSubmit={handleSubmit}>
            {error && <ErrorMessage>{error}</ErrorMessage>}

            <FormGroup>
              <Label htmlFor="email">Email adresa</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                required
                autoComplete="email"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="password">Lozinka</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                required
                autoComplete="current-password"
              />
            </FormGroup>

            <Button
              type="submit"
              disabled={loading}
              isLoading={loading}
              id="login_button">
              {loading ? 'Prijava u tijeku...' : 'Prijavi se'}
            </Button>
          </Form>

          <Divider>
            <span>ili</span>
          </Divider>

          <div style={{textAlign: 'center'}}>
            <ForgotPasswordButton type="button" onClick={handleForgotPassword}>
              Zaboravili ste lozinku?
            </ForgotPasswordButton>
          </div>
        </Card>

        <Footer>
          <p>
            © {new Date().getFullYear()} Osijek-Koteks. Sva prava pridržana.
          </p>
          <p style={{marginTop: '0.5rem'}}>
            Za tehničku podršku kontaktirajte{' '}
            <a href="mailto:it@osijek-koteks.hr">it@osijek-koteks.hr</a>
          </p>
        </Footer>
      </ContentContainer>
    </PageContainer>
  );
}
