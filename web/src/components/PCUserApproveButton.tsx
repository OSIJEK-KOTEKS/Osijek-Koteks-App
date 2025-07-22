import React, {useState} from 'react';
import styled from 'styled-components';
import PCUserApprovalModal from './PCUserApprovalModal';
import {Item} from '../types';
import {Button} from './styled/Common';

const ApproveActionButton = styled(Button)`
  flex: 1;
  min-width: auto;
  padding: 8px 16px;
  font-size: 0.9rem;
  background-color: #4caf50;

  &:hover {
    background-color: #45a049;
    opacity: 0.9;
  }
`;

interface PCUserApproveButtonProps {
  item: Item;
  onSuccess: () => void;
}

const PCUserApproveButton: React.FC<PCUserApproveButtonProps> = ({
  item,
  onSuccess,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (item.approvalStatus !== 'na čekanju') {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  return (
    <>
      <ApproveActionButton onClick={handleClick} type="button" id="pc-approve">
        Potvrdi
      </ApproveActionButton>

      <PCUserApprovalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={item}
        onSuccess={onSuccess}
      />
    </>
  );
};

export default PCUserApproveButton;
