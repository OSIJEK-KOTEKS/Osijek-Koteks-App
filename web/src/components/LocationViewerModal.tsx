import React from 'react';
import styled from 'styled-components';
import { Item } from '../types';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  position: relative;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const LocationInfo = styled.div`
  margin-top: 20px;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 8px;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: 4px;
`;

const Label = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const Value = styled.span`
  color: ${({ theme }) => theme.colors.primary};
  font-family: monospace;
`;

const Title = styled.h3`
  margin: 0 0 20px 0;
  color: ${({ theme }) => theme.colors.text};
`;

const MapLink = styled.a`
  display: block;
  text-align: center;
  margin-top: 20px;
  padding: 10px;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: 4px;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark};
  }
`;

interface LocationViewerModalProps {
  location: NonNullable<Item['approvalLocation']>;
  onClose: () => void;
  approvalDate?: string;
}

const LocationViewerModal: React.FC<LocationViewerModalProps> = ({
  location,
  onClose,
  approvalDate,
}) => {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getMapUrl = () => {
    const { latitude, longitude } = location.coordinates;
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  };

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        <CloseButton onClick={onClose}>&times;</CloseButton>
        <Title>Lokacija odobrenja</Title>

        <LocationInfo>
          {approvalDate && (
            <InfoRow>
              <Label>Datum odobrenja:</Label>
              <Value>{approvalDate}</Value>
            </InfoRow>
          )}

          <InfoRow>
            <Label>Geografska širina:</Label>
            <Value>{location.coordinates.latitude.toFixed(6)}°</Value>
          </InfoRow>

          <InfoRow>
            <Label>Geografska dužina:</Label>
            <Value>{location.coordinates.longitude.toFixed(6)}°</Value>
          </InfoRow>

          <InfoRow>
            <Label>Preciznost:</Label>
            <Value>{Math.round(location.accuracy)}m</Value>
          </InfoRow>

          {location.timestamp && (
            <InfoRow>
              <Label>Vrijeme:</Label>
              <Value>{new Date(location.timestamp).toLocaleString('hr-HR')}</Value>
            </InfoRow>
          )}
        </LocationInfo>

        <MapLink href={getMapUrl()} target="_blank" rel="noopener noreferrer">
          Otvori u Google Maps
        </MapLink>
      </ModalContent>
    </ModalOverlay>
  );
};

export default LocationViewerModal;
