/**
 * printPrescription.ts
 * Dedicated, robust print engine for A5 Prescriptions.
 * Solves iframe sandboxing, modal overlays, CSS print-media conflicts,
 * and cross-browser preview/printing issues by rendering a clean,
 * isolated printable A5 document in an invisible iframe.
 */

export interface PrintPrescriptionData {
  config: {
    doctorName?: string;
    doctorNameEn?: string;
    specialtyAr?: string;
    specialtyEn?: string;
    degreesAr?: string;
    degreesEn?: string;
    phone?: string;
    logoUrl?: string | null;
    showLogo?: boolean;
    showHeader?: boolean;
    showFooter?: boolean;
    preprintedPaperMode?: boolean;
    showQr?: boolean;
    qrType?: string;
    footerFontSize?: string;
    outerMargin?: string;
    headerMarginTop?: string;
    footerMarginBottom?: string;
    sectionSpacing?: string;
    branches?: Array<{
      id?: string;
      name: string;
      address?: string;
      phone: string;
    }>;
  };
  patient?: {
    name?: string;
    age?: number | string;
    phone?: string;
  } | null;
  items?: Array<{
    id?: string;
    drugName: string;
    scientificName?: string;
    dosage?: string;
    dosageInstructions?: string;
    timing?: string;
    duration?: string;
    dosageForm?: string;
    strength?: string;
    notes?: string;
  }>;
  diagnoses?: Array<{
    id?: string;
    code?: string;
    nameAr?: string;
    nameEn?: string;
    isPrimary?: boolean;
  }>;
  lifestyleAdvice?: string;
  followupDate?: string;
}

const MARGIN_MAP: Record<string, string> = {
  very_tight: '2mm',
  tight: '4mm',
  normal: '7mm',
  wide: '10mm',
  very_wide: '14mm',
  balanced: '7mm',
};

export function printPrescriptionDocument(data: PrintPrescriptionData) {
  const { config, patient, items = [], diagnoses = [], lifestyleAdvice, followupDate } = data;

  const outerMargin = MARGIN_MAP[config.outerMargin || 'normal'] || '7mm';
  const headerMargin = config.preprintedPaperMode
    ? '25mm'
    : MARGIN_MAP[config.headerMarginTop || 'balanced'] || '7mm';
  const footerMargin = config.preprintedPaperMode
    ? '20mm'
    : MARGIN_MAP[config.footerMarginBottom || 'balanced'] || '7mm';

  const spacingClass =
    config.sectionSpacing === 'compact'
      ? '8px'
      : config.sectionSpacing === 'comfortable'
      ? '18px'
      : '12px';

  const footerSize =
    config.footerFontSize === 'small'
      ? '9px'
      : config.footerFontSize === 'large'
      ? '12px'
      : '10.5px';

  // Build items HTML
  const itemsHtml = items.length > 0
    ? items.map((it, idx) => `
        <div style="padding: 6px 10px; margin-bottom: 6px; border: 1px solid #e2e8f0; border-radius: 6px; background-color: #f8fafc; text-align: right;">
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">
            ${idx + 1}. ${it.drugName || ''} ${it.strength || ''} ${it.dosageForm || ''} ${it.scientificName ? `<span style="font-size: 11px; font-weight: normal; color: #475569;">(${it.scientificName})</span>` : ''}
          </div>
          <div style="font-size: 11.5px; color: #0f766e; font-weight: 600;">
            ${it.dosageInstructions || it.dosage || ''} ${it.timing ? `&bull; ${it.timing}` : ''} ${it.duration ? `&bull; لمدة ${it.duration}` : ''}
          </div>
          ${it.notes ? `<div style="font-size: 10px; color: #64748b; font-style: italic; margin-top: 2px;">توجيهات: ${it.notes}</div>` : ''}
        </div>
      `).join('')
    : '<div style="text-align: center; padding: 25px 0; color: #94a3b8; font-size: 12px;">لا توجد أدوية مضافة للروشتة حالياً.</div>';

  // Build diagnoses HTML
  const diagnosesHtml = diagnoses.length > 0
    ? `
      <div style="padding: 6px 10px; margin-top: 8px; border: 1px solid #e2e8f0; border-radius: 6px; background-color: #f8fafc; font-size: 11px; text-align: right; color: #1e293b;">
        <strong style="color: #475569;">التشخيص الطبي:</strong> ${diagnoses.map(d => d.nameAr || d.nameEn || d.code).join('، ')}
      </div>
    `
    : '';

  // Advice HTML
  const adviceHtml = lifestyleAdvice
    ? `
      <div style="padding: 6px 10px; margin-top: 6px; border: 1px solid #ccfbf1; border-radius: 6px; background-color: #f0fdfa; font-size: 11px; text-align: right; color: #134e4a;">
        <strong style="color: #0f766e;">تعليمات طبية:</strong> ${lifestyleAdvice}
      </div>
    `
    : '';

  // Follow-up HTML
  const followupHtml = followupDate
    ? `
      <div style="padding: 6px 10px; margin-top: 6px; border: 1px solid #fef3c7; border-radius: 6px; background-color: #fffbeb; font-size: 11px; text-align: right; color: #78350f; font-weight: 600;">
        موعد الاستشارة القادمة: ${followupDate}
      </div>
    `
    : '';

  // Branches HTML
  const branchesHtml = (config.branches || [])
    .map(b => `
      <div style="margin-bottom: 2px;">
        <strong style="color: #0f172a;">${b.name}:</strong>
        <span>${b.address || ''}</span>
        <span style="font-family: monospace; font-weight: 700; color: #0d9488; direction: ltr; display: inline-block;">${b.phone}</span>
      </div>
    `)
    .join('');

  // Complete HTML document optimized for standard A5 printing
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>روشتة_${patient?.name || 'مريض'}</title>
      <style>
        @page {
          size: A5 portrait;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          color: #0f172a;
          font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          width: 148mm;
          height: 210mm;
          min-height: 210mm;
          max-height: 210mm;
          overflow: hidden;
        }
        .a5-container {
          width: 148mm;
          height: 210mm;
          min-height: 210mm;
          max-height: 210mm;
          padding-left: ${outerMargin};
          padding-right: ${outerMargin};
          padding-top: ${headerMargin};
          padding-bottom: ${footerMargin};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #ffffff;
        }
        .header {
          border-bottom: 2.5px solid #00c2cb;
          padding-bottom: 8px;
          margin-bottom: 6px;
        }
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }
        .doctor-ar {
          flex: 1;
          text-align: right;
        }
        .doctor-en {
          flex: 1;
          text-align: left;
          direction: ltr;
        }
        .doctor-name {
          font-size: 15px;
          font-weight: 800;
          color: #020617;
          margin: 0 0 2px 0;
        }
        .doctor-title {
          font-size: 11.5px;
          font-weight: 700;
          color: #008f97;
          margin: 0 0 3px 0;
        }
        .doctor-credentials {
          font-size: 9.5px;
          color: #475569;
          line-height: 1.35;
          margin: 0;
          white-space: pre-line;
        }
        .logo-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 50px;
        }
        .logo-img {
          width: 44px;
          height: 44px;
          object-fit: contain;
        }
        .logo-fallback {
          width: 38px;
          height: 38px;
          background: #020617;
          color: #00c2cb;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 18px;
        }
        .patient-bar {
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 6px 12px;
          margin-bottom: ${spacingClass};
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
        }
        .rx-symbol {
          font-family: Georgia, serif;
          font-size: 22px;
          font-weight: 900;
          font-style: italic;
          color: #008f97;
          margin-left: 6px;
        }
        .rx-header {
          display: flex;
          align-items: center;
          border-bottom: 1.5px solid #e2e8f0;
          padding-bottom: 3px;
          margin-bottom: 8px;
        }
        .content-body {
          flex: 1;
          overflow: hidden;
        }
        .footer {
          border-top: 2.5px solid #00c2cb;
          padding-top: 6px;
          margin-top: 6px;
        }
        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-size: ${footerSize};
          color: #475569;
        }
        .qr-code {
          width: 44px;
          height: 44px;
        }
      </style>
    </head>
    <body>
      <div class="a5-container">
        <!-- Top Section -->
        <div>
          ${!config.preprintedPaperMode && config.showHeader ? `
            <div class="header">
              <div class="header-content">
                <div class="doctor-ar">
                  <div class="doctor-name">${config.doctorName || 'د. حازم القاضي'}</div>
                  <div class="doctor-title">${config.specialtyAr || 'استشاري أمراض الباطنة والقلب'}</div>
                  <div class="doctor-credentials">${config.degreesAr || 'دكتوراه أمراض القلب • زميل الكلية الملكية للأطباء'}</div>
                </div>

                ${config.showLogo ? `
                  <div class="logo-box">
                    ${config.logoUrl ? `<img src="${config.logoUrl}" class="logo-img" alt="Logo" />` : '<div class="logo-fallback">Rx</div>'}
                    <div style="font-size: 7px; font-weight: bold; color: #94a3b8; margin-top: 2px; text-transform: uppercase;">SOLI CLINIC</div>
                  </div>
                ` : ''}

                <div class="doctor-en">
                  <div class="doctor-name">${config.doctorNameEn || 'Dr. Hazem El-Kady'}</div>
                  <div class="doctor-title">${config.specialtyEn || 'Consultant of Cardiology'}</div>
                  <div class="doctor-credentials">${config.degreesEn || 'M.D., MRCP (London)'}</div>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Patient Meta Strip -->
          <div class="patient-bar">
            <div><strong>المريض:</strong> ${patient?.name || 'مريض غير مسجل'}</div>
            <div><strong>السن:</strong> ${patient?.age ? `${patient.age} سنة` : '-'}</div>
            <div><strong>التاريخ:</strong> <span style="font-family: monospace;">${new Date().toLocaleDateString('ar-EG')}</span></div>
          </div>
        </div>

        <!-- Middle Section: Medications -->
        <div class="content-body">
          <div class="rx-header">
            <span class="rx-symbol">℞</span>
            <span style="font-size: 11px; font-weight: bold; color: #64748b; letter-spacing: 0.5px;">العلاج الدوائي الموصوف</span>
          </div>

          <div style="overflow: hidden;">
            ${itemsHtml}
            ${diagnosesHtml}
            ${adviceHtml}
            ${followupHtml}
          </div>
        </div>

        <!-- Bottom Section: Footer -->
        ${!config.preprintedPaperMode && config.showFooter ? `
          <div class="footer">
            <div class="footer-content">
              <div style="flex: 1; text-align: right;">
                ${branchesHtml}
                <div style="color: #64748b; margin-top: 2px;">
                  للحجز والاستفسار: <strong style="color: #0f172a; font-family: monospace;">${config.phone || '01092847162'}</strong>
                </div>
              </div>

              ${config.showQr ? `
                <div style="display: flex; flex-direction: column; align-items: center; margin-right: 8px;">
                  <div style="width: 44px; height: 44px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px; background: #fff; display: flex; align-items: center; justify-content: center;">
                    <svg viewBox="0 0 100 100" class="qr-code" fill="#0f172a">
                      <path d="M10 10h30v30h-30zM15 15v20h20v-20zM22 22h6v6h-6zM60 10h30v30h-30zM65 15v20h20v-20zM72 22h6v6h-6zM10 60h30v30h-30zM15 65v20h20v-20zM22 72h6v6h-6zM60 60h10v10h-10zM80 60h10v10h-10zM70 70h10v10h-10zM60 80h10v10h-10zM80 80h10v10h-10zM45 10h10v80h-10z" />
                    </svg>
                  </div>
                  <div style="font-size: 7px; color: #64748b; font-weight: bold; margin-top: 2px;">
                    ${config.qrType === 'whatsapp' ? 'واتساب العيادة' : 'موقع العيادة'}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;

  // Create an invisible iframe to execute the print job cleanly
  const existingFrame = document.getElementById('soli-print-iframe');
  if (existingFrame) {
    existingFrame.remove();
  }

  const printIframe = document.createElement('iframe');
  printIframe.id = 'soli-print-iframe';
  printIframe.style.position = 'fixed';
  printIframe.style.top = '-9999px';
  printIframe.style.left = '-9999px';
  printIframe.style.width = '148mm';
  printIframe.style.height = '210mm';
  printIframe.style.border = 'none';
  printIframe.style.zIndex = '-9999';

  document.body.appendChild(printIframe);

  const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
  if (!iframeDoc) {
    // Fallback if iframe access fails
    window.print();
    return;
  }

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  // Wait for assets/fonts to render, then print
  setTimeout(() => {
    try {
      if (printIframe.contentWindow) {
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
      } else {
        window.print();
      }
    } catch (err) {
      console.warn('Iframe print failed, falling back to window.print():', err);
      window.print();
    }
  }, 250);
}
