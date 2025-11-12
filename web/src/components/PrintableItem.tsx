// Updated PrintableItem.tsx with MM/DD/YYYY date formatting for print
import React from 'react';
import { Item } from '../types';
import { getImageUrl } from '../utils/api';
import { getFormattedCode, getCodeDescription } from '../utils/codeMapping';

interface PrintableItemProps {
  item: Item;
}

// Add the same date formatting functions as in the other components
const safeParseDate = (dateInput: any): string => {
  if (!dateInput) return 'N/A';

  let date: Date;

  try {
    // Handle MongoDB date objects with $date property
    if (typeof dateInput === 'object' && dateInput.$date) {
      date = new Date(dateInput.$date);
    }
    // Handle Date objects
    else if (dateInput instanceof Date) {
      date = dateInput;
    }
    // Handle string inputs
    else if (typeof dateInput === 'string') {
      // If it's already a US formatted date (MM/DD/YYYY), return as is
      if (dateInput.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        return dateInput;
      }

      // For ISO strings or other date formats, parse them
      date = new Date(dateInput);
    }
    // Handle any other type by converting to string and trying to parse
    else {
      date = new Date(String(dateInput));
    }

    // Check if parsing was successful
    if (isNaN(date.getTime())) {
      console.warn('Failed to parse date:', dateInput);
      return String(dateInput); // Return as string for debugging
    }

    // Format to US format for print: MM/DD/YYYY
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Zagreb',
    });
  } catch (error) {
    console.error('Error parsing date:', dateInput, error);
    return String(dateInput);
  }
};

const formatDateAndTime = (creationDate: any, creationTime?: string): string => {
  const formattedDate = safeParseDate(creationDate);

  if (!formattedDate || formattedDate === 'N/A') {
    console.warn('formatDateAndTime - failed to format date:', creationDate);
    const fallback = String(creationDate);
    return creationTime ? `${fallback} ${creationTime}` : fallback;
  }

  return creationTime ? `${formattedDate} ${creationTime}` : formattedDate;
};

const formatApprovalDate = (approvalDate: any): string => {
  if (!approvalDate) return 'N/A';

  let date: Date;

  try {
    if (typeof approvalDate === 'object' && approvalDate.$date) {
      date = new Date(approvalDate.$date);
    } else if (typeof approvalDate === 'string') {
      // If it's already formatted US datetime (MM/DD/YYYY HH:MM), return as is
      if (approvalDate.match(/^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}$/)) {
        return approvalDate;
      }
      date = new Date(approvalDate);
    } else {
      date = new Date(approvalDate);
    }

    if (isNaN(date.getTime())) {
      return String(approvalDate);
    }

    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zagreb',
    });
  } catch (error) {
    console.error('Error formatting approval date:', approvalDate, error);
    return String(approvalDate);
  }
};

const PrintableItem: React.FC<PrintableItemProps> = ({ item }) => {
  return (
    <div className="print-container">
      <div className="print-header">
        <img src="/images/logo.png" alt="Osijek-Koteks Logo" className="print-logo" />
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
              <span className="print-value">{item.neto > 1000 ? '/' : `${item.neto}%`}</span>
            </div>
          )}
          {/* Add tezina field to printout in tons */}
          {item.tezina !== undefined && (
            <div className="print-info-item">
              <span className="print-label">Težina:</span>
              <span className="print-value">{(item.tezina / 1000).toFixed(3)} t</span>
            </div>
          )}
          <div className="print-info-item">
            <span className="print-label">Datum kreiranja:</span>
            <span className="print-value">
              {/* FIXED: Use consistent date formatting */}
              {formatDateAndTime(item.creationDate, item.creationTime)}
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
                <span className="print-value">
                  {/* FIXED: Use consistent approval date formatting */}
                  {formatApprovalDate(item.approvalDate)}
                </span>
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
                    {/* FIXED: Use consistent date formatting for document upload date */}
                    {item.approvalDocument.uploadDate &&
                      safeParseDate(item.approvalDocument.uploadDate)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {item.approvalLocation && (
            <div className="print-location-section">{/* Location display would go here */}</div>
          )}
        </>
      )}

      <div className="print-footer">
        <p>
          Ispisano:{' '}
          {new Date().toLocaleString('en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Zagreb',
          })}
        </p>
        <p>Â© Osijek-Koteks d.d. Sva prava pridržana.</p>
      </div>
    </div>
  );
};

export default PrintableItem;