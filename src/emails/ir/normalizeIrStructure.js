import { createId, createScanMeta, mergeBox } from './structureShared';

export const normalizeScannedRows = (rows, section) => {
  const normalized = [];
  rows.forEach((row) => {
    const promotedColumns = [];
    let usedPromotion = false;

    (row.columns || []).forEach((column) => {
      if ((column.nestedRows || []).length === 1 && (column.components || []).length === 0) {
        const nestedRow = column.nestedRows[0];
        promotedColumns.push(...(nestedRow.columns || []).map((nestedColumn) => ({
          ...nestedColumn,
          id: createId(),
          settings: {
            ...(column.settings || {}),
            ...(nestedColumn.settings || {}),
            padding: mergeBox(column.settings?.padding || {}, nestedColumn.settings?.padding || {}),
            margin: mergeBox(column.settings?.margin || {}, nestedColumn.settings?.margin || {}),
          },
        })));
        usedPromotion = true;
      } else {
        promotedColumns.push(column);
      }
    });

    normalized.push({
      ...row,
      id: createId(),
      columns: promotedColumns,
      _scan: {
        ...(row._scan || createScanMeta(null, 'row')),
        reasons: Array.from(new Set([
          ...((row._scan?.reasons) || []),
          ...(usedPromotion ? ['normalized_promoted_nested_columns'] : ['normalized_row']),
        ])),
        confidence: usedPromotion ? Math.min(0.88, Math.max(row._scan?.confidence || 0.7, 0.78)) : (row._scan?.confidence || 0.8),
      },
      settings: usedPromotion
        ? {
            ...(section?.settings || {}),
            ...(row.settings || {}),
            padding: mergeBox(section?.settings?.padding || {}, row.settings?.padding || {}),
            margin: mergeBox(section?.settings?.margin || {}, row.settings?.margin || {}),
          }
        : row.settings,
    });
  });
  return normalized;
};
