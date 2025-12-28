// src/components/admin/Placeholder.tsx

import React from 'react';

export default function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <div className="p-6 border border-dashed rounded">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="opacity-80">UI en cours. Aucune logique métier impactée.{note ? ' ' + note : ''}</p>
    </div>
  );
}