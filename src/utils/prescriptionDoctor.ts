import { useState, useEffect } from 'react';
import { CLINIC_INFO } from '../data/previewClinicData';

export interface PrescriptionDoctorInfo {
  doctorName: string;
  doctorNameEn: string;
  specialtyAr: string;
  specialtyEn: string;
  degreesAr: string;
  degreesEn: string;
  phone: string;
  logoUrl: string | null;
}

export function getPrescriptionDoctorInfo(): PrescriptionDoctorInfo {
  const fallback: PrescriptionDoctorInfo = {
    doctorName: CLINIC_INFO.doctorName || 'طبيب العيادة',
    doctorNameEn: 'Clinic Doctor',
    specialtyAr: CLINIC_INFO.doctorTitle || 'التخصص الطبي العام للعيادة',
    specialtyEn: 'Clinic Medical Specialty',
    degreesAr: CLINIC_INFO.doctorCredentials || 'الدرجات العلمية والشهادات المهنية المسجلة للعيادة',
    degreesEn: 'Registered Medical Degrees & Professional Credentials',
    phone: CLINIC_INFO.branches?.[0]?.mobile || '',
    logoUrl: CLINIC_INFO.logoUrl || null,
  };

  try {
    const cached = localStorage.getItem('soli_prescription_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        doctorName: parsed.doctorName?.trim() || fallback.doctorName,
        doctorNameEn: parsed.doctorNameEn?.trim() || fallback.doctorNameEn,
        specialtyAr: parsed.specialtyAr?.trim() || fallback.specialtyAr,
        specialtyEn: parsed.specialtyEn?.trim() || fallback.specialtyEn,
        degreesAr: parsed.degreesAr?.trim() || fallback.degreesAr,
        degreesEn: parsed.degreesEn?.trim() || fallback.degreesEn,
        phone: parsed.phone?.trim() || fallback.phone,
        logoUrl: parsed.logoUrl || fallback.logoUrl,
      };
    }
  } catch {
    // Ignore JSON parse errors
  }

  return fallback;
}

export function usePrescriptionDoctor(): PrescriptionDoctorInfo {
  const [info, setInfo] = useState<PrescriptionDoctorInfo>(getPrescriptionDoctorInfo);

  useEffect(() => {
    const handleUpdate = () => {
      setInfo(getPrescriptionDoctorInfo());
    };

    window.addEventListener('soli_prescription_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('soli_prescription_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return info;
}
