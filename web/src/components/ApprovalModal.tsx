import React, {useState} from 'react';
import {Item} from '../types';
import {apiService} from '../utils/api';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item;
  onSuccess: () => void;
}

const Alert: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded relative">
    {children}
  </div>
);

const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [photoFront, setPhotoFront] = useState<File | null>(null);
  const [photoBack, setPhotoBack] = useState<File | null>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isBackPhoto: boolean = false,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        alert('Molimo odaberite JPEG ili PNG datoteku');
        return;
      }
      if (isBackPhoto) {
        setPhotoBack(file);
      } else {
        setPhotoFront(file);
      }
    }
  };

  const handleApprove = async () => {
    if (!photoFront || !photoBack) {
      alert('Obje fotografije su obavezne');
      return;
    }

    setLoading(true);
    try {
      const fixedLocation = {
        coordinates: {
          latitude: 45.56204169974961,
          longitude: 18.678308891755552,
        },
        accuracy: 10,
        timestamp: new Date(),
      };

      const formData = new FormData();
      formData.append('photoFront', photoFront);
      formData.append('photoBack', photoBack);
      formData.append('approvalStatus', 'odobreno');
      formData.append('locationData', JSON.stringify(fixedLocation));

      await apiService.updateItemApproval(
        item._id,
        'odobreno',
        photoFront,
        photoBack,
        fixedLocation,
      );
      onSuccess();
      onClose();
      alert('Dokument uspješno odobren');
    } catch (error) {
      console.error('Error approving item:', error);
      alert('Greška pri odobrenju dokumenta');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Odobri dokument</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Fotografija registracije
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={e => handleFileChange(e, false)}
              className="w-full border rounded p-2"
            />
            {photoFront && (
              <div className="mt-2 text-sm text-green-600">
                ✓ Fotografija odabrana
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Fotografija materijala
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={e => handleFileChange(e, true)}
              className="w-full border rounded p-2"
            />
            {photoBack && (
              <div className="mt-2 text-sm text-green-600">
                ✓ Fotografija odabrana
              </div>
            )}
          </div>

          <Alert>
            <p className="text-sm">
              Lokacija će biti automatski dodana prilikom odobrenja.
            </p>
          </Alert>

          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
              disabled={loading}
              type="button">
              Odustani
            </button>
            <button
              onClick={handleApprove}
              disabled={!photoFront || !photoBack || loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button">
              {loading ? 'Učitavanje...' : 'Odobri'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;
