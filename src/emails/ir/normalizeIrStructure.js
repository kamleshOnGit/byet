import { createId, createScanMeta, mergeBox } from './structureShared';
import { COMPONENT_TYPES } from '../partials/componentTypes';

const promoteColumnNestedRow = (column, nestedRow) => ({
  ...nestedRow,
  id: createId(),
  columns: (nestedRow.columns || []).map((nestedColumn) => ({
    ...nestedColumn,
    id: createId(),
    settings: {
      ...(column.settings || {}),
      ...(nestedColumn.settings || {}),
      padding: mergeBox(column.settings?.padding || {}, nestedColumn.settings?.padding || {}),
      margin: mergeBox(column.settings?.margin || {}, nestedColumn.settings?.margin || {}),
    },
  })),
});

export const normalizeScannedRows = (rows, section) => {
  const normalized = [];

  rows.forEach((row) => {
    const singleColumnWithMultipleNestedRows = (
      (row.columns || []).length === 1
      && (row.columns[0].nestedRows || []).length > 1
      && (row.columns[0].components || []).length === 0
    );

    if (singleColumnWithMultipleNestedRows) {
      const wrapperColumn = row.columns[0];
      wrapperColumn.nestedRows.forEach((nestedRow) => {
        const expandedRow = {
          ...nestedRow,
          id: createId(),
          settings: {
            ...(row.settings || {}),
            ...(nestedRow.settings || {}),
            padding: mergeBox(row.settings?.padding || {}, nestedRow.settings?.padding || {}),
            margin: mergeBox(row.settings?.margin || {}, nestedRow.settings?.margin || {}),
          },
          _scan: {
            ...(nestedRow._scan || createScanMeta(null, 'row')),
            reasons: Array.from(new Set([...((nestedRow._scan?.reasons) || []), 'expanded_from_multi_nested_wrapper'])),
            confidence: 0.78,
          },
        };
        const subNormalized = normalizeScannedRows([expandedRow], section);
        normalized.push(...subNormalized);
      });
      return;
    }

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
  return groupConsecutiveSingleNavRows(normalized);
};

const groupConsecutiveSingleNavRows = (rows) => {
  const result = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    const isNavRow = (
      (row.columns || []).length === 1
      && (row.columns[0].components || []).length === 1
      && row.columns[0].components[0]?.type === COMPONENT_TYPES.LINK
    );
    if (!isNavRow) {
      result.push(row);
      i++;
      continue;
    }
    let j = i;
    while (
      j < rows.length
      && (rows[j].columns || []).length === 1
      && (rows[j].columns[0].components || []).length === 1
      && rows[j].columns[0].components[0]?.type === COMPONENT_TYPES.LINK
    ) {
      j++;
    }
    const run = rows.slice(i, j);
    if (run.length >= 2) {
      const colSize = Math.max(1, Math.floor(12 / run.length));
      result.push({
        ...run[0],
        id: createId(),
        columns: run.map((r) => ({ ...r.columns[0], id: createId(), size: colSize })),
        _scan: { ...((run[0]._scan) || {}), reasons: [...((run[0]._scan?.reasons) || []), 'nav_rows_combined'] },
      });
    } else {
      result.push(run[0]);
    }
    i = j;
  }
  return result;
};
