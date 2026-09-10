import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

export async function exportPrescriptionToPdf(elementId: string, patientName: string = 'مريض') {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Check if element is hidden
  const isHidden = window.getComputedStyle(element).display === 'none' || element.offsetParent === null;
  const parent = element.parentElement;
  let originalParentStyle = '';

  try {
    if (isHidden && parent) {
      originalParentStyle = parent.getAttribute('style') || '';
      parent.setAttribute(
        'style',
        `${originalParentStyle}; display: block !important; position: fixed !important; left: -9999px !important; top: 0 !important; visibility: visible !important; opacity: 1 !important; z-index: -9999 !important;`
      );
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a5',
      orientation: 'portrait',
    });

    // A5 dimensions in mm: 148 x 210
    pdf.addImage(imgData, 'JPEG', 0, 0, 148, 210);
    pdf.save(`روشتة_${patientName || 'مريض'}.pdf`);
  } catch (error) {
    console.error('Failed to export prescription PDF, fallback to window.print():', error);
    window.print();
  } finally {
    if (isHidden && parent) {
      if (originalParentStyle) {
        parent.setAttribute('style', originalParentStyle);
      } else {
        parent.removeAttribute('style');
      }
    }
  }
}
