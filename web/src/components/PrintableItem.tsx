import React from 'react';
import styled from 'styled-components';
import {Item} from '../types';
import {getImageUrl} from '../utils/api';

interface PrintableItemProps {
  item: Item;
}

const PrintContainer = styled.div`
  display: none;

  @media print {
    display: block;
    padding: 20px;
    max-width: 100%;
    margin: 0 auto;
    font-family: Arial, sans-serif;
    color: #000;
  }
`;

const Header = styled.div`
  margin-bottom: 30px;
  text-align: center;
  border-bottom: 2px solid #000;
  padding-bottom: 20px;
`;

const Logo = styled.img`
  height: 60px;
  margin-bottom: 10px;
`;

const Title = styled.h1`
  font-size: 24px;
  margin: 10px 0;
`;

const InfoSection = styled.div`
  margin-bottom: 20px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 20px;
`;

const InfoItem = styled.div`
  margin-bottom: 10px;
`;

const Label = styled.span`
  font-weight: bold;
  margin-right: 10px;
`;

const Value = styled.span`
  color: #333;
`;

const PhotosSection = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-top: 20px;
  page-break-inside: avoid;
`;

const PhotoContainer = styled.div`
  text-align: center;
`;

const Photo = styled.img`
  max-width: 100%;
  height: auto;
  margin-bottom: 10px;
  border: 1px solid #ccc;
`;

const PhotoCaption = styled.p`
  font-size: 14px;
  color: #666;
  margin: 5px 0;
`;

const LocationSection = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ccc;
  page-break-inside: avoid;
`;

const Footer = styled.div`
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #ccc;
  text-align: center;
  font-size: 12px;
  color: #666;
`;

const PrintableItem: React.FC<PrintableItemProps> = ({item}) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <PrintContainer>
      <Header>
        <Logo src="/images/logo.png" alt="Osijek-Koteks Logo" />
        <Title>Detalji dokumenta</Title>
      </Header>

      <InfoSection>
        <InfoGrid>
          <InfoItem>
            <Label>Naziv:</Label>
            <Value>{item.title}</Value>
          </InfoItem>
          <InfoItem>
            <Label>RN:</Label>
            <Value>{item.code}</Value>
          </InfoItem>
          {item.registracija && (
            <InfoItem>
              <Label>Registracija:</Label>
              <Value>{item.registracija}</Value>
            </InfoItem>
          )}
          <InfoItem>
            <Label>Datum kreiranja:</Label>
            <Value>
              {item.creationTime
                ? `${item.creationDate} ${item.creationTime}`
                : item.creationDate}
            </Value>
          </InfoItem>
          <InfoItem>
            <Label>Status:</Label>
            <Value>{item.approvalStatus}</Value>
          </InfoItem>
          {item.approvalStatus === 'odobreno' && (
            <>
              <InfoItem>
                <Label>Odobrio:</Label>
                <Value>
                  {item.approvedBy?.firstName} {item.approvedBy?.lastName}
                </Value>
              </InfoItem>
              <InfoItem>
                <Label>Datum odobrenja:</Label>
                <Value>{item.approvalDate}</Value>
              </InfoItem>
            </>
          )}
        </InfoGrid>
      </InfoSection>

      {item.approvalStatus === 'odobreno' && (
        <>
          {(item.approvalPhotoFront?.url || item.approvalPhotoBack?.url) && (
            <PhotosSection>
              {item.approvalPhotoFront?.url && (
                <PhotoContainer>
                  <Photo
                    src={getImageUrl(item.approvalPhotoFront.url)}
                    alt="Registracija"
                  />
                  <PhotoCaption>Registracija</PhotoCaption>
                </PhotoContainer>
              )}
              {item.approvalPhotoBack?.url && (
                <PhotoContainer>
                  <Photo
                    src={getImageUrl(item.approvalPhotoBack.url)}
                    alt="Materijal"
                  />
                  <PhotoCaption>Materijal</PhotoCaption>
                </PhotoContainer>
              )}
            </PhotosSection>
          )}

          {item.approvalLocation && (
            <LocationSection>
              <h3>Lokacija odobrenja</h3>
              <InfoGrid>
                <InfoItem>
                  <Label>Geografska širina:</Label>
                  <Value>
                    {item.approvalLocation.coordinates.latitude.toFixed(6)}°
                  </Value>
                </InfoItem>
                <InfoItem>
                  <Label>Geografska dužina:</Label>
                  <Value>
                    {item.approvalLocation.coordinates.longitude.toFixed(6)}°
                  </Value>
                </InfoItem>
                <InfoItem>
                  <Label>Preciznost:</Label>
                  <Value>{Math.round(item.approvalLocation.accuracy)}m</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Vrijeme:</Label>
                  <Value>
                    {new Date(item.approvalLocation.timestamp).toLocaleString(
                      'hr-HR',
                    )}
                  </Value>
                </InfoItem>
              </InfoGrid>
            </LocationSection>
          )}
        </>
      )}

      <Footer>
        <p>Ispisano: {new Date().toLocaleString('hr-HR')}</p>
        <p>© Osijek-Koteks d.d. Sva prava pridržana.</p>
      </Footer>
    </PrintContainer>
  );
};

export default PrintableItem;
