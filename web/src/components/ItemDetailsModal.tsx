import React from 'react';
import styled from 'styled-components';
import { Item } from '../types';
import { getImageUrl } from '../utils/api';
import { getFormattedCode } from '../utils/codeMapping';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  padding: 0.5rem;
  line-height: 1;

  &:hover {
    opacity: 0.7;
  }
`;

const ItemTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  font-size: 1.3rem;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
  padding-right: 2rem;
`;

const ItemDetail = styled.div`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.95rem;

  strong {
    font-weight: 600;
    margin-right: 0.5rem;
  }
`;

const StatusBadge = styled.span<{ status: Item['approvalStatus'] }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: ${({ status }) =>
    status === 'odobreno' ? '#e6f4ea' : status === 'odbijen' ? '#fce8e8' : '#fff3e0'};
  color: ${({ status }) =>
    status === 'odobreno' ? '#34a853' : status === 'odbijen' ? '#ea4335' : '#fbbc04'};
`;

const TransitBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: #e3f2fd;
  color: #1565c0;
  margin-left: 0.5rem;
`;

const PaidBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: #e8f5e9;
  color: #2e7d32;
  margin-left: 0.5rem;
  border: 1px solid #a5d6a7;
`;

const BadgeContainer = styled.div`
  margin: 1rem 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

interface ItemDetailsModalProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onImageClick?: (imageUrl: string) => void;
}

const formatDateAndTime = (date: string, time?: string) => {
  if (!date) return 'N/A';
  const dateStr = date;
  return time ? `${dateStr} ${time}` : dateStr;
};

const safeParseDate = (dateStr: string | Date | undefined) => {
  if (!dateStr) return 'N/A';
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return 'N/A';
  }
};

const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({ item, isOpen, onClose, onImageClick }) => {
  if (!isOpen || !item) return null;

  return (
    <ModalOverlay onMouseDown={onClose}>
      <ModalContent onMouseDown={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>&times;</CloseButton>

        <ItemTitle>{item.title}</ItemTitle>

        {item.createdBy && (
          <ItemDetail>
            <strong>Dobavljač:</strong>
            {typeof item.createdBy === 'object' && 'firstName' in item.createdBy
              ? `${item.createdBy.firstName} ${item.createdBy.lastName}`
              : 'N/A'}
          </ItemDetail>
        )}

        <ItemDetail>
          <strong>RN:</strong> {getFormattedCode(item.code)}
        </ItemDetail>

        {item.prijevoznik && (
          <ItemDetail>
            <strong>Prijevoznik:</strong> {item.prijevoznik}
          </ItemDetail>
        )}

        {item.registracija && (
          <ItemDetail>
            <strong>Registracija:</strong> {item.registracija}
          </ItemDetail>
        )}

        {item.tezina !== undefined && (
          <ItemDetail>
            <strong>Težina:</strong> {(item.tezina / 1000).toFixed(3)} t
          </ItemDetail>
        )}

        {item.tezina !== undefined &&
         item.transportAcceptanceId?.requestId?.isplataPoT !== undefined && (
          <ItemDetail>
            <strong>Isplata:</strong>{' '}
            {(item.transportAcceptanceId.requestId.isplataPoT * (item.tezina / 1000)).toFixed(2)} €
          </ItemDetail>
        )}

        <ItemDetail>
          <strong>Datum i vrijeme:</strong> {formatDateAndTime(item.creationDate, item.creationTime)}
        </ItemDetail>

        <BadgeContainer>
          <StatusBadge status={item.approvalStatus}>
            {item.approvalStatus === 'odobreno'
              ? 'Odobreno'
              : item.approvalStatus === 'odbijen'
              ? 'Odbijeno'
              : 'Na čekanju'}
          </StatusBadge>
          {item.in_transit && <TransitBadge>🚛 U tranzitu</TransitBadge>}
          {item.isPaid && <PaidBadge>Plaćen Prijevoz</PaidBadge>}
        </BadgeContainer>

        {item.approvalStatus === 'odobreno' && item.approvedBy && (
          <ItemDetail>
            <strong>Odobrio:</strong>{' '}
            {typeof item.approvedBy === 'object' && 'firstName' in item.approvedBy
              ? `${item.approvedBy.firstName} ${item.approvedBy.lastName}`
              : 'N/A'}
            {item.approvalDate && <> ({safeParseDate(item.approvalDate)})</>}
          </ItemDetail>
        )}

        {item.isPaid && (
          <ItemDetail>
            <strong>Plaćen Prijevoz:</strong> {item.paidAt ? safeParseDate(item.paidAt) : 'Nepoznato'}
            {item.paidBy &&
              typeof item.paidBy === 'object' &&
              'firstName' in item.paidBy && (
                <>
                  {' '}
                  | {item.paidBy.firstName} {item.paidBy.lastName}
                </>
              )}
          </ItemDetail>
        )}

        <ButtonGroup>
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

          {item.approvalPhotoFront?.url && (
            <ActionButton
              onClick={() => {
                const imageUrl = item.approvalPhotoFront?.url;
                if (imageUrl && onImageClick) {
                  onImageClick(getImageUrl(imageUrl));
                }
              }}>
              Registracija
            </ActionButton>
          )}

          {item.approvalPhotoBack?.url && (
            <ActionButton
              onClick={() => {
                const imageUrl = item.approvalPhotoBack?.url;
                if (imageUrl && onImageClick) {
                  onImageClick(getImageUrl(imageUrl));
                }
              }}>
              Materijal
            </ActionButton>
          )}

          {item.approvalLocation?.coordinates && (
            <ActionButton
              onClick={() => {
                const { latitude, longitude } = item.approvalLocation!.coordinates;
                window.open(
                  `https://www.google.com/maps?q=${latitude},${longitude}`,
                  '_blank'
                );
              }}
              style={{ backgroundColor: '#34a853' }}>
              📍 Lokacija
            </ActionButton>
          )}
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

export default ItemDetailsModal;
