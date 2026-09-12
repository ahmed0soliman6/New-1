import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface QrCodeImageProps {
  qrType: 'whatsapp' | 'custom' | string;
  qrWhatsappPhone: string;
  qrCustomUrl: string;
  className?: string;
}

export const QrCodeImage: React.FC<QrCodeImageProps> = ({
  qrType,
  qrWhatsappPhone,
  qrCustomUrl,
  className = "w-full h-full",
}) => {
  const [svgStr, setSvgStr] = useState<string>('');

  useEffect(() => {
    let active = true;
    const generate = async () => {
      try {
        let link = qrCustomUrl || 'https://solimedical.com';
        if (qrType === 'whatsapp') {
          const clean = qrWhatsappPhone.replace(/\D/g, '');
          const formatted = clean.startsWith('0') ? `2${clean}` : clean;
          link = `https://wa.me/${formatted}`;
        }

        const result = await QRCode.toString(link, {
          type: 'svg',
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        });

        if (active) {
          setSvgStr(result);
        }
      } catch (err) {
        console.error('QR generation failed in component:', err);
      }
    };
    generate();
    return () => {
      active = false;
    };
  }, [qrType, qrWhatsappPhone, qrCustomUrl]);

  if (!svgStr) {
    // Fallback standard QR mockup icon
    return (
      <svg
        viewBox="0 0 100 100"
        className={`${className} text-slate-900`}
        fill="currentColor"
      >
        <path d="M10 10h30v30h-30zM15 15v20h20v-20zM22 22h6v6h-6zM60 10h30v30h-30zM65 15v20h20v-20zM72 22h6v6h-6zM10 60h30v30h-30zM15 65v20h20v-20zM22 72h6v6h-6zM60 60h10v10h-10zM80 60h10v10h-10zM70 70h10v10h-10zM60 80h10v10h-10zM80 80h10v10h-10zM45 10h10v80h-10z" />
      </svg>
    );
  }

  return (
    <div
      className={`${className} [&_svg]:w-full [&_svg]:h-full [&_svg]:block`}
      dangerouslySetInnerHTML={{ __html: svgStr }}
    />
  );
};
