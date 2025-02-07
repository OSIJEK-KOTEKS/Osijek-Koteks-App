import React, {useState} from 'react';
import ApprovalModal from './ApprovalModal';
import {Item} from '../types';

interface ApproveButtonProps {
  item: Item;
  onSuccess: () => void; // Explicitly typed as a function that returns void
}

const ApproveButton: React.FC<ApproveButtonProps> = ({item, onSuccess}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (item.approvalStatus !== 'na čekanju') {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-medium"
        type="button">
        Odobri
      </button>

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
