'use client';

// Shared dependent Sub-Designation <select>. Renders nothing until a designation
// is chosen AND that designation has sub-designations — so it never clutters a
// form for designations that don't use sub-designations.
//
//   <SubDesignationSelect
//     designations={designations}
//     designationId={form.designationId}
//     value={form.subDesignationId}
//     onChange={v => setForm(f => ({ ...f, subDesignationId: v }))}
//     className={selectCls}
//   />
export interface DesignationWithSubs {
  id: number;
  name: string;
  SubDesignation?: Array<{ id: number; name: string; designationId?: number }>;
}

export function subsFor(designations: DesignationWithSubs[], designationId: string | number | null | undefined) {
  if (designationId === null || designationId === undefined || designationId === '') return [];
  return designations.find(d => String(d.id) === String(designationId))?.SubDesignation || [];
}

export function SubDesignationSelect({
  designations,
  designationId,
  value,
  onChange,
  className,
  label = 'Sub-Designation',
  noneLabel = 'None',
  labelClassName,
}: {
  designations: DesignationWithSubs[];
  designationId: string | number | null | undefined;
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  className?: string;
  label?: string;
  noneLabel?: string;
  labelClassName?: string;
}) {
  const subs = subsFor(designations, designationId);
  if (subs.length === 0) return null;
  return (
    <div>
      {label && <label className={labelClassName || 'block text-[10px] text-[#5a6878] mb-1'}>{label}</label>}
      <select className={className} value={value == null ? '' : String(value)} onChange={e => onChange(e.target.value)}>
        <option value="">{noneLabel}</option>
        {subs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  );
}
