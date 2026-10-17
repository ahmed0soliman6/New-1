import type { DocumentSnapshot, QuerySnapshot } from 'firebase/firestore';

type Row = { label: string; docs: number; snaps: number };
const rows = new Map<string, Row>();

const enabled = () => {
  try {
    return import.meta.env.DEV || localStorage.getItem('soli_read_meter') === '1';
  } catch {
    return false;
  }
};

function bump(label: string, n: number) {
  const r = rows.get(label) ?? { label, docs: 0, snaps: 0 };
  r.docs += n;
  r.snaps += 1;
  rows.set(label, r);
}

/** يُحسب فقط ما جاء من الخادم (القراءات من الكاش المحلي مجانية) */
export function meterQuery(label: string, snap: QuerySnapshot) {
  if (!enabled() || snap.metadata.fromCache) return;
  bump(label, snap.docChanges().length);
}

export function meterDoc(label: string, snap: DocumentSnapshot) {
  if (!enabled() || snap.metadata.fromCache) return;
  bump(label, 1);
}

if (typeof window !== 'undefined') {
  (window as any).__soliReads = () => {
    const list = [...rows.values()].sort((a, b) => b.docs - a.docs);
    console.table(list.map((r) => ({ المصدر: r.label, قراءات_مقدرة: r.docs, تحديثات: r.snaps })));
    const total = list.reduce((s, r) => s + r.docs, 0);
    console.log('الإجمالي التقديري لهذه الجلسة:', total);
    return total;
  };
  (window as any).__soliReadsReset = () => rows.clear();
}
