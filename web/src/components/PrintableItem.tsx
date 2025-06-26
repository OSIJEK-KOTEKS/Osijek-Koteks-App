// Updated PrintableItem.tsx
import React from 'react';
import {Item} from '../types';
import {getImageUrl} from '../utils/api';
import {getFormattedCode, getCodeDescription} from '../utils/codeMapping';

interface PrintableItemProps {
  item: Item;
}

const PrintableItem: React.FC<PrintableItemProps> = ({item}) => {
  return (
    <div className="print-container">
      <div className="print-header">
        <img
          src="/images/logo.png"
          alt="Osijek-Koteks Logo"
          className="print-logo"
        />
        <h1 className="print-title">Detalji dokumenta</h1>
      </div>

      <div className="print-info-section">
        <div className="print-info-grid">
          <div className="print-info-item">
            <span className="print-label">Naziv:</span>
            <span className="print-value">{item.title}</span>
          </div>
          <div className="print-info-item">
            <span className="print-label">RN:</span>
            <span className="print-value">{getFormattedCode(item.code)}</span>
          </div>
          {item.registracija && (
            <div className="print-info-item">
              <span className="print-label">Registracija:</span>
              <span className="print-value">{item.registracija}</span>
            </div>
          )}
          {item.neto !== undefined && item.approvalStatus === 'odobreno' && (
            <div className="print-info-item">
              <span className="print-label">Razlika u vaganju:</span>
              <span className="print-value">
                {item.neto > 1000 ? '/' : `${item.neto}%`}
              </span>
            </div>
          )}
          {/* Add tezina field to printout in tons */}
          {item.tezina !== undefined && (
            <div className="print-info-item">
              <span className="print-label">Težina:</span>
              <span className="print-value">
                {(item.tezina / 1000).toFixed(3)} t
              </span>
            </div>
          )}
          <div className="print-info-item">
            <span className="print-label">Datum kreiranja:</span>
            <span className="print-value">
              {item.creationTime
                ? `${item.creationDate} ${item.creationTime}`
                : item.creationDate}
            </span>
          </div>
          <div className="print-info-item">
            <span className="print-label">Status:</span>
            <span className="print-value">{item.approvalStatus}</span>
          </div>
          {item.approvalStatus === 'odobreno' && (
            <>
              <div className="print-info-item">
                <span className="print-label">Odobrio:</span>
                <span className="print-value">
                  {item.approvedBy?.firstName} {item.approvedBy?.lastName}
                </span>
              </div>
              <div className="print-info-item">
                <span className="print-label">Datum odobrenja:</span>
                <span className="print-value">{item.approvalDate}</span>
              </div>
            </>
          )}
        </div>
      </div>
      {item.approvalStatus === 'odobreno' && (
        <>
          {(item.approvalPhotoFront?.url || item.approvalPhotoBack?.url) && (
            <div className="print-photos-section">
              {item.approvalPhotoFront?.url && (
                <div className="print-photo-container">
                  <img
                    src={getImageUrl(item.approvalPhotoFront.url)}
                    alt="Registracija"
                    className="print-photo"
                  />
                  <p className="print-photo-caption">Registracija</p>
                </div>
              )}
              {item.approvalPhotoBack?.url && (
                <div className="print-photo-container">
                  <img
                    src={getImageUrl(item.approvalPhotoBack.url)}
                    alt="Materijal"
                    className="print-photo"
                  />
                  <p className="print-photo-caption">Materijal</p>
                </div>
              )}
            </div>
          )}

          {item.approvalDocument?.url && (
            <div className="print-document-section">
              <div className="print-info-grid">
                <div className="print-info-item"></div>
                <div className="print-info-item">
                  <span className="print-label">Datum prilaganja:</span>
                  <span className="print-value">
                    {item.approvalDocument.uploadDate &&
                      new Date(
                        item.approvalDocument.uploadDate,
                      ).toLocaleDateString('hr-HR')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {item.approvalLocation && (
            <div className="print-location-section">
              {/* Location display would go here */}
            </div>
          )}
        </>
      )}
      <div className="print-footer">
        <p>Ispisano: {new Date().toLocaleString('hr-HR')}</p>
        <p>© Osijek-Koteks d.d. Sva prava pridržana.</p>
      </div>
    </div>
  );
};

export default PrintableItem;
