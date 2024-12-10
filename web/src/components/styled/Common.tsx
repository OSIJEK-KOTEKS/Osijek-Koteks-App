// src/components/styled/Common.tsx
import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: ${({theme}) => theme.spacing.medium};
`;

export const Card = styled.div`
  background: ${({theme}) => theme.colors.white};
  padding: ${({theme}) => theme.spacing.large};
  border-radius: ${({theme}) => theme.borderRadius};
  box-shadow: ${({theme}) => theme.shadows.main};
  width: 100%;
  max-width: 400px;
`;

export const Input = styled.input`
  width: 100%;
  padding: ${({theme}) => theme.spacing.medium};
  border: 1px solid ${({theme}) => theme.colors.gray};
  border-radius: ${({theme}) => theme.borderRadius};
  font-size: 1rem;
  margin-bottom: ${({theme}) => theme.spacing.medium};

  &:focus {
    outline: none;
    border-color: ${({theme}) => theme.colors.primary};
  }
`;

interface ButtonProps {
  variant?: 'primary' | 'secondary';
}

export const Button = styled.button<ButtonProps>`
  width: 100%;
  padding: ${({theme}) => theme.spacing.medium};
  background-color: ${({theme, variant}) =>
    variant === 'secondary' ? theme.colors.gray : theme.colors.primary};
  color: ${({theme, variant}) =>
    variant === 'secondary' ? theme.colors.text : theme.colors.white};
  border: none;
  border-radius: ${({theme}) => theme.borderRadius};
  font-size: 1rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({theme, variant}) =>
      variant === 'secondary' ? theme.colors.gray : theme.colors.primaryDark};
  }

  &:disabled {
    background-color: ${({theme}) => theme.colors.disabled};
    cursor: not-allowed;
  }
`;

export const ErrorMessage = styled.div`
  color: ${({theme}) => theme.colors.error};
  margin-bottom: ${({theme}) => theme.spacing.medium};
  text-align: center;
  font-size: 0.875rem;
`;

export const Title = styled.h1`
  color: ${({theme}) => theme.colors.text};
  margin-bottom: ${({theme}) => theme.spacing.large};
  text-align: center;
  font-size: 1.5rem;
`;

export const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({theme}) => theme.spacing.large};
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({theme}) => theme.spacing.medium};
`;

interface FlexProps {
  gap?: string;
}

export const Flex = styled.div<FlexProps>`
  display: flex;
  gap: ${({gap, theme}) => gap || theme.spacing.medium};
`;
