import React from 'react';
import DocumentCategoryPage from './DocumentCategoryPage';

export default function KontrakProvider() {
  return (
    <DocumentCategoryPage
      moduleKey="doc-kontrak-provider"
      category="Kontrak"
      scope="provider"
      title="Contract — Provider"
      description="Kontrak dengan mitra / provider layanan."
      breadcrumb={[{ label: 'Dokumen & Arsip' }, { label: 'Contract' }, { label: 'Provider' }]}
    />
  );
}
