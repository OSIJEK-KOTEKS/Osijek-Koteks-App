import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

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
  z-index: 1200;
`;

const ModalContent = styled.div`
  position: relative;
  background-color: white;
  padding: 20px;
  border-radius: ${({ theme }) => theme.borderRadius};
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
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
  z-index: 1;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Image = styled.img`
  max-width: 100%;
  max-height: calc(90vh - 40px);
  object-fit: contain;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: ${({ theme }) => theme.colors.primary};
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error};
  text-align: center;
  padding: 20px;
`;

interface ImageViewerModalProps {
  imageUrl: string;
  onClose: () => void;
  token: string;
}

// osijek-koteks-web/src/components/ImageViewerModal.tsx

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ imageUrl, onClose, token }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // If it's a Cloudinary URL, use it directly
        if (imageUrl.startsWith('https://res.cloudinary.com')) {
          setImageObjectUrl(imageUrl);
          setIsLoading(false);
          return;
        }

        // For non-Cloudinary URLs, fetch with authentication
        const response = await fetch(imageUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load image');
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        setImageObjectUrl(objectUrl);
      } catch (err) {
        console.error('Error loading image:', err);
        setError('Greška pri učitavanju slike');
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();

    // Cleanup function to revoke object URL only for non-Cloudinary URLs
    return () => {
      if (imageObjectUrl && !imageUrl.startsWith('https://res.cloudinary.com')) {
        URL.revokeObjectURL(imageObjectUrl);
      }
    };
  }, [imageUrl, token]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        <CloseButton onClick={onClose}>&times;</CloseButton>
        {isLoading && <LoadingSpinner>Učitavanje...</LoadingSpinner>}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {imageObjectUrl && !isLoading && !error && <Image src={imageObjectUrl} alt="Document" />}
      </ModalContent>
    </ModalOverlay>
  );
};

export default ImageViewerModal;
