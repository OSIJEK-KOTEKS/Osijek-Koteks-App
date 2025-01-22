import React from 'react';
import {Item} from '../types';
import {getImageUrl} from '../utils/api';

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
            <span className="print-value">{item.code}</span>
          </div>
          {item.registracija && (
            <div className="print-info-item">
              <span className="print-label">Registracija:</span>
              <span className="print-value">{item.registracija}</span>
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

          {item.approvalLocation && (
            <div className="print-location-section">
              <h3>Lokacija odobrenja</h3>
              <div className="print-info-grid">
                <div className="print-info-item">
                  <span className="print-label">Geografska širina:</span>
                  <span className="print-value">
                    {item.approvalLocation.coordinates.latitude.toFixed(6)}°
                  </span>
                </div>
                <div className="print-info-item">
                  <span className="print-label">Geografska dužina:</span>
                  <span className="print-value">
                    {item.approvalLocation.coordinates.longitude.toFixed(6)}°
                  </span>
                </div>
                <div className="print-info-item">
                  <span className="print-label">Preciznost:</span>
                  <span className="print-value">
                    {Math.round(item.approvalLocation.accuracy)}m
                  </span>
                </div>
                <div className="print-info-item">
                  <span className="print-label">Vrijeme:</span>
                  <span className="print-value">
                    {new Date(item.approvalLocation.timestamp).toLocaleString(
                      'hr-HR',
                    )}
                  </span>
                </div>
              </div>
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
