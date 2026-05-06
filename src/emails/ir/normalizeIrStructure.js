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

const TEXT_LIKE_OR_LINK = new Set([...TEXT_LIKE_TYPES, COMPONENT_TYPES.LINK]);

const VISUAL_NO_CONTENT_TYPES = new Set([
  COMPONENT_TYPES.DIVIDER,
  COMPONENT_TYPES.SPACER,
  COMPONENT_TYPES.HORIZONTAL_LINE,
].filter(Boolean));

const isMeaningfulComponent = (comp) => {
  if (!comp) return false;
  if (VISUAL_NO_CONTENT_TYPES.has(comp.type)) return true;
  const text = `${comp.content || ''}`.replace(/\s|&nbsp;/g, '');
  if (text.length > 0) return true;
  if (comp.imageUrl) return true;
  if (comp.linkUrl) return true;
  if (comp.htmlContent && `${comp.htmlContent}`.replace(/<[^>]+>|\s/g, '').length > 0) return true;
  return false;
};

const columnHasMeaningfulComponents = (column) => (column?.components || []).some(isMeaningfulComponent);

const liftColumnNestedRows = (column) => {
  if (!column?.nestedRows?.length) return column;
  const nestedComponents = column.nestedRows.flatMap((nestedRow) => (
    (nestedRow.columns || [])
      .flatMap((nestedColumn) => (nestedColumn.components || []).filter(isMeaningfulComponent))
  ));
  if (nestedComponents.length === 0) return column;
  return {
    ...column,
    components: [...(column.components || []), ...nestedComponents],
    nestedRows: [],
  };
};

const isMeaningfulRow = (row) => {
  if (!row) return false;
  const columns = row.columns || [];
  if (columns.some(columnHasMeaningfulComponents)) return true;
  if (columns.some((column) => (column.nestedRows || []).some(isMeaningfulRow))) return true;
  return false;
};

const rowHasSemanticGrouping = (row) => {
  const reasons = row?._scan?.reasons || [];
  return reasons.some((reason) => ['semantic_group_rows_preserved', 'grouped_semantic_table_rows_preserved'].includes(reason));
};

const getSingleSemanticColumn = (row) => (row?.columns?.length === 1 ? row.columns[0] : null);
const getSingleSemanticComponents = (row) => (getSingleSemanticColumn(row)?.components || []);
const getRowTextLength = (row) => getSingleSemanticComponents(row).reduce((sum, component) => (
  sum + (`${component.content || ''}`.replace(/\s+/g, ' ').trim().length)
), 0);
const isImageOnlyRow = (row) => {
  const components = getSingleSemanticComponents(row);
  return components.length === 1 && IMAGE_LIKE_TYPES.has(components[0]?.type);
};
const isTextOnlyRow = (row) => {
  const components = getSingleSemanticComponents(row);
  if (components.length === 0) return false;
  if (!components.every((component) => TEXT_LIKE_OR_LINK.has(component.type))) return false;
  const totalLength = getRowTextLength(row);
  return totalLength > 0 && totalLength < 200;
};

const createMergedRow = (imageRow, textRow) => {
  const imageColumn = getSingleSemanticColumn(imageRow);
  const textColumn = getSingleSemanticColumn(textRow);
  if (!imageColumn || !textColumn) return imageRow;
  const imageSize = Math.max(1, Math.min(11, Math.round((Number(imageColumn.size) || 12) / 2)));
  const textSize = 12 - imageSize;
  return {
    ...imageRow,
    id: createId(),
    columns: [
      {
        ...imageColumn,
        size: imageSize,
        components: [...(imageColumn.components || [])],
        nestedRows: [],
      },
      {
        ...textColumn,
        size: textSize,
        components: [...(textColumn.components || [])],
        nestedRows: [],
      },
    ],
    _scan: {
      ...(imageRow._scan || createScanMeta(null, 'row')),
      reasons: Array.from(new Set([
        ...(imageRow._scan?.reasons || []),
        ...(textRow._scan?.reasons || []),
        'merged_image_text_rows',
      ])),
    },
  };
};

const mergeImageTextRows = (rows) => {
  const merged = [];
  let i = 0;
  while (i < rows.length) {
    const current = rows[i];
    const next = rows[i + 1];
    if (isImageOnlyRow(current) && next && isTextOnlyRow(next)) {
      merged.push(createMergedRow(current, next));
      i += 2;
      continue;
    }
    merged.push(current);
    i += 1;
  }
  return merged;
};


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
      const nestedRowsToExpand = rowHasSemanticGrouping(row)
        ? (wrapperColumn.nestedRows || []).filter(isMeaningfulRow)
        : (wrapperColumn.nestedRows || []);
      nestedRowsToExpand.forEach((nestedRow) => {
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
        normalized.push(...subNormalized.filter(isMeaningfulRow));
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

    const cleanedColumnsRaw = promotedColumns.map((column) => {
      const filteredNestedRows = (column.nestedRows || []).filter(isMeaningfulRow);
      const filteredComponents = (column.components || []).filter(isMeaningfulComponent);
      if (filteredComponents.length === 0) {
        const lifted = filteredNestedRows.flatMap((nestedRow) => (
          (nestedRow.columns || [])
            .filter((nestedColumn) => columnHasMeaningfulComponents(nestedColumn))
            .flatMap((nestedColumn) => (nestedColumn.components || []).filter(isMeaningfulComponent))
        ));
        if (lifted.length > 0) {
          return {
            ...column,
            components: lifted,
            nestedRows: [],
          };
        }
      }
      return {
        ...column,
        components: filteredComponents,
        nestedRows: filteredNestedRows,
      };
    });
    const liftedColumns = cleanedColumnsRaw.map(liftColumnNestedRows);
    const nonEmptyColumns = liftedColumns.filter(
      (column) => (column.components || []).length > 0 || (column.nestedRows || []).length > 0,
    );
    const cleanedColumns = (() => {
      if (nonEmptyColumns.length === 0) return liftedColumns;
      if (nonEmptyColumns.length === liftedColumns.length) return liftedColumns;
      if (nonEmptyColumns.length === cleanedColumnsRaw.length) return cleanedColumnsRaw;
      const totalSize = nonEmptyColumns.reduce((sum, c) => sum + (Number(c.size) || 0), 0);
      const baseSize = totalSize > 0 && totalSize <= 12
        ? null
        : Math.floor(12 / nonEmptyColumns.length);
      return nonEmptyColumns.map((column, idx) => ({
        ...column,
        size: baseSize == null
          ? Math.max(1, Math.round(((Number(column.size) || 1) / totalSize) * 12))
          : (idx === nonEmptyColumns.length - 1
              ? 12 - baseSize * (nonEmptyColumns.length - 1)
              : baseSize),
      }));
    })();

    const normalizedRow = {
      ...row,
      id: createId(),
      columns: cleanedColumns,
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
    };

    if (isMeaningfulRow(normalizedRow)) {
      normalized.push(normalizedRow);
    }
  });
  const flattened = flattenResidualNestedRows(normalized, section);
  const merged = mergeImageTextRows(flattened);
  const grouped = groupConsecutiveSingleNavRows(merged);
  const footerCompacted = compactFooterRows(grouped);
  const final = compactSingleColumnContentRuns(footerCompacted);
  console.log('[normalize debug final rows]', final.map((row) => ({
    reasons: row._scan?.reasons,
    columns: (row.columns || []).map((column) => ({
      size: column.size,
      types: (column.components || []).map((component) => component.type),
      contents: (column.components || []).map((component) => component.content),
    })),
  })));
  return final;
};

const flattenResidualNestedRows = (rows, section) => {
  const result = [];
  rows.forEach((row) => {
    const columns = row.columns || [];
    const allColumnsAreNestedOnly = columns.length > 0
      && columns.every((col) => (col.components || []).length === 0 && (col.nestedRows || []).length > 0);
    if (allColumnsAreNestedOnly) {
      columns.forEach((col) => {
        const expanded = (col.nestedRows || []).filter(isMeaningfulRow).map((nested) => ({
          ...nested,
          id: createId(),
          settings: {
            ...(row.settings || {}),
            ...(nested.settings || {}),
          },
          _scan: {
            ...(nested._scan || createScanMeta(null, 'row')),
            reasons: Array.from(new Set([...((nested._scan?.reasons) || []), 'residual_nested_flattened'])),
          },
        }));
        const subFlattened = flattenResidualNestedRows(expanded, section);
        result.push(...subFlattened);
      });
      return;
    }
    result.push(row);
  });
  return result.filter(isMeaningfulRow);
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

const getRowText = (row) => (row?.columns?.[0]?.components || [])
  .map((component) => `${component.content || ''}`.trim())
  .filter(Boolean)
  .join(' ');

const isLikelySectionHeading = (row) => {
  const text = getRowText(row);
  if (!text) return false;
  const cleaned = text.replace(/[^A-Za-z0-9 ]+/g, ' ').trim();
  if (!cleaned || cleaned.length > 50) return false;
  const words = cleaned.split(/\s+/).slice(0, 4);
  if (words.length === 0) return false;
  const uppercaseWords = words.filter((word) => word.length >= 3 && word === word.toUpperCase());
  const capitalizedWords = words.filter((word) => /^[A-Z][a-z]/.test(word));
  if (uppercaseWords.length / words.length >= 0.5) return true;
  if (capitalizedWords.length >= 2) return true;
  const keywords = new Set(['more', 'special', 'discover', 'hero', 'banner', 'offers', 'categories', 'bikes', 'kids']);
  if (words.some((word) => keywords.has(word.toLowerCase()))) return true;
  return false;
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
    const processSegment = (segmentRows) => {
      if (!segmentRows.length) return [];
      const totalComponents = segmentRows.reduce((count, currentRow) => count + ((currentRow.columns?.[0]?.components || []).length), 0);
      const hasImage = segmentRows.some((currentRow) => (currentRow.columns?.[0]?.components || []).some((component) => IMAGE_LIKE_TYPES.has(component?.type)));
      const hasText = segmentRows.some((currentRow) => (currentRow.columns?.[0]?.components || []).some((component) => TEXT_LIKE_TYPES.has(component?.type)));
      const imageRowCount = segmentRows.filter((currentRow) => (currentRow.columns?.[0]?.components || []).every((component) => IMAGE_LIKE_TYPES.has(component?.type))).length;
      if (segmentRows.length >= 2 && totalComponents <= 6 && hasImage && hasText && imageRowCount <= 1) {
        const baseColumn = segmentRows[0].columns[0];
        const mergedComponents = segmentRows.flatMap((contentRow) => (contentRow.columns[0]?.components || []).map((component) => ({
          ...component,
          id: createId(),
        })));
        return [{
          ...segmentRows[0],
          id: createId(),
          columns: [{
            ...baseColumn,
            id: createId(),
            size: 12,
            components: mergedComponents,
          }],
          _scan: {
            ...((segmentRows[0]._scan) || createScanMeta(null, 'row')),
            reasons: Array.from(new Set([
              ...((segmentRows[0]._scan?.reasons) || []),
              'single_column_content_rows_compacted',
            ])),
          },
        }];
      }
      return segmentRows;
    };

    const segmentResults = [];
    let currentSegment = [];
    run.forEach((contentRow) => {
      if (isLikelySectionHeading(contentRow)) {
        if (currentSegment.length > 0) {
          segmentResults.push(...processSegment(currentSegment));
          currentSegment = [];
        }
        segmentResults.push(contentRow);
        return;
      }
      currentSegment.push(contentRow);
    });
    if (currentSegment.length > 0) {
      segmentResults.push(...processSegment(currentSegment));
    }
    result.push(...segmentResults);
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
