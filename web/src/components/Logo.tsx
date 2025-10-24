import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const LogoContainer = styled.div`
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
`;

const LogoImage = styled.img`
  height: 50px;
  width: auto;
`;

const Logo: React.FC = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/dashboard');
  };

  return (
    <LogoContainer onClick={handleClick}>
      <LogoImage src="/images/logo.png" alt="Company Logo" />
    </LogoContainer>
  );
};

export default Logo;
