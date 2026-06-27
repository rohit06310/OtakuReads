// PDF upload utility for the OtakuReads admin panel
// Uses XMLHttpRequest to support upload progress reporting

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Upload a PDF file to the backend.
 * @param {File} file - The PDF File object from an input[type=file]
 * @param {function(number): void} [onProgress] - Optional callback receiving 0–100 percent
 * @returns {Promise<{ pdfUrl: string, filename: string, originalName: string, size: number }>}
 */
export const uploadPDF = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('pdf', file);

    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress && xhr.upload) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          resolve(data);
        } else {
          reject(new Error(data.error || `Upload failed with status ${xhr.status}`));
        }
      } catch {
        reject(new Error('Invalid response from server'));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error — could not reach the upload server'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload timed out'));
    };

    xhr.timeout = 5 * 60 * 1000; // 5 minute timeout for large PDFs

    xhr.open('POST', `${API_BASE_URL}/upload-pdf`);
    xhr.send(formData);
  });
};

/**
 * Delete a PDF file from the backend.
 * @param {string} filename - The stored filename (not the full URL)
 * @returns {Promise<void>}
 */
export const deletePDF = async (filename) => {
  const response = await fetch(`${API_BASE_URL}/delete-pdf/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to delete PDF');
  }
};

/**
 * Extract just the filename from a full PDF URL.
 * E.g. "http://localhost:5000/uploads/1234-book.pdf" → "1234-book.pdf"
 * @param {string} pdfUrl
 * @returns {string}
 */
export const extractFilename = (pdfUrl) => {
  if (!pdfUrl) return '';
  return pdfUrl.split('/').pop();
};

/**
 * Format bytes to a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
