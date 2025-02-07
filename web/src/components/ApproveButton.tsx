import React, {useState} from 'react';
import styled from 'styled-components';
import ApprovalModal from './ApprovalModal';
import {Item} from '../types';
import {Button} from './styled/Common';

// Extend the existing ActionButton style
const ApproveActionButton = styled(Button)`
  flex: 1;
  min-width: auto;
  padding: 8px 16px;
  font-size: 0.9rem;
  background-color: #4caf50; // Green color for approve action

  &:hover {
    background-color: #45a049;
    opacity: 0.9;
  }
`;

interface ApproveButtonProps {
  item: Item;
  onSuccess: () => void;
}

const ApproveButton: React.FC<ApproveButtonProps> = ({item, onSuccess}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (item.approvalStatus !== 'na čekanju') {
    return null;
  }

  return (
    <>
      <ApproveActionButton onClick={() => setIsModalOpen(true)} type="button">
        Odobri
      </ApproveActionButton>

      <ApprovalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={item}
        onSuccess={onSuccess}
      />
    </>
  );
};

export default ApproveButton;
