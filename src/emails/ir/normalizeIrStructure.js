import { createId, createScanMeta, mergeBox } from './structureShared';
import { COMPONENT_TYPES } from '../partials/componentTypes';

const TEXT_LIKE_TYPES = new Set([
  COMPONENT_TYPES.PARAGRAPH,
  COMPONENT_TYPES.SPAN,
  COMPONENT_TYPES.HEADER,
  COMPONENT_TYPES.HEADER_1,
  COMPONENT_TYPES.HEADER_2,
  COMPONENT_TYPES.HEADER_3,
]);

const IMAGE_LIKE_TYPES = new Set([
  COMPONENT_TYPES.IMAGE,
]);

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
  return compactSingleColumnContentRuns(compactFooterRows(groupConsecutiveSingleNavRows(normalized)));
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

const getSingleColumnComponents = (row) => {
  if ((row?.columns || []).length !== 1) return null;
  return row.columns[0].components || [];
};

const isSingleNavRow = (row) => {
  const components = getSingleColumnComponents(row);
  return !!(components && components.length === 1 && components[0]?.type === COMPONENT_TYPES.LINK);
};

const getRowBackgroundKey = (row) => {
  const rowBg = row?.settings?.backgroundColor || '';
  const colBg = row?.columns?.[0]?.settings?.backgroundColor || '';
  const bg = rowBg || colBg || 'transparent';
  return `${bg}`.toLowerCase();
};

const isCompatibleSingleColumnContentRow = (row) => {
  const components = getSingleColumnComponents(row);
  if (!components || components.length === 0) return false;
  if (isSingleNavRow(row) || isLikelyFooterText(row)) return false;
  const allowed = components.every((component) => TEXT_LIKE_TYPES.has(component?.type) || IMAGE_LIKE_TYPES.has(component?.type));
  if (!allowed) return false;
  return components.length <= 2;
};

const compactSingleColumnContentRuns = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const result = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    if (!isCompatibleSingleColumnContentRow(row)) {
      result.push(row);
      i += 1;
      continue;
    }

    const baseBg = getRowBackgroundKey(row);
    let j = i;
    while (
      j < rows.length
      && isCompatibleSingleColumnContentRow(rows[j])
      && getRowBackgroundKey(rows[j]) === baseBg
    ) {
      j += 1;
    }

    const run = rows.slice(i, j);
    const totalComponents = run.reduce((count, currentRow) => count + ((currentRow.columns?.[0]?.components || []).length), 0);
    const hasImage = run.some((currentRow) => (currentRow.columns?.[0]?.components || []).some((component) => IMAGE_LIKE_TYPES.has(component?.type)));
    const hasText = run.some((currentRow) => (currentRow.columns?.[0]?.components || []).some((component) => TEXT_LIKE_TYPES.has(component?.type)));

    if (run.length >= 2 && totalComponents <= 6 && hasImage && hasText) {
      const baseColumn = run[0].columns[0];
      const mergedComponents = run.flatMap((contentRow) => (contentRow.columns[0]?.components || []).map((component) => ({
        ...component,
        id: createId(),
      })));
      result.push({
        ...run[0],
        id: createId(),
        columns: [{
          ...baseColumn,
          id: createId(),
          size: 12,
          components: mergedComponents,
        }],
        _scan: {
          ...((run[0]._scan) || createScanMeta(null, 'row')),
          reasons: Array.from(new Set([
            ...((run[0]._scan?.reasons) || []),
            'single_column_content_rows_compacted',
          ])),
        },
      });
    } else {
      result.push(...run);
    }
    i = j;
  }
  return result;
};

const getSingleTextComponent = (row) => {
  if ((row?.columns || []).length !== 1) return null;
  const components = row.columns[0].components || [];
  if (components.length !== 1) return null;
  const comp = components[0];
  if (!TEXT_LIKE_TYPES.has(comp?.type)) return null;
  return comp;
};

const isLikelyFooterText = (row) => {
  const comp = getSingleTextComponent(row);
  const text = `${comp?.content || ''}`.trim().toLowerCase();
  if (!text) return false;
  return (
    text.includes('unsubscribe')
    || text.includes('manage subscription')
    || text.includes('forward email')
    || text.includes('report abuse')
    || text.includes('benchmark')
    || text.includes('@')
    || text.includes('calle')
    || text.includes('los alamitos')
  );
};

const compactFooterRows = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const result = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    if (!isLikelyFooterText(row)) {
      result.push(row);
      i += 1;
      continue;
    }

    let j = i;
    while (j < rows.length && isLikelyFooterText(rows[j])) {
      j += 1;
    }

    const run = rows.slice(i, j);
    if (run.length >= 2) {
      const baseColumn = run[0].columns[0];
      const mergedComponents = run.flatMap((footerRow) => (footerRow.columns[0]?.components || []).map((component) => ({
        ...component,
        id: createId(),
      })));
      result.push({
        ...run[0],
        id: createId(),
        columns: [{
          ...baseColumn,
          id: createId(),
          size: 12,
          components: mergedComponents,
        }],
        _scan: {
          ...((run[0]._scan) || createScanMeta(null, 'row')),
          reasons: Array.from(new Set([
            ...((run[0]._scan?.reasons) || []),
            'footer_rows_compacted',
          ])),
        },
      });
    } else {
      result.push(run[0]);
    }
    i = j;
  }
  return result;
};
