import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import * as S from '../components/styled/Common';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import NoviZahtjevModal from '../components/NoviZahtjevModal';
import EditZahtjevModal from '../components/EditZahtjevModal';
import ItemDetailsModal from '../components/ItemDetailsModal';
import ImageViewerModal from '../components/ImageViewerModal';
import { apiService } from '../utils/api';
import socket from '../utils/socket';
import { getCodeDescription, codeToTextMapping, getFormattedCode } from '../utils/codeMapping';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { Item } from '../types';
import { GoogleMap, useJsApiLoader, MarkerF, Autocomplete, Libraries } from '@react-google-maps/api';

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.large};
  width: 100%;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.medium};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.medium};

  & > button,
  & button {
    padding: 1.152rem 1.536rem !important;
    font-size: 0.935rem !important;
    width: auto;
    min-width: 0;
  }

  & > ${S.Button}, & ${S.Button} {
    padding: 1.152rem 1.536rem !important;
    font-size: 0.935rem !important;
    width: auto;
    min-width: 0;
  }
`;

const ToastContainer = styled.div`
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  pointer-events: none;
`;

const ToastItem = styled.div<{ $type: 'success' | 'error' }>`
  background: ${({ $type }) => ($type === 'success' ? '#28a745' : '#dc3545')};
  color: white;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 0.95rem;
  font-weight: 500;
  max-width: 360px;
  line-height: 1.4;
  animation: slideIn 0.3s ease;
  pointer-events: all;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const DashboardContainer = styled.div`
  background: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.main};
  padding: ${({ theme }) => theme.spacing.large};
`;

const ContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.large};
`;

const ContentTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
`;

const SmallButton = styled(S.Button)`
  padding: 0.5rem 1rem !important;
  font-size: 0.875rem !important;
  min-width: auto !important;
  width: auto !important;
  max-width: fit-content !important;
  position: relative;
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #dc3545;
  color: white;
  border-radius: 50%;
  min-width: 20px;
  height: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const ContentText = styled.p`
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.6;
`;

const ButtonSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing.large};
  display: flex;
  gap: ${({ theme }) => theme.spacing.medium};
`;

const RequestsContainer = styled(DashboardContainer)`
  margin-top: ${({ theme }) => theme.spacing.large};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: ${({ theme }) => theme.spacing.medium};
`;

const Th = styled.th`
  text-align: left;
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.colors.background};
  border-bottom: 2px solid ${({ theme }) => theme.colors.gray};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const Td = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.gray};
  color: ${({ theme }) => theme.colors.text};
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  display: inline-block;
  background-color: ${({ status }) => {
    switch (status) {
      case 'approved':
        return '#d4edda';
      case 'rejected':
        return '#f8d7da';
      case 'completed':
        return '#d1ecf1';
      case 'pending':
        return '#fef3cd';
      default:
        return '#e9ecef';
    }
  }};
  color: ${({ status }) => {
    switch (status) {
      case 'approved':
        return '#155724';
      case 'rejected':
        return '#721c24';
      case 'completed':
        return '#0c5460';
      case 'pending':
        return '#856404';
      default:
        return '#495057';
    }
  }};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${({ theme }) => theme.colors.gray};
`;

const CompletedTag = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: #28a745;
  color: white;
  margin-left: 0.5rem;
  white-space: nowrap;
`;

const ActionButton = styled.button`
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: white;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    color: white;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
`;

const DeleteButton = styled.button`
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  border: 1px solid #dc3545;
  background: white;
  color: #dc3545;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #dc3545;
    color: white;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const LocationPinButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 1rem;
  color: #e74c3c;
  vertical-align: middle;
  opacity: 0.8;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

const LocationPreviewOverlay = styled.div`
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
`;

const LocationPreviewCard = styled.div`
  background: white;
  border-radius: 10px;
  overflow: hidden;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
`;

const LocationPreviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
`;

const LocationPreviewTitle = styled.h3`
  margin: 0;
  font-size: 0.95rem;
  color: #333;
`;

const LocationPreviewCloseBtn = styled.button`
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #999;
  padding: 0;
  line-height: 1;

  &:hover {
    color: #333;
  }
`;

const LocationPreviewMapImg = styled.img`
  display: block;
  width: 100%;
  height: 200px;
  object-fit: cover;
`;

const LocationPreviewFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem 0.75rem;
  font-size: 0.8rem;
  color: #666;

  a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
`;

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
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  color: ${({ theme }) => theme.colors.text};
`;

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const UserItem = styled.div`
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: 4px;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text};
`;

const ModalCloseButton = styled.button`
  margin-top: 1.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  font-size: 1rem;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  width: 100%;

  &:hover {
    opacity: 0.9;
  }
`;

const RegistrationCheckbox = styled.div`
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.colors.gray};
  }

  input {
    margin-right: 0.75rem;
    cursor: pointer;
  }

  label {
    cursor: pointer;
    flex: 1;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const ModalButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  font-size: 1rem;
  flex: 1;
  background: ${({ variant, theme }) =>
    variant === 'primary' ? theme.colors.primary : '#6c757d'};
  color: white;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RequestInfo = styled.div`
  background-color: ${({ theme }) => theme.colors.background};
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const InfoValue = styled.span`
  color: ${({ theme }) => theme.colors.text};
`;

const RegistrationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 1rem;
`;

const SelectionSummary = styled.div`
  text-align: center;
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.colors.primary}20;
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 500;
  margin-bottom: 1rem;
`;

const AcceptancesSection = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background: ${({ theme }) => theme.colors.white};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.main};
`;

const AcceptancesTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.5rem;
`;

const AcceptanceCard = styled.div`
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.gray};
`;

const AcceptanceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
`;

const AcceptanceInfo = styled.div`
  flex: 1;
`;

const AcceptanceUser = styled.div`
  font-weight: 600;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: 0.5rem;
`;

const AcceptanceDetail = styled.div`
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
`;

const AcceptanceActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ApproveButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    background-color: #218838;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DeclineButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    background-color: #c82333;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RegistrationTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const RegistrationTag = styled.span<{ $hasApprovedItem?: boolean }>`
  padding: 0.25rem 0.5rem;
  background-color: ${({ $hasApprovedItem, theme }) =>
    $hasApprovedItem ? '#28a745' : theme.colors.gray};
  color: ${({ $hasApprovedItem }) =>
    $hasApprovedItem ? 'white' : 'inherit'};
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: ${({ $hasApprovedItem }) => ($hasApprovedItem ? 'pointer' : 'default')};
  transition: opacity 0.2s;

  &:hover {
    opacity: ${({ $hasApprovedItem }) => ($hasApprovedItem ? '0.8' : '1')};
  }
`;

const EmptyAcceptances = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${({ theme }) => theme.colors.gray};
  font-style: italic;
`;

const ExpandedRow = styled.tr`
  background-color: ${({ theme }) => theme.colors.background};
`;

const ExpandedCell = styled.td`
  padding: 1.5rem !important;
  border-bottom: 2px solid ${({ theme }) => theme.colors.gray};
`;

const AcceptancesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const AcceptanceItem = styled.div`
  background-color: white;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 8px;
  padding: 1rem;
`;

const AcceptanceItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const AcceptanceItemUser = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const AcceptanceItemStatus = styled.span<{ status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: ${({ status }) => {
    switch (status) {
      case 'approved':
        return '#d4edda';
      case 'declined':
        return '#f8d7da';
      case 'pending':
        return '#fff3cd';
      default:
        return '#e9ecef';
    }
  }};
  color: ${({ status }) => {
    switch (status) {
      case 'approved':
        return '#155724';
      case 'declined':
        return '#721c24';
      case 'pending':
        return '#856404';
      default:
        return '#495057';
    }
  }};
`;

const AcceptanceItemDetail = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text};
  margin: 0.25rem 0;
`;

const ClickableRow = styled.tr`
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.colors.background};
  }
`;

const ListaPrijevozaModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 95%;
  max-width: 900px;
  max-height: 85vh;
  overflow-y: auto;
`;

const ListaPrijevozaTitle = styled.h2`
  margin: 0 0 1.5rem 0;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ListaPrijevozaGroup = styled.div`
  margin-bottom: 1.5rem;
  border: 1px solid ${({ theme }) => theme.colors.gray};
  border-radius: 8px;
  overflow: hidden;
`;

const ListaPrijevozaGroupHeader = styled.div`
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  padding: 1rem;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark || '#1a5a96'};
  }
`;

const ListaPrijevozaItem = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.gray};
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ListaPrijevozaDetail = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
`;

const ListaPrijevozaLabel = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const ListaPrijevozaValue = styled.span`
  color: ${({ theme }) => theme.colors.text};
`;

const ListaPrijevozaStatus = styled.span<{ status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: ${({ status }) => {
    switch (status) {
      case 'approved':
        return '#d4edda';
      case 'declined':
        return '#f8d7da';
      case 'pending':
        return '#fff3cd';
      default:
        return '#e9ecef';
    }
  }};
  color: ${({ status }) => {
    switch (status) {
      case 'approved':
        return '#155724';
      case 'declined':
        return '#721c24';
      case 'pending':
        return '#856404';
      default:
        return '#495057';
    }
  }};
`;

const ListaPrijevozaEmpty = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${({ theme }) => theme.colors.gray};
  font-style: italic;
`;

const KarticaModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 95%;
  max-width: 500px;
`;

const KarticaFormGroup = styled.div`
  margin-bottom: 1.25rem;
`;

const KarticaLabel = styled.label`
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: ${({ theme }) => theme.colors.text};
`;


const KarticaSelectDropdown = styled.select`
  width: 100%;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 1rem;
  background-color: white;
  box-sizing: border-box;
`;

const MapSearchInput = styled.input`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const KarticaMonthRow = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const GroupCard = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 0.75rem;
  overflow: hidden;
`;

const GroupCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  background: #f8f9fa;

  &:hover {
    background: #eef0f2;
  }
`;

const GroupName = styled.span`
  font-weight: 600;
  font-size: 1rem;
`;

const GroupMemberCount = styled.span`
  font-size: 0.85rem;
  color: #666;
  margin-left: 0.5rem;
`;

const GroupDeleteBtn = styled.button`
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;

const GroupBody = styled.div`
  padding: 0.75rem 1rem;
  border-top: 1px solid #e0e0e0;
  max-height: 250px;
  overflow-y: auto;
`;

const GroupUserRow = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  cursor: pointer;
  font-size: 0.95rem;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const NewGroupRow = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
`;

const KarticaButtonRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  align-items: center;
`;

interface TransportRequest {
  _id: string;
  kamenolom: string;
  gradiliste: string;
  brojKamiona: number;
  prijevozNaDan: string;
  isplataPoT: number;
  status: string;
  createdAt: string;
  userEmail: string;
  assignedTo: 'All' | string[];
}

const KAMENOLOMI = ['VELIČKI KAMEN VELIČANKA', 'VELIČKI KAMEN VETOVO', 'KAMEN - PSUNJ', 'MOLARIS', 'PRODORINA'];
const OSIJEK_CENTER = { lat: 45.551, lng: 18.694 };
const MAP_CONTAINER_STYLE = { width: '100%', height: '350px', borderRadius: '8px' };
const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

const PrijevozPage: React.FC = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isLoaded: isMapLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignedUsersModalOpen, setIsAssignedUsersModalOpen] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<TransportRequest | null>(null);
  const [selectedRequestForUsers, setSelectedRequestForUsers] = useState<TransportRequest | null>(null);
  const [acceptingRequest, setAcceptingRequest] = useState<TransportRequest | null>(null);
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assignedUsers, setAssignedUsers] = useState<Array<{ _id: string; firstName: string; lastName: string }>>([]);
  const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>([]);
  const [acceptCount, setAcceptCount] = useState<number | ''>(1);
  const [pendingAcceptances, setPendingAcceptances] = useState<any[]>([]);
  const [isLoadingAcceptances, setIsLoadingAcceptances] = useState(false);
  const [isAcceptancesModalOpen, setIsAcceptancesModalOpen] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [requestAcceptances, setRequestAcceptances] = useState<any[]>([]);
  const [isLoadingRequestAcceptances, setIsLoadingRequestAcceptances] = useState(false);
  const [linkedItemsByAcceptance, setLinkedItemsByAcceptance] = useState<Map<string, { itemId: string; registration: string }[]>>(new Map());
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deliveredCountsByRequest, setDeliveredCountsByRequest] = useState<Map<string, { delivered: number; total: number }>>(new Map());
  const [isListaPrijevozaOpen, setIsListaPrijevozaOpen] = useState(false);
  const [userAcceptances, setUserAcceptances] = useState<any[]>([]);
  const [isLoadingUserAcceptances, setIsLoadingUserAcceptances] = useState(false);
  const [expandedListaDates, setExpandedListaDates] = useState<Set<string>>(new Set());
  const [isDriverListModalOpen, setIsDriverListModalOpen] = useState(false);
  const [driverListUsers, setDriverListUsers] = useState<Array<{ _id: string; firstName: string; lastName: string; email: string; company: string }>>([]);
  const [isLoadingDriverListUsers, setIsLoadingDriverListUsers] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedDriverName, setSelectedDriverName] = useState<string>('');
  const [driverAcceptances, setDriverAcceptances] = useState<any[]>([]);
  const [isLoadingDriverAcceptances, setIsLoadingDriverAcceptances] = useState(false);
  const [expandedDriverDates, setExpandedDriverDates] = useState<Set<string>>(new Set());
  const [isKarticaModalOpen, setIsKarticaModalOpen] = useState(false);
  const [karticaMonthNum, setKarticaMonthNum] = useState<number>(() => new Date().getMonth() + 1);
  const [karticaYear, setKarticaYear] = useState<number>(() => new Date().getFullYear());
  const [karticaCode, setKarticaCode] = useState<string>('');
  const [isGeneratingKartica, setIsGeneratingKartica] = useState(false);
  const [karticaUserId, setKarticaUserId] = useState<string>('');
  const [karticaUserName, setKarticaUserName] = useState<string>('');
  const [karticaUsers, setKarticaUsers] = useState<Array<{ _id: string; firstName: string; lastName: string; email: string; company: string }>>([]);
  const [isLoadingKarticaUsers, setIsLoadingKarticaUsers] = useState(false);

  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupUsers, setGroupUsers] = useState<Array<{ _id: string; firstName: string; lastName: string; email: string }>>([]);
  const [isLoadingGroupUsers, setIsLoadingGroupUsers] = useState(false);

  const [isLokacijaModalOpen, setIsLokacijaModalOpen] = useState(false);
  const [codeLocations, setCodeLocations] = useState<any[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [lokacijaSelectedCode, setLokacijaSelectedCode] = useState<string>('');
  const [lokacijaPin, setLokacijaPin] = useState<{ lat: number; lng: number } | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editingPin, setEditingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [createAutocomplete, setCreateAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [editAutocomplete, setEditAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [createMapRef, setCreateMapRef] = useState<google.maps.Map | null>(null);
  const [editMapRef, setEditMapRef] = useState<google.maps.Map | null>(null);

  const [locationPreview, setLocationPreview] = useState<{ title: string; lat: number; lng: number } | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' }>>([]);

  // Derive blocked request IDs — requests where user has an approved but incomplete acceptance
  const blockedRequestIds = React.useMemo(() => {
    const blocked = new Set<string>();
    for (const acceptance of userAcceptances) {
      if (
        acceptance.status === 'approved' &&
        typeof acceptance.deliveredCount === 'number' &&
        acceptance.deliveredCount < acceptance.acceptedCount
      ) {
        const requestId =
          typeof acceptance.requestId === 'object'
            ? acceptance.requestId._id
            : acceptance.requestId;
        if (requestId) blocked.add(String(requestId));
      }
    }
    return blocked;
  }, [userAcceptances]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const getStaticMapUrl = useCallback((lat: number, lng: number, width = 420, height = 200): string => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=13&size=${width}x${height}&scale=2&markers=color:red|${lat},${lng}&key=${apiKey}`;
  }, []);

  const findLocationForCode = useCallback((code: string) => {
    return codeLocations.find(loc => loc.code === code);
  }, [codeLocations]);

  const croatianMonths = [
    'Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj',
    'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac'
  ];

  const isAdmin = user?.role === 'admin';

  console.log('PrijevozPage - User:', user);
  console.log('PrijevozPage - isAdmin:', isAdmin);
  console.log('PrijevozPage - user.role:', user?.role);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error : ', err);
    }
  };

  const handleNavigateToDashboard = () => {
    navigate('/dashboard');
  };

  const fetchRequests = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const data = await apiService.getTransportRequests();

      // Filter requests based on user role and assignment
      let filteredData = data;
      if (user) {
        if (user.role === 'admin') {
          // Admin sees all requests
          filteredData = data;
        } else {
          // Regular user sees only requests assigned to "All" or containing their user ID
          filteredData = data.filter((request: TransportRequest) => {
            if (request.assignedTo === 'All') {
              return true;
            }
            if (Array.isArray(request.assignedTo)) {
              return request.assignedTo.includes(user._id);
            }
            return false;
          });
        }
      }

      setRequests(filteredData);

      // Fetch delivered counts for all requests
      const deliveredCountsMap = new Map<string, { delivered: number; total: number }>();
      for (const request of filteredData) {
        try {
          const counts = await apiService.getDeliveredCountForRequest(request._id);
          deliveredCountsMap.set(request._id, counts);
        } catch (error) {
          console.error(`Error fetching delivered count for request ${request._id}:`, error);
          deliveredCountsMap.set(request._id, { delivered: 0, total: 0 });
        }
      }
      setDeliveredCountsByRequest(deliveredCountsMap);
    } catch (error) {
      console.error('Error fetching transport requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([
      fetchRequests(),
      fetchPendingAcceptances(),
    ]);
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
      if (isAdmin) {
        fetchPendingAcceptances();
      } else {
        fetchUserAcceptances();
      }
      // Fetch code locations for all users (for map previews)
      apiService.getCodeLocations().then(locs => setCodeLocations(locs)).catch(e => console.error('Error loading code locations:', e));

      // Real-time updates via Socket.IO
      const handleTransportChange = () => {
        fetchRequests(true); // silent = no loading spinner
      };

      const handleAcceptanceChange = (data: any) => {
        handleTransportChange();
        if (isAdmin) {
          fetchPendingAcceptances();
        }

        // Show toast only to the user whose acceptance was reviewed
        const acceptanceUserId =
          data?.acceptance?.userId?._id || // approved branch (populated object)
          data?.userId;                     // declined branch (raw id)

        if (acceptanceUserId && user && String(acceptanceUserId) === String(user._id)) {
          const location = data?.acceptance?.requestId?.kamenolom ?? '';
          if (data?.acceptance?.status === 'approved') {
            showToast(
              `✅ Vaš zahtjev za prijevoz${location ? ` (${location})` : ''} je odobren!`,
              'success'
            );
            fetchUserAcceptances();
          } else if (data?.status === 'declined') {
            showToast(
              `❌ Vaš zahtjev za prijevoz${location ? ` (${location})` : ''} je odbijen.`,
              'error'
            );
            fetchUserAcceptances();
          }
        }
      };

      const handleItemApproved = () => {
        fetchRequests(true); // silent = no loading spinner
        if (expandedRequestId) {
          handleRequestClick(expandedRequestId);
        }
      };

      socket.on('transport:created', handleTransportChange);
      socket.on('transport:updated', handleTransportChange);
      socket.on('transport:deleted', handleTransportChange);
      socket.on('acceptance:updated', handleAcceptanceChange);
      socket.on('item:approved', handleItemApproved);

      return () => {
        socket.off('transport:created', handleTransportChange);
        socket.off('transport:updated', handleTransportChange);
        socket.off('transport:deleted', handleTransportChange);
        socket.off('acceptance:updated', handleAcceptanceChange);
        socket.off('item:approved', handleItemApproved);
      };
    }
  }, [user, isAdmin]);

  const handleSubmitZahtjev = async (data: {
    kamenolom: string;
    gradiliste: string;
    brojKamiona: number;
    prijevozNaDan: string;
    isplataPoT: number;
    assignedTo: 'All' | string[];
  }) => {
    try {
      console.log('Submitting transport request:', data);
      const response = await apiService.createTransportRequest({
        kamenolom: data.kamenolom,
        gradiliste: data.gradiliste,
        brojKamiona: data.brojKamiona,
        prijevozNaDan: data.prijevozNaDan,
        isplataPoT: data.isplataPoT,
        assignedTo: data.assignedTo,
      });
      console.log('Transport request created:', response);
      const assignLabel = data.assignedTo === 'All' ? 'sve prijevoznike' : `${data.assignedTo.length} prijevoznika`;
      alert(`Zahtjev uspješno kreiran za ${assignLabel}!\nKamenolom: ${data.kamenolom}\nGradilište: ${data.gradiliste}\nBroj kamiona: ${data.brojKamiona}\nDatum: ${data.prijevozNaDan}`);
      await fetchRequests();
    } catch (error) {
      console.error('Error creating transport request:', error);
      alert('Greška pri kreiranju zahtjeva. Molimo pokušajte ponovno.');
    }
  };

  const handleEditClick = (request: TransportRequest) => {
    setEditingRequest(request);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (data: {
    kamenolom: string;
    gradiliste: string;
    brojKamiona: number;
    prijevozNaDan: string;
    isplataPoT: number;
    status: string;
  }) => {
    if (!editingRequest) return;

    try {
      console.log('Updating transport request:', editingRequest._id, data);
      await apiService.updateTransportRequest(editingRequest._id, data);
      alert('Zahtjev uspješno ažuriran!');
      // Refresh the list after updating
      await fetchRequests();
      setIsEditModalOpen(false);
      setEditingRequest(null);
    } catch (error) {
      console.error('Error updating transport request:', error);
      alert('Greška pri ažuriranju zahtjeva. Molimo pokušajte ponovno.');
      throw error;
    }
  };

  const handleDeleteClick = async (request: TransportRequest) => {
    const confirmDelete = window.confirm(
      `Jeste li sigurni da želite obrisati zahtjev?\n\nKamenolom: ${request.kamenolom}\nGradilište: ${request.gradiliste}\nBroj kamiona: ${request.brojKamiona}\nDatum: ${request.prijevozNaDan}`
    );

    if (!confirmDelete) return;

    try {
      console.log('Deleting transport request:', request._id);
      await apiService.deleteTransportRequest(request._id);
      alert('Zahtjev uspješno obrisan!');
      // Refresh the list after deleting
      await fetchRequests();
    } catch (error) {
      console.error('Error deleting transport request:', error);
      alert('Greška pri brisanju zahtjeva. Molimo pokušajte ponovno.');
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Aktivno':
        return 'Aktivno';
      case 'Neaktivno':
        return 'Neaktivno';
      default:
        return status;
    }
  };

  const handleShowAssignedUsers = async (request: TransportRequest) => {
    if (request.assignedTo === 'All') return;

    try {
      setSelectedRequestForUsers(request);
      // Fetch user details for the assigned user IDs
      const userIds = request.assignedTo as string[];
      const userDetailsPromises = userIds.map(id => apiService.getUserById(id));
      const users = await Promise.all(userDetailsPromises);
      setAssignedUsers(users);
      setIsAssignedUsersModalOpen(true);
    } catch (error) {
      console.error('Error fetching assigned users:', error);
      alert('Greška pri učitavanju korisnika');
    }
  };

  // Extract first part of registration (same logic as RegistracijePage)
  const getFirstPartOfRegistration = (registration: string): string => {
    // Pattern 1: With spaces - "PŽ 995 FD", "SB 004 NP", "NA 224 O"
    const withSpaces = registration.match(/^([A-ZŠĐČĆŽ]+\s+\d+\s+[A-ZŠĐČĆŽ]{1,4})(?!\d)/i);
    if (withSpaces) return withSpaces[1];

    // Pattern 2: Without spaces - "NG341CP", "AB123CD"
    const withoutSpaces = registration.match(/^([A-ZŠĐČĆŽ]+\d+[A-ZŠĐČĆŽ]{1,4})(?!\d)/i);
    if (withoutSpaces) return withoutSpaces[1];

    // Fallback: return original if no pattern matches
    return registration;
  };

  // Get unique first parts of user's registrations
  const getUserUniqueRegistrations = (): string[] => {
    if (!user?.assignedRegistrations) return [];

    const firstParts = user.assignedRegistrations.map(reg => getFirstPartOfRegistration(reg));
    return Array.from(new Set(firstParts)).sort();
  };

  // Get all full registrations that match a first part
  const getFullRegistrationsForFirstPart = (firstPart: string): string[] => {
    if (!user?.assignedRegistrations) return [];

    return user.assignedRegistrations.filter(fullReg => {
      const fp = getFirstPartOfRegistration(fullReg);
      return fp === firstPart;
    });
  };

  const handleAcceptClick = (request: TransportRequest) => {
    setAcceptingRequest(request);
    setAcceptCount(1);
    setIsAcceptModalOpen(true);
  };

  const handleRegistrationToggle = (firstPartRegistration: string) => {
    setSelectedRegistrations(prev => {
      // Get all full registrations that match this first part
      const fullRegs = getFullRegistrationsForFirstPart(firstPartRegistration);

      // Check if any of the full registrations are already selected
      const isSelected = fullRegs.some(reg => prev.includes(reg));

      if (isSelected) {
        // Remove all full registrations that match this first part
        return prev.filter(r => !fullRegs.includes(r));
      } else {
        // Count how many unique first parts are currently selected
        const currentUniqueCount = getUserUniqueRegistrations().filter(fp => {
          const regs = getFullRegistrationsForFirstPart(fp);
          return regs.some(reg => prev.includes(reg));
        }).length;

        // Check if we have room (each unique first part = 1 truck)
        if (acceptingRequest && currentUniqueCount < acceptingRequest.brojKamiona) {
          // Add ALL full registrations that match this first part
          return [...prev, ...fullRegs];
        }

        return prev;
      }
    });
  };

  const handleAcceptSubmit = async () => {
    if (!acceptingRequest || !acceptCount || acceptCount < 1) return;

    try {
      await apiService.acceptTransportRequest(acceptingRequest._id, acceptCount as number);

      alert(
        `✅ Zahtjev uspješno poslan!\n\n` +
        `Detalji zahtjeva:\n` +
        `• Kamenolom: ${acceptingRequest.kamenolom}\n` +
        `• Gradilište: ${acceptingRequest.gradiliste}\n` +
        `• Datum prijevoza: ${acceptingRequest.prijevozNaDan}\n` +
        `• Isplata po t: ${acceptingRequest.isplataPoT}€\n` +
        `• Rezervirano prijevoza: ${acceptCount}\n\n` +
        `Status: Čeka se odobrenje administratora.`
      );

      setIsAcceptModalOpen(false);
      setAcceptingRequest(null);
      setAcceptCount(1);
      await fetchRequests();
      await fetchUserAcceptances();
    } catch (error: any) {
      console.error('Error accepting request:', error);
      const serverMessage = error?.response?.data?.message;
      alert(serverMessage ?? 'Greška pri prihvaćanju zahtjeva. Molimo pokušajte ponovno.');
    }
  };

  const fetchPendingAcceptances = async () => {
    try {
      setIsLoadingAcceptances(true);
      const acceptances = await apiService.getPendingAcceptances();
      setPendingAcceptances(acceptances);

      // Fetch linked items for each acceptance
      const itemsMap = new Map(linkedItemsByAcceptance);
      for (const acceptance of acceptances) {
        try {
          const { linkedItems } = await apiService.getApprovedRegistrationsForAcceptance(acceptance._id);
          itemsMap.set(acceptance._id, linkedItems);
        } catch (error) {
          console.error(`Error fetching linked items for acceptance ${acceptance._id}:`, error);
          itemsMap.set(acceptance._id, []);
        }
      }
      setLinkedItemsByAcceptance(itemsMap);
    } catch (error) {
      console.error('Error fetching pending acceptances:', error);
    } finally {
      setIsLoadingAcceptances(false);
    }
  };

  const handleApproveAcceptance = async (acceptanceId: string) => {
    try {
      await apiService.reviewAcceptance(acceptanceId, 'approved');
      alert('Zahtjev odobren!');
      await fetchPendingAcceptances();
      // Small delay to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchRequests();
    } catch (error) {
      console.error('Error approving acceptance:', error);
      alert('Greška pri odobravanju zahtjeva.');
    }
  };

  const handleDeclineAcceptance = async (acceptanceId: string) => {
    try {
      await apiService.reviewAcceptance(acceptanceId, 'declined');
      alert('Zahtjev odbijen!');
      await fetchPendingAcceptances();
    } catch (error) {
      console.error('Error declining acceptance:', error);
      alert('Greška pri odbijanju zahtjeva.');
    }
  };

  const handleRequestClick = async (requestId: string) => {
    if (expandedRequestId === requestId) {
      // Collapse if already expanded
      setExpandedRequestId(null);
      setRequestAcceptances([]);
    } else {
      // Expand and fetch acceptances for this request
      setExpandedRequestId(requestId);
      setIsLoadingRequestAcceptances(true);
      try {
        const acceptances = await apiService.getAcceptancesForRequest(requestId);

        // Backend already filters by userId for non-admin users
        setRequestAcceptances(acceptances);

        // Fetch linked items for each acceptance
        const itemsMap = new Map(linkedItemsByAcceptance);
        for (const acceptance of acceptances) {
          try {
            const { linkedItems } = await apiService.getApprovedRegistrationsForAcceptance(acceptance._id);
            itemsMap.set(acceptance._id, linkedItems);
          } catch (error) {
            console.error(`Error fetching linked items for acceptance ${acceptance._id}:`, error);
            itemsMap.set(acceptance._id, []);
          }
        }
        setLinkedItemsByAcceptance(itemsMap);
      } catch (error) {
        console.error('Error fetching acceptances for request:', error);
        setRequestAcceptances([]);
      } finally {
        setIsLoadingRequestAcceptances(false);
      }
    }
  };

  const handleRegistrationClick = async (itemId: string) => {
    try {
      const item = await apiService.getTransportItemById(itemId);
      setSelectedItem(item);
      setIsItemModalOpen(true);
    } catch (error) {
      console.error('Error fetching item details:', error);
      alert('Greška pri učitavanju stavke.');
    }
  };

  // Fetch user's own acceptances for "Lista prijevoza"
  const fetchUserAcceptances = async () => {
    try {
      setIsLoadingUserAcceptances(true);
      const acceptances = await apiService.getUserAcceptances();
      setUserAcceptances(acceptances);

      // Fetch linked items for each acceptance
      const itemsMap = new Map(linkedItemsByAcceptance);
      for (const acceptance of acceptances) {
        try {
          const { linkedItems } = await apiService.getApprovedRegistrationsForAcceptance(acceptance._id);
          itemsMap.set(acceptance._id, linkedItems);
        } catch (error) {
          console.error(`Error fetching linked items for acceptance ${acceptance._id}:`, error);
          itemsMap.set(acceptance._id, []);
        }
      }
      setLinkedItemsByAcceptance(itemsMap);
    } catch (error) {
      console.error('Error fetching user acceptances:', error);
    } finally {
      setIsLoadingUserAcceptances(false);
    }
  };

  const handleOpenListaPrijevoza = () => {
    setIsListaPrijevozaOpen(true);
    fetchUserAcceptances();
  };

  // Open the "Lista prijevoza po prijevozniku" modal (admin only)
  const handleOpenDriverListModal = async () => {
    setIsDriverListModalOpen(true);
    setSelectedDriverId(null);
    setSelectedDriverName('');
    setDriverAcceptances([]);
    setExpandedDriverDates(new Set());
    setIsLoadingDriverListUsers(true);
    try {
      const users = await apiService.getUsersWithPrijevozAccess();
      setDriverListUsers(users as any);
    } catch (error) {
      console.error('Error fetching driver users:', error);
    } finally {
      setIsLoadingDriverListUsers(false);
    }
  };

  // When admin selects a driver, fetch their acceptances
  const handleSelectDriver = async (driverId: string, driverName: string) => {
    setSelectedDriverId(driverId);
    setSelectedDriverName(driverName);
    setExpandedDriverDates(new Set());
    setIsLoadingDriverAcceptances(true);
    try {
      const acceptances = await apiService.getAcceptancesByUserId(driverId);
      setDriverAcceptances(acceptances);

      // Fetch linked items for each acceptance
      const itemsMap = new Map(linkedItemsByAcceptance);
      for (const acceptance of acceptances) {
        try {
          const { linkedItems } = await apiService.getApprovedRegistrationsForAcceptance(acceptance._id);
          itemsMap.set(acceptance._id, linkedItems);
        } catch (error) {
          console.error(`Error fetching linked items for acceptance ${acceptance._id}:`, error);
          itemsMap.set(acceptance._id, []);
        }
      }
      setLinkedItemsByAcceptance(itemsMap);
    } catch (error) {
      console.error('Error fetching driver acceptances:', error);
    } finally {
      setIsLoadingDriverAcceptances(false);
    }
  };

  // Group acceptances by date for better organization
  const groupAcceptancesByDate = (acceptances: any[]) => {
    const grouped: { [key: string]: any[] } = {};

    acceptances.forEach(acceptance => {
      const date = acceptance.requestId?.prijevozNaDan || 'Nepoznat datum';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(acceptance);
    });

    // Sort dates (newest first)
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      if (a === 'Nepoznat datum') return 1;
      if (b === 'Nepoznat datum') return -1;
      return new Date(b).getTime() - new Date(a).getTime();
    });

    return sortedDates.map(date => ({
      date,
      acceptances: grouped[date]
    }));
  };

  const getAcceptanceStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Odobreno';
      case 'declined':
        return 'Odbijeno';
      case 'pending':
        return 'Na čekanju';
      default:
        return status;
    }
  };

  const toAscii = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x00-\x7F]/g, '');

  const handleLoadKarticaUsers = async () => {
    if (isAdmin && karticaUsers.length === 0) {
      setIsLoadingKarticaUsers(true);
      try {
        const users = await apiService.getUsersWithPrijevozAccess();
        setKarticaUsers(users as any);
      } catch (error) {
        console.error('Error loading kartica users:', error);
      } finally {
        setIsLoadingKarticaUsers(false);
      }
    }
  };

  const handleGenerateKartica = async () => {
    if (!karticaMonthNum || !karticaYear || !karticaCode) {
      alert('Molimo odaberite mjesec i šifru.');
      return;
    }
    if (isAdmin && !karticaUserId) {
      alert('Molimo odaberite prijevoznika.');
      return;
    }

    setIsGeneratingKartica(true);
    try {
      // Fetch acceptances: admin fetches for selected user, regular user fetches own
      const acceptances = isAdmin
        ? await apiService.getAcceptancesByUserId(karticaUserId)
        : await apiService.getUserAcceptances();

      const selectedYear = karticaYear;
      const selectedMonth = karticaMonthNum;

      // Filter acceptances by month and code
      // prijevozNaDan is stored as "dd/MM/yyyy" format (e.g. "13/02/2026")
      const filtered = acceptances.filter((acc: any) => {
        const dateStr = acc.requestId?.prijevozNaDan;
        if (!dateStr) return false;
        const dateParts = dateStr.split('/');
        if (dateParts.length !== 3) return false;
        const dateMonth = parseInt(dateParts[1]);
        const dateYear = parseInt(dateParts[2]);
        if (dateYear !== selectedYear || dateMonth !== selectedMonth) return false;
        if (acc.requestId?.gradiliste !== karticaCode) return false;
        if (acc.status !== 'approved') return false;
        return true;
      });

      if (filtered.length === 0) {
        alert('Nema prijevoza za odabrani mjesec i šifru.');
        setIsGeneratingKartica(false);
        return;
      }

      // Fetch linked items for each filtered acceptance
      const acceptancesWithItems = await Promise.all(
        filtered.map(async (acc: any) => {
          try {
            const { linkedItems } = await apiService.getApprovedRegistrationsForAcceptance(acc._id);
            return { ...acc, linkedItems };
          } catch {
            return { ...acc, linkedItems: [] };
          }
        })
      );

      // Generate PDF
      const PAGE_WIDTH = 595.28;
      const PAGE_HEIGHT = 841.89;
      const MARGIN = 40;

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let y = PAGE_HEIGHT - MARGIN;

      const addNewPage = () => {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      };

      const checkPageBreak = (needed: number) => {
        if (y < MARGIN + needed) {
          addNewPage();
        }
      };

      const monthNames = [
        'Sijecanj', 'Veljaca', 'Ozujak', 'Travanj', 'Svibanj', 'Lipanj',
        'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac'
      ];

      // --- Company header with logo ---
      try {
        const logoResponse = await fetch('/images/logo.png');
        const logoBytes = await logoResponse.arrayBuffer();
        const logoImage = await pdfDoc.embedPng(logoBytes);
        const logoHeight = 50;
        const logoWidth = logoImage.width * (logoHeight / logoImage.height);
        page.drawImage(logoImage, {
          x: MARGIN,
          y: y - logoHeight + 12,
          width: logoWidth,
          height: logoHeight,
        });

        // Company info next to logo
        const infoX = MARGIN + logoWidth + 15;
        page.drawText('Osijek-Koteks d.d.', { x: infoX, y, size: 11, font: boldFont });
        page.drawText(toAscii('Samacka 11, 31000 Osijek, Hrvatska'), { x: infoX, y: y - 14, size: 9, font });
        page.drawText('Tel: +385 31 227 700 | Fax: +385 31 227 777', { x: infoX, y: y - 26, size: 9, font });
        page.drawText('Email: info@osijek-koteks.hr | Web: www.osijek-koteks.hr', { x: infoX, y: y - 38, size: 9, font });
      } catch {
        // If logo fails, just print company name
        page.drawText('Osijek-Koteks d.d.', { x: MARGIN, y, size: 12, font: boldFont });
        page.drawText(toAscii('Samacka 11, 31000 Osijek, Hrvatska'), { x: MARGIN, y: y - 14, size: 9, font });
      }
      y -= 60;

      // Separator line
      page.drawLine({
        start: { x: MARGIN, y: y + 4 },
        end: { x: PAGE_WIDTH - MARGIN, y: y + 4 },
        thickness: 1.5,
      });
      y -= 16;

      // Title
      const title = toAscii(`Kartica prijevoza - ${monthNames[selectedMonth - 1]} ${selectedYear}`);
      page.drawText(title, { x: MARGIN, y, size: 16, font: boldFont });
      y -= 24;

      // Code info
      const codeInfo = toAscii(`Sifra: ${getFormattedCode(karticaCode)}`);
      page.drawText(codeInfo, { x: MARGIN, y, size: 11, font });
      y -= 18;

      // User info
      const displayName = isAdmin ? karticaUserName : `${user?.firstName || ''} ${user?.lastName || ''}`;
      const userName = toAscii(`Prijevoznik: ${displayName}`);
      page.drawText(userName, { x: MARGIN, y, size: 11, font });
      y -= 24;

      // Table header
      const colX = [MARGIN, MARGIN + 65, MARGIN + 145, MARGIN + 235, MARGIN + 315, MARGIN + 380, MARGIN + 440];
      const headers = ['Datum', 'Br. otpremnice', 'Kamenolom', 'Registracija', 'Neto (kg)', 'Isplata/t', 'Ukupno'];

      // Draw header background
      page.drawRectangle({
        x: MARGIN - 2,
        y: y - 4,
        width: PAGE_WIDTH - 2 * MARGIN + 4,
        height: 16,
        color: { type: 'RGB', red: 0.9, green: 0.9, blue: 0.9 } as any,
      });

      headers.forEach((h, i) => {
        page.drawText(toAscii(h), { x: colX[i], y, size: 9, font: boldFont });
      });
      y -= 20;

      // Helper to truncate text so it fits within a given max width
      const truncateText = (text: string, maxWidth: number, fontSize: number, usedFont: typeof font) => {
        let t = toAscii(text);
        let width = usedFont.widthOfTextAtSize(t, fontSize);
        if (width <= maxWidth) return t;
        while (t.length > 0 && width > maxWidth) {
          t = t.slice(0, -1);
          width = usedFont.widthOfTextAtSize(t + '..', fontSize);
        }
        return t + '..';
      };

      let grandTotalPayout = 0;
      let totalNeto = 0;

      // Sort acceptances by date (prijevozNaDan is "dd/MM/yyyy")
      const parseDDMMYYYY = (s: string) => {
        const parts = s.split('/');
        if (parts.length !== 3) return 0;
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
      };
      const sorted = [...acceptancesWithItems].sort((a, b) => {
        const dateA = parseDDMMYYYY(a.requestId?.prijevozNaDan || '');
        const dateB = parseDDMMYYYY(b.requestId?.prijevozNaDan || '');
        return dateA - dateB;
      });

      for (const acc of sorted) {
        // prijevozNaDan is already in "dd/MM/yyyy" format - use directly
        const dateStr = acc.requestId?.prijevozNaDan || '-';
        const kamenolom = acc.requestId?.kamenolom || '-';
        const isplataPoT = acc.requestId?.isplataPoT || 0;

        if (acc.linkedItems && acc.linkedItems.length > 0) {
          for (const linkedItem of acc.linkedItems) {
            checkPageBreak(16);

            // Fetch item details to get neto weight and title
            let netoKg = 0;
            let itemTitle = '-';
            try {
              const itemDetails = await apiService.getTransportItemById(linkedItem.itemId);
              netoKg = itemDetails.neto || 0;
              itemTitle = itemDetails.title || '-';
            } catch {
              // skip
            }

            const itemPayout = isplataPoT * (netoKg / 1000);
            grandTotalPayout += itemPayout;
            totalNeto += netoKg;

            page.drawText(toAscii(dateStr), { x: colX[0], y, size: 8, font });
            page.drawText(truncateText(itemTitle, colX[2] - colX[1] - 4, 8, font), { x: colX[1], y, size: 8, font });
            page.drawText(toAscii(kamenolom), { x: colX[2], y, size: 8, font });
            page.drawText(toAscii(linkedItem.registration || '-'), { x: colX[3], y, size: 8, font });
            page.drawText(toAscii(netoKg.toString()), { x: colX[4], y, size: 8, font });
            page.drawText(toAscii(`${isplataPoT} EUR`), { x: colX[5], y, size: 8, font });
            page.drawText(toAscii(`${itemPayout.toFixed(2)} EUR`), { x: colX[6], y, size: 8, font });
            y -= 14;
          }
        } else {
          checkPageBreak(16);
          page.drawText(toAscii(dateStr), { x: colX[0], y, size: 8, font });
          page.drawText(toAscii('-'), { x: colX[1], y, size: 8, font });
          page.drawText(toAscii(kamenolom), { x: colX[2], y, size: 8, font });
          page.drawText(toAscii('-'), { x: colX[3], y, size: 8, font });
          page.drawText(toAscii('0'), { x: colX[4], y, size: 8, font });
          page.drawText(toAscii(`${isplataPoT} EUR`), { x: colX[5], y, size: 8, font });
          page.drawText(toAscii('0.00 EUR'), { x: colX[6], y, size: 8, font });
          y -= 14;
        }
      }

      // Summary line
      checkPageBreak(40);
      y -= 10;

      // Draw separator line
      page.drawLine({
        start: { x: MARGIN, y: y + 6 },
        end: { x: PAGE_WIDTH - MARGIN, y: y + 6 },
        thickness: 1,
      });
      y -= 8;

      page.drawText(toAscii('UKUPNO:'), { x: MARGIN, y, size: 10, font: boldFont });
      page.drawText(toAscii(`${totalNeto} kg`), { x: colX[4], y, size: 10, font: boldFont });
      page.drawText(toAscii(`${grandTotalPayout.toFixed(2)} EUR`), { x: colX[6], y, size: 10, font: boldFont });

      // Save and download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileNameUser = isAdmin ? `_${karticaUserName.replace(/\s+/g, '_')}` : '';
      link.download = toAscii(`Kartica_${monthNames[selectedMonth - 1]}_${selectedYear}_${karticaCode}${fileNameUser}.pdf`);
      link.click();
      URL.revokeObjectURL(url);

      setIsKarticaModalOpen(false);
    } catch (error) {
      console.error('Error generating kartica:', error);
      alert('Greška pri generiranju kartice.');
    } finally {
      setIsGeneratingKartica(false);
    }
  };

  const handleOpenLokacijaModal = async () => {
    setIsLokacijaModalOpen(true);
    setIsLoadingLocations(true);
    try {
      const locations = await apiService.getCodeLocations();
      setCodeLocations(locations);
    } catch (error) {
      console.error('Error loading code locations:', error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      if (editingLocationId) {
        setEditingPin({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      } else {
        setLokacijaPin({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      }
    }
  }, [editingLocationId]);

  const onCreateAutocompleteLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    setCreateAutocomplete(autocomplete);
  }, []);

  const onCreatePlaceChanged = useCallback(() => {
    if (createAutocomplete) {
      const place = createAutocomplete.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setLokacijaPin({ lat, lng });
        if (createMapRef) {
          createMapRef.panTo({ lat, lng });
          createMapRef.setZoom(15);
        }
      }
    }
  }, [createAutocomplete, createMapRef]);

  const onEditAutocompleteLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    setEditAutocomplete(autocomplete);
  }, []);

  const onEditPlaceChanged = useCallback(() => {
    if (editAutocomplete) {
      const place = editAutocomplete.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setEditingPin({ lat, lng });
        if (editMapRef) {
          editMapRef.panTo({ lat, lng });
          editMapRef.setZoom(15);
        }
      }
    }
  }, [editAutocomplete, editMapRef]);

  const handleSaveCodeLocation = async () => {
    if (!lokacijaSelectedCode || !lokacijaPin) return;
    try {
      await apiService.saveCodeLocation(lokacijaSelectedCode, lokacijaPin.lat, lokacijaPin.lng);
      const updated = await apiService.getCodeLocations();
      setCodeLocations(updated);
      setLokacijaSelectedCode('');
      setLokacijaPin(null);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Greška pri spremanju lokacije.');
    }
  };

  const handleStartEditLocation = (loc: any) => {
    setEditingLocationId(loc._id);
    setEditingPin({ lat: loc.latitude, lng: loc.longitude });
  };

  const handleSaveEditLocation = async (id: string) => {
    if (!editingPin) return;
    try {
      await apiService.updateCodeLocation(id, editingPin.lat, editingPin.lng);
      const updated = await apiService.getCodeLocations();
      setCodeLocations(updated);
      setEditingLocationId(null);
      setEditingPin(null);
    } catch (error) {
      alert('Greška pri ažuriranju lokacije.');
    }
  };

  const handleDeleteCodeLocation = async (id: string) => {
    if (!window.confirm('Jeste li sigurni da želite obrisati ovu lokaciju?')) return;
    try {
      await apiService.deleteCodeLocation(id);
      setCodeLocations(codeLocations.filter(l => l._id !== id));
    } catch (error) {
      alert('Greška pri brisanju lokacije.');
    }
  };

  const handleOpenGroupsModal = async () => {
    setIsGroupsModalOpen(true);
    setIsLoadingGroups(true);
    try {
      const [fetchedGroups, fetchedUsers] = await Promise.all([
        apiService.getGroups(),
        apiService.getUsersWithPrijevozAccess(),
      ]);
      setGroups(fetchedGroups);
      setGroupUsers(fetchedUsers as any);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setIsLoadingGroups(false);
      setIsLoadingGroupUsers(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await apiService.createGroup(newGroupName.trim());
      setNewGroupName('');
      const updatedGroups = await apiService.getGroups();
      setGroups(updatedGroups);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Greška pri kreiranju grupe.');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Jeste li sigurni da želite obrisati ovu grupu?')) return;
    try {
      await apiService.deleteGroup(groupId);
      setGroups(groups.filter(g => g._id !== groupId));
      if (expandedGroupId === groupId) setExpandedGroupId(null);
    } catch (error) {
      alert('Greška pri brisanju grupe.');
    }
  };

  const handleToggleGroupUser = async (groupId: string, userId: string) => {
    const group = groups.find(g => g._id === groupId);
    if (!group) return;
    const currentUserIds = group.users.map((u: any) => u._id);
    const newUserIds = currentUserIds.includes(userId)
      ? currentUserIds.filter((id: string) => id !== userId)
      : [...currentUserIds, userId];
    try {
      const updatedGroup = await apiService.updateGroupUsers(groupId, newUserIds);
      setGroups(groups.map(g => g._id === groupId ? updatedGroup : g));
    } catch (error) {
      alert('Greška pri ažuriranju članova grupe.');
    }
  };

  return (
    <S.PageContainer>
      <ToastContainer>
        {toasts.map(toast => (
          <ToastItem key={toast.id} $type={toast.type}>
            {toast.message}
          </ToastItem>
        ))}
      </ToastContainer>
      <Header>
        <HeaderLeft>
          <Logo />
        </HeaderLeft>
        <HeaderActions>
          <S.Button onClick={handleNavigateToDashboard}>Početna</S.Button>
          <S.Button onClick={handleLogout}>Odjava</S.Button>
        </HeaderActions>
      </Header>

      <DashboardContainer>
        <ContentHeader>
          {isAdmin ? (
            <ButtonSection>
              <SmallButton onClick={async () => { setIsModalOpen(true); if (codeLocations.length === 0) { try { const locs = await apiService.getCodeLocations(); setCodeLocations(locs); } catch (e) { console.error('Error loading code locations:', e); } } }}>Novi zahtjev</SmallButton>
              <SmallButton onClick={handleOpenDriverListModal}>
                Lista prijevoza po prijevozniku
              </SmallButton>
              <SmallButton onClick={() => { setIsKarticaModalOpen(true); handleLoadKarticaUsers(); }}>
                Ispiši karticu
              </SmallButton>
              <SmallButton onClick={() => setIsAcceptancesModalOpen(true)}>
                Zahtjevi prijevoznika
                {pendingAcceptances.length > 0 && (
                  <NotificationBadge>{pendingAcceptances.length}</NotificationBadge>
                )}
              </SmallButton>
              <SmallButton onClick={handleOpenGroupsModal}>Grupe</SmallButton>
              <SmallButton onClick={handleOpenLokacijaModal}>Lokacija</SmallButton>
              <SmallButton onClick={handleRefresh}>Osvježi</SmallButton>
            </ButtonSection>
          ) : (
            <ButtonSection>
              <SmallButton onClick={handleOpenListaPrijevoza}>Lista prijevoza</SmallButton>
              <SmallButton onClick={() => setIsKarticaModalOpen(true)}>Ispiši karticu</SmallButton>
              <SmallButton onClick={handleRefresh}>Osvježi</SmallButton>
            </ButtonSection>
          )}
        </ContentHeader>
      </DashboardContainer>

      <RequestsContainer>
        <ContentTitle>Popis zahtjeva</ContentTitle>
        {isLoading ? (
          <EmptyState>Učitavanje...</EmptyState>
        ) : requests.length === 0 ? (
          <EmptyState>Nema zahtjeva za prikaz</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Datum</Th>
                <Th>Kamenolom</Th>
                <Th>Gradilište</Th>
                <Th>Broj dostupnih prijevoza</Th>
                {isAdmin && <Th>Dovezeni prijevozi</Th>}
                <Th>Prijevoz na dan</Th>
                <Th>Isplata po toni</Th>
                <Th>Status</Th>
                <Th>Prijevoznici</Th>
                <Th>Akcije</Th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <React.Fragment key={request._id}>
                  {isAdmin ? (
                    <ClickableRow onClick={() => handleRequestClick(request._id)}>
                      <Td>{new Date(request.createdAt).toLocaleDateString('hr-HR')}</Td>
                      <Td>
                        {request.kamenolom}
                        {findLocationForCode(request.kamenolom) && (
                          <LocationPinButton
                            title="Prikaži lokaciju"
                            onClick={(e) => {
                              e.stopPropagation();
                              const loc = findLocationForCode(request.kamenolom)!;
                              setLocationPreview({ title: request.kamenolom, lat: loc.latitude, lng: loc.longitude });
                            }}
                          >
                            📍
                          </LocationPinButton>
                        )}
                      </Td>
                      <Td>
                        {getCodeDescription(request.gradiliste)}
                        {findLocationForCode(request.gradiliste) && (
                          <LocationPinButton
                            title="Prikaži lokaciju"
                            onClick={(e) => {
                              e.stopPropagation();
                              const loc = findLocationForCode(request.gradiliste)!;
                              setLocationPreview({ title: `${request.gradiliste} - ${getCodeDescription(request.gradiliste)}`, lat: loc.latitude, lng: loc.longitude });
                            }}
                          >
                            📍
                          </LocationPinButton>
                        )}
                      </Td>
                      <Td>{request.brojKamiona}</Td>
                      <Td>
                        {(() => {
                          const counts = deliveredCountsByRequest.get(request._id);
                          return counts ? `${counts.delivered}/${counts.total}` : '0/0';
                        })()}
                      </Td>
                      <Td>{request.prijevozNaDan}</Td>
                      <Td>{request.isplataPoT} €</Td>
                      <Td>
                        <StatusBadge status={request.status === 'Aktivno' ? 'approved' : 'rejected'}>
                          {getStatusLabel(request.status)}
                        </StatusBadge>
                      </Td>
                      <Td>
                        {request.assignedTo === 'All' ? (
                          'Svi'
                        ) : (
                          <ActionButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowAssignedUsers(request);
                            }}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            Prikaži prijevoznike
                          </ActionButton>
                        )}
                      </Td>
                      <Td>
                        <ActionButtons>
                          <ActionButton onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(request);
                          }}>
                            Uredi
                          </ActionButton>
                          <DeleteButton onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(request);
                          }}>
                            Obriši
                          </DeleteButton>
                        </ActionButtons>
                      </Td>
                    </ClickableRow>
                  ) : (
                    <ClickableRow onClick={() => handleRequestClick(request._id)}>
                      <Td>{new Date(request.createdAt).toLocaleDateString('hr-HR')}</Td>
                      <Td>
                        {request.kamenolom}
                        {findLocationForCode(request.kamenolom) && (
                          <LocationPinButton
                            title="Prikaži lokaciju"
                            onClick={(e) => {
                              e.stopPropagation();
                              const loc = findLocationForCode(request.kamenolom)!;
                              setLocationPreview({ title: request.kamenolom, lat: loc.latitude, lng: loc.longitude });
                            }}
                          >
                            📍
                          </LocationPinButton>
                        )}
                      </Td>
                      <Td>
                        {getCodeDescription(request.gradiliste)}
                        {findLocationForCode(request.gradiliste) && (
                          <LocationPinButton
                            title="Prikaži lokaciju"
                            onClick={(e) => {
                              e.stopPropagation();
                              const loc = findLocationForCode(request.gradiliste)!;
                              setLocationPreview({ title: `${request.gradiliste} - ${getCodeDescription(request.gradiliste)}`, lat: loc.latitude, lng: loc.longitude });
                            }}
                          >
                            📍
                          </LocationPinButton>
                        )}
                      </Td>
                      <Td>{request.brojKamiona}</Td>
                      <Td>{request.prijevozNaDan}</Td>
                      <Td>{request.isplataPoT} €</Td>
                      <Td>
                        <StatusBadge status={request.status === 'Aktivno' ? 'approved' : 'rejected'}>
                          {getStatusLabel(request.status)}
                        </StatusBadge>
                      </Td>
                      <Td>
                        {request.assignedTo === 'All' ? (
                          'Svi'
                        ) : (
                          <ActionButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowAssignedUsers(request);
                            }}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            Prikaži prijevoznike
                          </ActionButton>
                        )}
                      </Td>
                      <Td>
                        {request.status === 'Aktivno' ? (
                          <ActionButton
                            disabled={blockedRequestIds.has(request._id)}
                            title={blockedRequestIds.has(request._id)
                              ? 'Već imate odobreno prihvaćanje za ovaj zahtjev koje nije završeno'
                              : undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptClick(request);
                            }}>
                            Prihvati
                          </ActionButton>
                        ) : (
                          <span style={{ color: '#999', fontStyle: 'italic' }}>Neaktivno</span>
                        )}
                      </Td>
                    </ClickableRow>
                  )}
                  {expandedRequestId === request._id && (
                    <ExpandedRow>
                      <ExpandedCell colSpan={isAdmin ? 9 : 8}>
                        {isLoadingRequestAcceptances ? (
                          <div style={{ textAlign: 'center', padding: '1rem', color: '#999' }}>
                            Učitavanje prihvaćanja...
                          </div>
                        ) : requestAcceptances.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '1rem', color: '#999', fontStyle: 'italic' }}>
                            Nema prihvaćanja za ovaj zahtjev
                          </div>
                        ) : (
                          <AcceptancesList>
                            <h4 style={{ margin: '0 0 1rem 0', color: '#333' }}>Prihvaćanja za ovaj zahtjev:</h4>
                            {requestAcceptances.map((acceptance) => {
                              const items = linkedItemsByAcceptance.get(acceptance._id) || [];
                              const itemCount = items.length;
                              const allCompleted = itemCount >= acceptance.acceptedCount;

                              return (
                                <AcceptanceItem key={acceptance._id}>
                                  <AcceptanceItemHeader>
                                    <AcceptanceItemUser>
                                      {acceptance.userId?.firstName} {acceptance.userId?.lastName}
                                      {allCompleted && <CompletedTag>Materijal prevežen</CompletedTag>}
                                    </AcceptanceItemUser>
                                    <AcceptanceItemStatus status={acceptance.status}>
                                      {acceptance.status === 'approved' ? 'Prihvaćeno' : acceptance.status === 'declined' ? 'Odbijeno' : 'Na čekanju'}
                                    </AcceptanceItemStatus>
                                  </AcceptanceItemHeader>
                                  <AcceptanceItemDetail>
                                    ID: {acceptance._id}
                                  </AcceptanceItemDetail>
                                  <AcceptanceItemDetail>
                                    Email: {acceptance.userId?.email}
                                  </AcceptanceItemDetail>
                                  <AcceptanceItemDetail>
                                    Firma: {acceptance.userId?.company}
                                  </AcceptanceItemDetail>
                                  <AcceptanceItemDetail>
                                    Rezervirano prijevoza: {acceptance.acceptedCount}
                                  </AcceptanceItemDetail>
                                  <AcceptanceItemDetail>
                                    Ukupna isplata:{' '}
                                    <span style={{ fontWeight: 600, color: '#28a745' }}>
                                      {acceptance.ukupnaIsplata ? `${acceptance.ukupnaIsplata.toFixed(2)} €` : '0.00 €'}
                                    </span>
                                  </AcceptanceItemDetail>
                                  <AcceptanceItemDetail>
                                    Datum prihvaćanja: {new Date(acceptance.createdAt).toLocaleDateString('hr-HR')}
                                  </AcceptanceItemDetail>
                                  {acceptance.reviewedAt && (
                                    <AcceptanceItemDetail>
                                      Pregledano: {new Date(acceptance.reviewedAt).toLocaleDateString('hr-HR')}
                                    </AcceptanceItemDetail>
                                  )}
                                  <AcceptanceItemDetail>
                                    Doveženo: {itemCount} / {acceptance.acceptedCount}
                                  </AcceptanceItemDetail>
                                  {items.length > 0 && (
                                    <RegistrationTags style={{ marginTop: '0.5rem' }}>
                                      {items.map((linkedItem, idx: number) => (
                                        <RegistrationTag
                                          key={idx}
                                          $hasApprovedItem={true}
                                          onClick={() => handleRegistrationClick(linkedItem.itemId)}
                                        >
                                          {linkedItem.registration}
                                        </RegistrationTag>
                                      ))}
                                    </RegistrationTags>
                                  )}
                                </AcceptanceItem>
                              );
                            })}
                          </AcceptancesList>
                        )}
                      </ExpandedCell>
                    </ExpandedRow>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </Table>
        )}
      </RequestsContainer>

      {/* Admin modal for pending acceptances */}
      {isAcceptancesModalOpen && (
        <ModalOverlay onMouseDown={() => setIsAcceptancesModalOpen(false)}>
          <ListaPrijevozaModalContent onMouseDown={(e) => e.stopPropagation()}>
            <ListaPrijevozaTitle>
              Zahtjevi prijevoznika
            </ListaPrijevozaTitle>
            {isLoadingAcceptances ? (
              <ListaPrijevozaEmpty>Učitavanje...</ListaPrijevozaEmpty>
            ) : pendingAcceptances.length === 0 ? (
              <ListaPrijevozaEmpty>Nema zahtjeva na čekanju</ListaPrijevozaEmpty>
            ) : (
              pendingAcceptances.map((acceptance) => {
                const items = linkedItemsByAcceptance.get(acceptance._id) || [];
                const itemCount = items.length;

                return (
                  <AcceptanceCard key={acceptance._id}>
                    <AcceptanceHeader>
                      <AcceptanceInfo>
                        <AcceptanceUser>
                          {acceptance.userId?.firstName} {acceptance.userId?.lastName}
                        </AcceptanceUser>
                        <AcceptanceDetail>
                          ID: {acceptance._id}
                        </AcceptanceDetail>
                        <AcceptanceDetail>
                          Email: {acceptance.userId?.email}
                        </AcceptanceDetail>
                        <AcceptanceDetail>
                          Firma: {acceptance.userId?.company}
                        </AcceptanceDetail>
                        <AcceptanceDetail>
                          Kamenolom: {acceptance.requestId?.kamenolom}
                        </AcceptanceDetail>
                        <AcceptanceDetail>
                          Gradilište: {getCodeDescription(acceptance.requestId?.gradiliste)}
                        </AcceptanceDetail>
                        <AcceptanceDetail>
                          Rezervirano prijevoza: {acceptance.acceptedCount}
                        </AcceptanceDetail>
                        <AcceptanceDetail>
                          Doveženo: {itemCount} / {acceptance.acceptedCount}
                        </AcceptanceDetail>
                        <AcceptanceDetail>
                          Isplata po t: {acceptance.requestId?.isplataPoT}€
                        </AcceptanceDetail>
                        <AcceptanceDetail>
                          Datum zahtjeva: {new Date(acceptance.createdAt).toLocaleDateString('hr-HR')}
                        </AcceptanceDetail>
                        {items.length > 0 && (
                          <RegistrationTags>
                            {items.map((linkedItem, idx: number) => (
                              <RegistrationTag
                                key={idx}
                                $hasApprovedItem={true}
                                onClick={() => handleRegistrationClick(linkedItem.itemId)}
                              >
                                {linkedItem.registration}
                              </RegistrationTag>
                            ))}
                          </RegistrationTags>
                        )}
                      </AcceptanceInfo>
                      <AcceptanceActions>
                        <ApproveButton onClick={() => handleApproveAcceptance(acceptance._id)}>
                          Prihvati
                        </ApproveButton>
                        <DeclineButton onClick={() => handleDeclineAcceptance(acceptance._id)}>
                          Odbij
                        </DeclineButton>
                      </AcceptanceActions>
                    </AcceptanceHeader>
                  </AcceptanceCard>
                );
              })
            )}
            <ModalCloseButton onClick={() => setIsAcceptancesModalOpen(false)}>
              Zatvori
            </ModalCloseButton>
          </ListaPrijevozaModalContent>
        </ModalOverlay>
      )}

      {locationPreview && (
        <LocationPreviewOverlay onMouseDown={() => setLocationPreview(null)}>
          <LocationPreviewCard onMouseDown={(e) => e.stopPropagation()}>
            <LocationPreviewHeader>
              <LocationPreviewTitle>{locationPreview.title}</LocationPreviewTitle>
              <LocationPreviewCloseBtn onClick={() => setLocationPreview(null)}>✕</LocationPreviewCloseBtn>
            </LocationPreviewHeader>
            <LocationPreviewMapImg
              src={getStaticMapUrl(locationPreview.lat, locationPreview.lng)}
              alt={`Lokacija: ${locationPreview.title}`}
            />
            <LocationPreviewFooter>
              <span>{locationPreview.lat.toFixed(5)}, {locationPreview.lng.toFixed(5)}</span>
              <a
                href={`https://www.google.com/maps?q=${locationPreview.lat},${locationPreview.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Otvori u Google Maps
              </a>
            </LocationPreviewFooter>
          </LocationPreviewCard>
        </LocationPreviewOverlay>
      )}

      <NoviZahtjevModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitZahtjev}
        codeLocations={codeLocations}
      />

      <EditZahtjevModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRequest(null);
        }}
        onSubmit={handleEditSubmit}
        request={editingRequest}
      />

      {isAssignedUsersModalOpen && (
        <ModalOverlay onMouseDown={() => setIsAssignedUsersModalOpen(false)}>
          <ModalContent onMouseDown={(e) => e.stopPropagation()}>
            <ModalTitle>Dodijeljeni prijevoznici</ModalTitle>
            <UserList>
              {assignedUsers.map((user) => (
                <UserItem key={user._id}>
                  {user.firstName} {user.lastName}
                </UserItem>
              ))}
            </UserList>
            <ModalCloseButton onClick={() => setIsAssignedUsersModalOpen(false)}>
              Zatvori
            </ModalCloseButton>
          </ModalContent>
        </ModalOverlay>
      )}

      {isAcceptModalOpen && acceptingRequest && (
        <ModalOverlay onMouseDown={() => setIsAcceptModalOpen(false)}>
          <ModalContent onMouseDown={(e) => e.stopPropagation()}>
            <ModalTitle>Prihvati zahtjev za prijevoz</ModalTitle>

            <RequestInfo>
              <InfoRow>
                <InfoLabel>Kamenolom:</InfoLabel>
                <InfoValue>{acceptingRequest.kamenolom}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Gradilište:</InfoLabel>
                <InfoValue>{getCodeDescription(acceptingRequest.gradiliste)}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Broj kamiona:</InfoLabel>
                <InfoValue>{acceptingRequest.brojKamiona}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Datum prijevoza:</InfoLabel>
                <InfoValue>{acceptingRequest.prijevozNaDan}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Isplata po (t):</InfoLabel>
                <InfoValue>{acceptingRequest.isplataPoT} €</InfoValue>
              </InfoRow>
            </RequestInfo>

            <div style={{ marginBottom: '1rem', fontWeight: 500 }}>
              Koliko prijevoza želite rezervirati? (max {acceptingRequest.brojKamiona})
            </div>

            <input
              type="number"
              min={1}
              max={acceptingRequest.brojKamiona}
              value={acceptCount}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  setAcceptCount('');
                  return;
                }
                const val = parseInt(raw, 10);
                if (!isNaN(val) && val >= 1 && val <= acceptingRequest.brojKamiona) {
                  setAcceptCount(val);
                }
              }}
              onBlur={() => {
                if (acceptCount === '' || acceptCount < 1) {
                  setAcceptCount(1);
                }
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '1rem',
                marginBottom: '1rem',
              }}
            />

            <ModalActions>
              <ModalButton variant="secondary" onClick={() => setIsAcceptModalOpen(false)}>
                Odustani
              </ModalButton>
              <ModalButton
                variant="primary"
                onClick={handleAcceptSubmit}
                disabled={!acceptCount || acceptCount < 1}
              >
                Prihvati ({acceptCount || 0})
              </ModalButton>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      )}

      <ItemDetailsModal
        item={selectedItem}
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setSelectedItem(null);
        }}
        onImageClick={(imageUrl) => setSelectedImage(imageUrl)}
      />

      {selectedImage && (
        <ImageViewerModal
          imageUrl={selectedImage}
          token={localStorage.getItem('userToken') || ''}
          onClose={() => setSelectedImage(null)}
        />
      )}

      {/* Lista prijevoza modal for regular users */}
      {isListaPrijevozaOpen && (
        <ModalOverlay onMouseDown={() => setIsListaPrijevozaOpen(false)}>
          <ListaPrijevozaModalContent onMouseDown={(e) => e.stopPropagation()}>
            <ListaPrijevozaTitle>
              📋 Lista prijevoza
            </ListaPrijevozaTitle>

            {isLoadingUserAcceptances ? (
              <ListaPrijevozaEmpty>Učitavanje...</ListaPrijevozaEmpty>
            ) : userAcceptances.length === 0 ? (
              <ListaPrijevozaEmpty>Nemate prihvaćenih zahtjeva za prijevoz</ListaPrijevozaEmpty>
            ) : (
              groupAcceptancesByDate(userAcceptances).map(group => {
                const isExpanded = expandedListaDates.has(group.date);
                return (
                  <ListaPrijevozaGroup key={group.date}>
                    <ListaPrijevozaGroupHeader
                      onClick={() => {
                        setExpandedListaDates(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(group.date)) {
                            newSet.delete(group.date);
                          } else {
                            newSet.add(group.date);
                          }
                          return newSet;
                        });
                      }}
                    >
                      <span>📅 {group.date} ({group.acceptances.length} prijevoz{group.acceptances.length === 1 ? '' : 'a'})</span>
                      <span>{isExpanded ? '▲' : '▼'}</span>
                    </ListaPrijevozaGroupHeader>
                    {isExpanded && group.acceptances.map((acceptance: any) => {
                      const items = linkedItemsByAcceptance.get(acceptance._id) || [];
                      const itemCount = items.length;
                      const allCompleted = itemCount >= acceptance.acceptedCount;

                      return (
                        <ListaPrijevozaItem key={acceptance._id}>
                          {allCompleted && (
                            <div style={{ marginBottom: '0.5rem' }}>
                              <CompletedTag>Materijal prevežen</CompletedTag>
                            </div>
                          )}
                          <ListaPrijevozaDetail>
                            <ListaPrijevozaLabel>Kamenolom:</ListaPrijevozaLabel>
                            <ListaPrijevozaValue>{acceptance.requestId?.kamenolom || '-'}</ListaPrijevozaValue>
                          </ListaPrijevozaDetail>
                          <ListaPrijevozaDetail>
                            <ListaPrijevozaLabel>Gradilište:</ListaPrijevozaLabel>
                            <ListaPrijevozaValue>{getCodeDescription(acceptance.requestId?.gradiliste) || '-'}</ListaPrijevozaValue>
                          </ListaPrijevozaDetail>
                          <ListaPrijevozaDetail>
                            <ListaPrijevozaLabel>Rezervirano prijevoza:</ListaPrijevozaLabel>
                            <ListaPrijevozaValue>{acceptance.acceptedCount}</ListaPrijevozaValue>
                          </ListaPrijevozaDetail>
                          <ListaPrijevozaDetail>
                            <ListaPrijevozaLabel>Doveženo:</ListaPrijevozaLabel>
                            <ListaPrijevozaValue>{itemCount} / {acceptance.acceptedCount}</ListaPrijevozaValue>
                          </ListaPrijevozaDetail>
                          <ListaPrijevozaDetail>
                            <ListaPrijevozaLabel>Isplata po (t):</ListaPrijevozaLabel>
                            <ListaPrijevozaValue>{acceptance.requestId?.isplataPoT} €</ListaPrijevozaValue>
                          </ListaPrijevozaDetail>
                          <ListaPrijevozaDetail>
                            <ListaPrijevozaLabel>Ukupna isplata:</ListaPrijevozaLabel>
                            <ListaPrijevozaValue style={{ fontWeight: 600, color: '#28a745' }}>
                              {acceptance.ukupnaIsplata ? `${acceptance.ukupnaIsplata.toFixed(2)} €` : '0.00 €'}
                            </ListaPrijevozaValue>
                          </ListaPrijevozaDetail>
                          {items.length > 0 && (
                            <ListaPrijevozaDetail>
                              <ListaPrijevozaLabel>Registracije:</ListaPrijevozaLabel>
                              <ListaPrijevozaValue>
                                <RegistrationTags>
                                  {items.map((linkedItem, idx: number) => (
                                    <RegistrationTag
                                      key={idx}
                                      $hasApprovedItem={true}
                                      onClick={() => handleRegistrationClick(linkedItem.itemId)}
                                    >
                                      {linkedItem.registration}
                                    </RegistrationTag>
                                  ))}
                                </RegistrationTags>
                              </ListaPrijevozaValue>
                            </ListaPrijevozaDetail>
                          )}
                          <ListaPrijevozaDetail>
                            <ListaPrijevozaLabel>Status:</ListaPrijevozaLabel>
                            <ListaPrijevozaStatus status={acceptance.status}>
                              {getAcceptanceStatusLabel(acceptance.status)}
                            </ListaPrijevozaStatus>
                          </ListaPrijevozaDetail>
                          <ListaPrijevozaDetail>
                            <ListaPrijevozaLabel>Datum prihvaćanja:</ListaPrijevozaLabel>
                            <ListaPrijevozaValue>
                              {new Date(acceptance.createdAt).toLocaleDateString('hr-HR')}
                            </ListaPrijevozaValue>
                          </ListaPrijevozaDetail>
                          {acceptance.reviewedAt && (
                            <ListaPrijevozaDetail>
                              <ListaPrijevozaLabel>Pregledano:</ListaPrijevozaLabel>
                              <ListaPrijevozaValue>
                                {new Date(acceptance.reviewedAt).toLocaleDateString('hr-HR')}
                              </ListaPrijevozaValue>
                            </ListaPrijevozaDetail>
                          )}
                        </ListaPrijevozaItem>
                      );
                    })}
                  </ListaPrijevozaGroup>
                );
              })
            )}

            <ModalCloseButton onClick={() => setIsListaPrijevozaOpen(false)}>
              Zatvori
            </ModalCloseButton>
          </ListaPrijevozaModalContent>
        </ModalOverlay>
      )}

      {/* Admin: Lista prijevoza po prijevozniku modal */}
      {isDriverListModalOpen && (
        <ModalOverlay onMouseDown={() => setIsDriverListModalOpen(false)}>
          <ListaPrijevozaModalContent onMouseDown={(e) => e.stopPropagation()}>
            <ListaPrijevozaTitle>
              🚛 Lista prijevoza po prijevozniku
            </ListaPrijevozaTitle>

            {/* User selector */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Odaberite prijevoznika:</div>
              {isLoadingDriverListUsers ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#999' }}>
                  Učitavanje prijevoznika...
                </div>
              ) : (
                <select
                  value={selectedDriverId || ''}
                  onChange={(e) => {
                    const userId = e.target.value;
                    if (userId) {
                      const selectedUser = driverListUsers.find(u => u._id === userId);
                      if (selectedUser) {
                        handleSelectDriver(userId, `${selectedUser.firstName} ${selectedUser.lastName}`);
                      }
                    } else {
                      setSelectedDriverId(null);
                      setSelectedDriverName('');
                      setDriverAcceptances([]);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    fontSize: '1rem',
                    backgroundColor: 'white',
                  }}
                >
                  <option value="">-- Odaberite prijevoznika --</option>
                  {driverListUsers.map((driverUser) => (
                    <option key={driverUser._id} value={driverUser._id}>
                      {driverUser.firstName} {driverUser.lastName}{driverUser.company ? ` (${driverUser.company})` : driverUser.email ? ` (${driverUser.email})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Driver's acceptances */}
            {selectedDriverId && (
              <>
                <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>
                  Prijevozi za: {selectedDriverName}
                </h3>
                {isLoadingDriverAcceptances ? (
                  <ListaPrijevozaEmpty>Učitavanje...</ListaPrijevozaEmpty>
                ) : driverAcceptances.length === 0 ? (
                  <ListaPrijevozaEmpty>
                    Ovaj prijevoznik nema prihvaćenih zahtjeva za prijevoz
                  </ListaPrijevozaEmpty>
                ) : (() => {
                  return groupAcceptancesByDate(driverAcceptances).map(group => {
                    const isExpanded = expandedDriverDates.has(group.date);
                    return (
                      <ListaPrijevozaGroup key={group.date}>
                        <ListaPrijevozaGroupHeader
                          onClick={() => {
                            setExpandedDriverDates(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(group.date)) {
                                newSet.delete(group.date);
                              } else {
                                newSet.add(group.date);
                              }
                              return newSet;
                            });
                          }}
                        >
                          <span>📅 {group.date} ({group.acceptances.length} prijevoz{group.acceptances.length === 1 ? '' : 'a'})</span>
                          <span>{isExpanded ? '▲' : '▼'}</span>
                        </ListaPrijevozaGroupHeader>
                        {isExpanded && group.acceptances.map((acceptance: any) => {
                          const items = linkedItemsByAcceptance.get(acceptance._id) || [];
                          const itemCount = items.length;
                          const allCompleted = itemCount >= acceptance.acceptedCount;

                          return (
                            <ListaPrijevozaItem key={acceptance._id}>
                              {allCompleted && (
                                <div style={{ marginBottom: '0.5rem' }}>
                                  <CompletedTag>Materijal prevežen</CompletedTag>
                                </div>
                              )}
                              <ListaPrijevozaDetail>
                                <ListaPrijevozaLabel>ID:</ListaPrijevozaLabel>
                                <ListaPrijevozaValue>{acceptance._id}</ListaPrijevozaValue>
                              </ListaPrijevozaDetail>
                              <ListaPrijevozaDetail>
                                <ListaPrijevozaLabel>Kamenolom:</ListaPrijevozaLabel>
                                <ListaPrijevozaValue>{acceptance.requestId?.kamenolom || '-'}</ListaPrijevozaValue>
                              </ListaPrijevozaDetail>
                              <ListaPrijevozaDetail>
                                <ListaPrijevozaLabel>Gradilište:</ListaPrijevozaLabel>
                                <ListaPrijevozaValue>{getCodeDescription(acceptance.requestId?.gradiliste) || '-'}</ListaPrijevozaValue>
                              </ListaPrijevozaDetail>
                              <ListaPrijevozaDetail>
                                <ListaPrijevozaLabel>Rezervirano prijevoza:</ListaPrijevozaLabel>
                                <ListaPrijevozaValue>{acceptance.acceptedCount}</ListaPrijevozaValue>
                              </ListaPrijevozaDetail>
                              <ListaPrijevozaDetail>
                                <ListaPrijevozaLabel>Doveženo:</ListaPrijevozaLabel>
                                <ListaPrijevozaValue style={{ fontWeight: 600, color: itemCount >= acceptance.acceptedCount ? '#28a745' : '#dc3545' }}>
                                  {itemCount} / {acceptance.acceptedCount}
                                </ListaPrijevozaValue>
                              </ListaPrijevozaDetail>
                              <ListaPrijevozaDetail>
                                <ListaPrijevozaLabel>Isplata po (t):</ListaPrijevozaLabel>
                                <ListaPrijevozaValue>{acceptance.requestId?.isplataPoT} €</ListaPrijevozaValue>
                              </ListaPrijevozaDetail>
                              <ListaPrijevozaDetail>
                                <ListaPrijevozaLabel>Ukupna isplata:</ListaPrijevozaLabel>
                                <ListaPrijevozaValue style={{ fontWeight: 600, color: '#28a745' }}>
                                  {acceptance.ukupnaIsplata ? `${acceptance.ukupnaIsplata.toFixed(2)} €` : '0.00 €'}
                                </ListaPrijevozaValue>
                              </ListaPrijevozaDetail>
                              <ListaPrijevozaDetail>
                                <ListaPrijevozaLabel>Registracije:</ListaPrijevozaLabel>
                                <ListaPrijevozaValue>
                                  <RegistrationTags>
                                    {items.map((linkedItem, idx: number) => (
                                      <RegistrationTag
                                        key={idx}
                                        $hasApprovedItem={true}
                                        onClick={() => handleRegistrationClick(linkedItem.itemId)}
                                      >
                                        {linkedItem.registration}
                                      </RegistrationTag>
                                    ))}
                                  </RegistrationTags>
                                </ListaPrijevozaValue>
                              </ListaPrijevozaDetail>
                              <ListaPrijevozaDetail>
                                <ListaPrijevozaLabel>Status:</ListaPrijevozaLabel>
                                <ListaPrijevozaStatus status={acceptance.status}>
                                  {getAcceptanceStatusLabel(acceptance.status)}
                                </ListaPrijevozaStatus>
                              </ListaPrijevozaDetail>
                              <ListaPrijevozaDetail>
                                <ListaPrijevozaLabel>Datum prihvaćanja:</ListaPrijevozaLabel>
                                <ListaPrijevozaValue>
                                  {new Date(acceptance.createdAt).toLocaleDateString('hr-HR')}
                                </ListaPrijevozaValue>
                              </ListaPrijevozaDetail>
                              {acceptance.reviewedAt && (
                                <ListaPrijevozaDetail>
                                  <ListaPrijevozaLabel>Pregledano:</ListaPrijevozaLabel>
                                  <ListaPrijevozaValue>
                                    {new Date(acceptance.reviewedAt).toLocaleDateString('hr-HR')}
                                  </ListaPrijevozaValue>
                                </ListaPrijevozaDetail>
                              )}
                            </ListaPrijevozaItem>
                          );
                        })}
                      </ListaPrijevozaGroup>
                    );
                  });
                })()}
              </>
            )}

            <ModalCloseButton onClick={() => setIsDriverListModalOpen(false)}>
              Zatvori
            </ModalCloseButton>
          </ListaPrijevozaModalContent>
        </ModalOverlay>
      )}
      {/* Ispiši Karticu modal */}
      {isKarticaModalOpen && (
        <ModalOverlay onMouseDown={() => setIsKarticaModalOpen(false)}>
          <KarticaModalContent onMouseDown={(e) => e.stopPropagation()}>
            <ListaPrijevozaTitle>
              Ispiši Karticu
            </ListaPrijevozaTitle>

            {isAdmin && (
              <KarticaFormGroup>
                <KarticaLabel>Prijevoznik:</KarticaLabel>
                {isLoadingKarticaUsers ? (
                  <div style={{ padding: '0.5rem', color: '#999' }}>Učitavanje prijevoznika...</div>
                ) : (
                  <KarticaSelectDropdown
                    value={karticaUserId}
                    onChange={(e) => {
                      const userId = e.target.value;
                      setKarticaUserId(userId);
                      const selectedUser = karticaUsers.find(u => u._id === userId);
                      setKarticaUserName(selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : '');
                    }}
                  >
                    <option value="">-- Odaberite prijevoznika --</option>
                    {karticaUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.firstName} {u.lastName}{u.company ? ` (${u.company})` : u.email ? ` (${u.email})` : ''}
                      </option>
                    ))}
                  </KarticaSelectDropdown>
                )}
              </KarticaFormGroup>
            )}

            <KarticaFormGroup>
              <KarticaLabel>Mjesec:</KarticaLabel>
              <KarticaMonthRow>
                <KarticaSelectDropdown
                  value={karticaMonthNum}
                  onChange={(e) => setKarticaMonthNum(parseInt(e.target.value))}
                >
                  {croatianMonths.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </KarticaSelectDropdown>
                <KarticaSelectDropdown
                  value={karticaYear}
                  onChange={(e) => setKarticaYear(parseInt(e.target.value))}
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </KarticaSelectDropdown>
              </KarticaMonthRow>
            </KarticaFormGroup>

            <KarticaFormGroup>
              <KarticaLabel>Šifra (gradilište):</KarticaLabel>
              <KarticaSelectDropdown
                value={karticaCode}
                onChange={(e) => setKarticaCode(e.target.value)}
              >
                <option value="">-- Odaberite šifru --</option>
                {Object.entries(codeToTextMapping)
                  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                  .map(([code, description]) => (
                    <option key={code} value={code}>
                      {code} - {description}
                    </option>
                  ))}
              </KarticaSelectDropdown>
            </KarticaFormGroup>

            <KarticaButtonRow>
              <SmallButton
                onClick={handleGenerateKartica}
                disabled={isGeneratingKartica || !karticaCode}
              >
                {isGeneratingKartica ? 'Generiranje...' : 'Generiraj PDF'}
              </SmallButton>
              <ModalCloseButton onClick={() => setIsKarticaModalOpen(false)}>
                Zatvori
              </ModalCloseButton>
            </KarticaButtonRow>
          </KarticaModalContent>
        </ModalOverlay>
      )}
      {/* Lokacija modal */}
      {isLokacijaModalOpen && (
        <ModalOverlay onMouseDown={() => { setIsLokacijaModalOpen(false); setEditingLocationId(null); setEditingPin(null); setCreateAutocomplete(null); setEditAutocomplete(null); setCreateMapRef(null); setEditMapRef(null); }}>
          <ListaPrijevozaModalContent onMouseDown={(e) => e.stopPropagation()}>
            <ListaPrijevozaTitle>Lokacije</ListaPrijevozaTitle>

            {!editingLocationId && (
              <>
                <NewGroupRow>
                  <KarticaSelectDropdown
                    value={lokacijaSelectedCode}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLokacijaSelectedCode(e.target.value)}
                  >
                    <option value="">Odaberi šifru ili kamenolom...</option>
                    <option disabled>── Kamenolom ──</option>
                    {KAMENOLOMI.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                    <option disabled>── Šifre (gradilišta) ──</option>
                    {Object.entries(codeToTextMapping)
                      .filter(([code]) => code !== '20001')
                      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                      .map(([code, desc]) => (
                        <option key={code} value={code}>
                          {code} - {desc}
                        </option>
                      ))}
                  </KarticaSelectDropdown>
                </NewGroupRow>

                {lokacijaSelectedCode && (
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
                      Pretražite lokaciju ili kliknite na kartu da postavite pin:
                    </p>
                    {isMapLoaded ? (
                      <>
                        <Autocomplete
                          onLoad={onCreateAutocompleteLoad}
                          onPlaceChanged={onCreatePlaceChanged}
                          options={{ componentRestrictions: { country: 'hr' } }}
                        >
                          <MapSearchInput
                            type="text"
                            placeholder="Pretražite adresu ili mjesto..."
                          />
                        </Autocomplete>
                        <GoogleMap
                          mapContainerStyle={MAP_CONTAINER_STYLE}
                          center={lokacijaPin || OSIJEK_CENTER}
                          zoom={12}
                          onClick={handleMapClick}
                          onLoad={(map) => setCreateMapRef(map)}
                          options={{ streetViewControl: false, mapTypeControl: false }}
                        >
                          {lokacijaPin && <MarkerF position={lokacijaPin} />}
                        </GoogleMap>
                      </>
                    ) : (
                      <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: '8px' }}>
                        Učitavanje karte...
                      </div>
                    )}
                    {lokacijaPin && (
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#333' }}>
                        Pin: {lokacijaPin.lat.toFixed(6)}, {lokacijaPin.lng.toFixed(6)}
                      </p>
                    )}
                    <div style={{ marginTop: '0.75rem' }}>
                      <SmallButton onClick={handleSaveCodeLocation} disabled={!lokacijaSelectedCode || !lokacijaPin}>
                        Spremi lokaciju
                      </SmallButton>
                    </div>
                  </div>
                )}
              </>
            )}

            {editingLocationId && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
                  Pretražite lokaciju ili kliknite na kartu da promijenite lokaciju:
                </p>
                {isMapLoaded ? (
                  <>
                    <Autocomplete
                      onLoad={onEditAutocompleteLoad}
                      onPlaceChanged={onEditPlaceChanged}
                      options={{ componentRestrictions: { country: 'hr' } }}
                    >
                      <MapSearchInput
                        type="text"
                        placeholder="Pretražite adresu ili mjesto..."
                      />
                    </Autocomplete>
                    <GoogleMap
                      mapContainerStyle={MAP_CONTAINER_STYLE}
                      center={editingPin || OSIJEK_CENTER}
                      zoom={14}
                      onClick={handleMapClick}
                      onLoad={(map) => setEditMapRef(map)}
                      options={{ streetViewControl: false, mapTypeControl: false }}
                    >
                      {editingPin && <MarkerF position={editingPin} />}
                    </GoogleMap>
                  </>
                ) : (
                  <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: '8px' }}>
                    Učitavanje karte...
                  </div>
                )}
                {editingPin && (
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#333' }}>
                    Pin: {editingPin.lat.toFixed(6)}, {editingPin.lng.toFixed(6)}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <SmallButton onClick={() => handleSaveEditLocation(editingLocationId)}>Spremi</SmallButton>
                  <SmallButton onClick={() => { setEditingLocationId(null); setEditingPin(null); }}>Odustani</SmallButton>
                </div>
              </div>
            )}

            {isLoadingLocations ? (
              <ListaPrijevozaEmpty>Učitavanje...</ListaPrijevozaEmpty>
            ) : codeLocations.length === 0 ? (
              <ListaPrijevozaEmpty>Nema spremljenih lokacija</ListaPrijevozaEmpty>
            ) : (
              codeLocations.map((loc) => (
                <GroupCard key={loc._id}>
                  <GroupCardHeader>
                    <div style={{ flex: 1 }}>
                      <GroupName>{KAMENOLOMI.includes(loc.code) ? loc.code : getFormattedCode(loc.code)}</GroupName>
                      <GroupMemberCount style={{ marginLeft: 0, display: 'block', marginTop: '0.25rem' }}>
                        {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                        {' '}
                        <a
                          href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '0.8rem' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          (Otvori u Google Maps)
                        </a>
                      </GroupMemberCount>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {editingLocationId !== loc._id && (
                        <ActionButton onClick={() => handleStartEditLocation(loc)}>
                          Uredi
                        </ActionButton>
                      )}
                      <GroupDeleteBtn onClick={() => handleDeleteCodeLocation(loc._id)}>
                        Obriši
                      </GroupDeleteBtn>
                    </div>
                  </GroupCardHeader>
                </GroupCard>
              ))
            )}

            <ModalCloseButton onClick={() => { setIsLokacijaModalOpen(false); setEditingLocationId(null); setEditingPin(null); setCreateAutocomplete(null); setEditAutocomplete(null); setCreateMapRef(null); setEditMapRef(null); }}>
              Zatvori
            </ModalCloseButton>
          </ListaPrijevozaModalContent>
        </ModalOverlay>
      )}

      {/* Grupe modal */}
      {isGroupsModalOpen && (
        <ModalOverlay onMouseDown={() => setIsGroupsModalOpen(false)}>
          <ListaPrijevozaModalContent onMouseDown={(e) => e.stopPropagation()}>
            <ListaPrijevozaTitle>Grupe</ListaPrijevozaTitle>

            <NewGroupRow>
              <KarticaSelectDropdown
                as="input"
                type="text"
                placeholder="Naziv nove grupe..."
                value={newGroupName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGroupName(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleCreateGroup(); }}
              />
              <SmallButton onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
                Dodaj
              </SmallButton>
            </NewGroupRow>

            {isLoadingGroups ? (
              <ListaPrijevozaEmpty>Učitavanje...</ListaPrijevozaEmpty>
            ) : groups.length === 0 ? (
              <ListaPrijevozaEmpty>Nema grupa</ListaPrijevozaEmpty>
            ) : (
              groups.map((group) => (
                <GroupCard key={group._id}>
                  <GroupCardHeader onClick={() => setExpandedGroupId(expandedGroupId === group._id ? null : group._id)}>
                    <div>
                      <GroupName>{group.name}</GroupName>
                      <GroupMemberCount>({group.users?.length || 0} članova)</GroupMemberCount>
                    </div>
                    <GroupDeleteBtn onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group._id); }}>
                      Obriši
                    </GroupDeleteBtn>
                  </GroupCardHeader>
                  {expandedGroupId === group._id && (
                    <GroupBody>
                      {groupUsers.length === 0 ? (
                        <div style={{ color: '#999', fontStyle: 'italic' }}>Nema dostupnih korisnika</div>
                      ) : (
                        groupUsers.map((u) => (
                          <GroupUserRow key={u._id}>
                            <input
                              type="checkbox"
                              checked={group.users?.some((gu: any) => gu._id === u._id) || false}
                              onChange={() => handleToggleGroupUser(group._id, u._id)}
                            />
                            {u.firstName} {u.lastName} ({u.email})
                          </GroupUserRow>
                        ))
                      )}
                    </GroupBody>
                  )}
                </GroupCard>
              ))
            )}

            <ModalCloseButton onClick={() => setIsGroupsModalOpen(false)}>
              Zatvori
            </ModalCloseButton>
          </ListaPrijevozaModalContent>
        </ModalOverlay>
      )}
    </S.PageContainer>
  );
};

export default PrijevozPage;
