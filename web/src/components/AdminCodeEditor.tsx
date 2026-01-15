import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

interface Item {
  _id: string;
  title: string;
  code: string;
  registracija?: string;
  neto?: number;
  tezina?: number;
  pdfUrl: string;
  creationDate: string;
  approvalStatus: 'na čekanju' | 'odobreno' | 'odbijen';
}

interface AdminCodeEditorProps {
  item: Item;
  availableCodes: string[];
  onCodeUpdate: (itemId: string, newCode: string) => Promise<boolean>;
  disabled?: boolean;
}

// Styled components
const Container = styled.div`
  position: relative;
`;

const CodeDisplay = styled.div<{ success: boolean; error: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme?.spacing?.small || '8px'};
  border-radius: ${({ theme }) => theme?.borderRadius || '8px'};
  border: 1px solid;
  transition: all 0.2s ease;
  cursor: default;

  ${({ success, error, theme }) => {
    if (success) {
      return `
        background-color: #f0f9ff;
        border-color: #3b82f6;
        color: #1e40af;
      `;
    }
    if (error) {
      return `
        background-color: #fef2f2;
        border-color: #ef4444;
        color: #dc2626;
      `;
    }
    return `
      background-color: ${theme?.colors?.background || '#f9fafb'};
      border-color: ${theme?.colors?.gray || '#d1d5db'};
      color: ${theme?.colors?.text || '#374151'};
      
      &:hover {
        background-color: ${theme?.colors?.white || '#ffffff'};
        border-color: ${theme?.colors?.primary || '#3b82f6'};
      }
    `;
  }}
`;

const CodeText = styled.span`
  font-family: 'Courier New', Consolas, monospace;
  font-size: 0.875rem;
  font-weight: 500;
`;

const DropdownButton = styled.button<{ isOpen: boolean; visible: boolean }>`
  padding: 4px;
  border: none;
  background: none;
  color: #3b82f6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  transform: ${({ isOpen }) => (isOpen ? 'rotate(180deg)' : 'rotate(0deg)')};

  &:hover {
    background-color: #dbeafe;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .group:hover & {
    opacity: 1;
  }
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid #3b82f6;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const SuccessIcon = styled.span`
  color: #10b981;
  font-size: 0.875rem;
  font-weight: bold;
`;

const ErrorMessage = styled.p`
  display: flex;
  align-items: center;
  margin-top: 4px;
  font-size: 0.75rem;
  color: #dc2626;

  span {
    margin-right: 4px;
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 50;
  max-height: 240px;
  overflow-y: auto;
`;

const DropdownHeader = styled.div`
  padding: 8px 12px;
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  border-bottom: 1px solid #f3f4f6;
`;

const DropdownItem = styled.button`
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  font-size: 0.875rem;
  font-family: 'Courier New', Consolas, monospace;
  color: #374151;
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: #f3f4f6;
  }
`;

const EmptyMessage = styled.div`
  padding: 12px;
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
`;

const AdminCodeEditor: React.FC<AdminCodeEditorProps> = ({
  item,
  availableCodes,
  onCodeUpdate,
  disabled = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDropdownToggle = () => {
    if (disabled || isLoading) return;
    setIsDropdownOpen(!isDropdownOpen);
    setError(null);
    setSuccess(false);
  };

  const handleCodeSelect = async (newCode: string) => {
    if (newCode === item.code) {
      setIsDropdownOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsDropdownOpen(false);

    try {
      const success = await onCodeUpdate(item._id, newCode);

      if (success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError('Greška pri ažuriranju koda');
      }
    } catch (err) {
      setError('Neočekivana greška');
    } finally {
      setIsLoading(false);
    }
  };

  const excludedCodes = new Set(['20001']);

  // Filter out the current code, excluded codes, and remove duplicates
  const filteredCodes = React.useMemo(() => {
    // First remove duplicates, then filter out current code
    const uniqueCodes = Array.from(new Set(availableCodes));
    return uniqueCodes.filter(code => code !== item.code && !excludedCodes.has(code));
  }, [availableCodes, item.code]);

  // Debug logging (remove in production)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('AdminCodeEditor - availableCodes:', availableCodes);
      console.log('AdminCodeEditor - filteredCodes:', filteredCodes);
      console.log('AdminCodeEditor - current item code:', item.code);

      // Check for duplicates in original array
      const duplicates = availableCodes.filter(
        (code, index) => availableCodes.indexOf(code) !== index
      );
      if (duplicates.length > 0) {
        console.warn('FOUND DUPLICATES in availableCodes:', duplicates);
      }
    }
  }, [availableCodes, filteredCodes, item.code]);

  return (
    <Container ref={dropdownRef} className="group">
      <CodeDisplay success={success} error={!!error}>
        <CodeText>
          <strong>RN:</strong> {item.code}
        </CodeText>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLoading && <LoadingSpinner />}
          {success && <SuccessIcon>✓</SuccessIcon>}

          {!disabled && !isLoading && (
            <DropdownButton
              onClick={handleDropdownToggle}
              isOpen={isDropdownOpen}
              visible={isDropdownOpen}
              title="Promijeni kod">
              ▼
            </DropdownButton>
          )}
        </div>
      </CodeDisplay>

      {error && (
        <ErrorMessage>
          <span>⚠️</span>
          {error}
        </ErrorMessage>
      )}

      {/* Dropdown Menu */}
      {isDropdownOpen && filteredCodes.length > 0 && (
        <DropdownMenu>
          <DropdownHeader>Odaberite novi kod:</DropdownHeader>
          {filteredCodes.map(code => (
            <DropdownItem key={code} onClick={() => handleCodeSelect(code)}>
              {code}
            </DropdownItem>
          ))}
        </DropdownMenu>
      )}

      {/* Show message if no other codes available */}
      {isDropdownOpen && filteredCodes.length === 0 && (
        <DropdownMenu>
          <EmptyMessage>Nema drugih dostupnih kodova</EmptyMessage>
        </DropdownMenu>
      )}
    </Container>
  );
};

export default AdminCodeEditor;
