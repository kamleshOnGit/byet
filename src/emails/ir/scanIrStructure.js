import { IR_NODE_KIND } from './schema';
import { normalizeScannedRows } from './normalizeIrStructure';
import {
  addScanReasons,
  applyEffectiveSettings,
  createComponentFromIr,
  createId,
  createRawHtmlComponent,
  createScanMeta,
  createTextComponent,
  hasRenderableContentSignature,
  inferColumnSize,
  isColumnMeaningful,
  isMeaningfulText,
  shouldFlattenWrapper,
} from './structureShared';

const createStructureSection = (sourceNode = null) => {
  const section = { id: createId(), rows: [], settings: {} };
  if (sourceNode) applyEffectiveSettings(section, sourceNode);
  section._scan = createScanMeta(sourceNode, 'section', 0.8, [`section_from_${`${sourceNode?.tag || 'node'}`.toLowerCase()}`]);
  return section;
};

const createStructureRow = (sourceNode = null) => {
  const row = { id: createId(), columns: [], settings: {} };
  if (sourceNode) applyEffectiveSettings(row, sourceNode);
  row._scan = createScanMeta(sourceNode, 'row', 0.8, [`row_from_${`${sourceNode?.tag || 'node'}`.toLowerCase()}`]);
  return row;
};

const createStructureColumn = (sourceNode = null, size = 12) => {
  const column = { id: createId(), size, components: [], settings: {}, nestedRows: [] };
  if (sourceNode) applyEffectiveSettings(column, sourceNode);
  column._scan = createScanMeta(sourceNode, 'column', 0.8, [`column_from_${`${sourceNode?.tag || 'node'}`.toLowerCase()}`]);
  return column;
};

const countRenderableDescendants = (node) => {
  if (!node) return 0;
  if (node.kind === IR_NODE_KIND.COMPONENT) return 1;
  if (node.kind === IR_NODE_KIND.TEXT) return isMeaningfulText(node.text) ? 1 : 0;
  return (node.children || []).reduce((total, child) => total + countRenderableDescendants(child), 0);
};

const isMeaningfulTableNode = (node) => {
  if (`${node?.tag || ''}`.toLowerCase() !== 'table') return false;
  return countRenderableDescendants(node) > 0 || hasRenderableContentSignature(node);
};

const getDirectRowNodes = (tableNode) => {
  if (!tableNode) return [];
  const directChildren = tableNode.children || [];
  const grouped = directChildren.filter((child) => ['tbody', 'thead', 'tfoot'].includes(`${child?.tag || ''}`.toLowerCase()));
  if (grouped.length > 0) {
    return grouped.flatMap((group) => (group.children || []).filter((child) => `${child?.tag || ''}`.toLowerCase() === 'tr'));
  }
  return directChildren.filter((child) => `${child?.tag || ''}`.toLowerCase() === 'tr');
};

const collectTableNodes = (nodes = [], bucket = []) => {
  nodes.forEach((node) => {
    if (!node) return;
    if (`${node.tag || ''}`.toLowerCase() === 'table') bucket.push(node);
    collectTableNodes(node.children || [], bucket);
  });
  return bucket;
};

const selectDominantTableNode = (irDoc) => {
  const tables = collectTableNodes(irDoc?.nodes || []).filter(isMeaningfulTableNode);
  if (tables.length === 0) return null;

  return tables.reduce((best, candidate) => {
    if (!best) return candidate;
    const candidateRows = getDirectRowNodes(candidate).length;
    const bestRows = getDirectRowNodes(best).length;
    const candidateScore = (candidateRows * 10) + countRenderableDescendants(candidate);
    const bestScore = (bestRows * 10) + countRenderableDescendants(best);
    return candidateScore > bestScore ? candidate : best;
  }, null);
};

const collectMeaningfulChildren = (node, predicate) => (node?.children || []).filter((child) => predicate(`${child?.tag || ''}`.toLowerCase(), child));

const appendComponentToColumn = (column, component) => {
  if (!column || !component) return;
  column.components.push(component);
};

const isComplexNestedLayout = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  if (rows.length > 1) return true;
  return rows.some((row) => (row?.columns || []).length > 1);
};

const shouldConvertNodeToRawHtml = (node) => {
  if (!node || node.kind !== IR_NODE_KIND.ELEMENT || !node.outerHTML) return false;
  const tag = `${node.tag || ''}`.toLowerCase();
  if (['table', 'tr', 'td', 'tbody', 'thead', 'tfoot', 'body', 'html'].includes(tag)) return false;
  if (shouldFlattenWrapper(node)) return false;
  const sig = node.contentSignature || {};
  const hasComplexContent = sig.hasNestedTable || (sig.hasStyledNode && (sig.hasBlockWrapper || sig.hasInlineWrapper));
  return !!(hasComplexContent && hasRenderableContentSignature(node));
};

const appendNodeContentToColumn = (node, column) => {
  if (!node || !column) return;
  if (node.kind === IR_NODE_KIND.COMPONENT) {
    appendComponentToColumn(column, createComponentFromIr(node));
    addScanReasons(column, [`component:${node.type || 'unknown'}`], 0.9);
    return;
  }
  if (node.kind === IR_NODE_KIND.TEXT && isMeaningfulText(node.text)) {
    appendComponentToColumn(column, createTextComponent(node));
    addScanReasons(column, ['text_leaf'], 0.9);
    return;
  }
  if (shouldConvertNodeToRawHtml(node)) {
    appendComponentToColumn(column, createRawHtmlComponent(node));
    addScanReasons(column, ['raw_html_fallback'], 0.45);
    return;
  }
  const tag = `${node.tag || ''}`.toLowerCase();
  if (shouldFlattenWrapper(node) || !['table', 'tr', 'td'].includes(tag)) {
    (node.children || []).forEach((child) => appendNodeContentToColumn(child, column));
  }
};

const mergeNestedRowsIntoColumn = (targetColumn, nestedRows = [], reason = 'flattened_nested_table') => {
  if (!targetColumn || !Array.isArray(nestedRows) || nestedRows.length === 0) return;

  nestedRows.forEach((nestedRow) => {
    nestedRow.columns.forEach((nestedColumn) => {
      if ((nestedColumn.components || []).length > 0) {
        (nestedColumn.components || []).forEach((component) => appendComponentToColumn(targetColumn, component));
      }
      if ((nestedColumn.nestedRows || []).length > 0) {
        targetColumn.nestedRows.push(...nestedColumn.nestedRows);
      }
    });
  });

  addScanReasons(targetColumn, [reason], 0.68);
};

const buildColumnsFromRowNode = (rowNode) => {
  const tdNodes = collectMeaningfulChildren(rowNode, (tag) => tag === 'td');
  const columnNodes = tdNodes.length > 0 ? tdNodes : [rowNode];
  const siblingCount = columnNodes.length;

  return columnNodes.map((columnNode) => {
    const column = createStructureColumn(columnNode, inferColumnSize(columnNode, siblingCount));
    addScanReasons(column, [tdNodes.length > 0 ? 'direct_td_column' : 'synthetic_single_column'], tdNodes.length > 0 ? 0.9 : 0.7);

    (columnNode.children || []).forEach((child) => {
      const tag = `${child.tag || ''}`.toLowerCase();
      if (tag === 'table') {
        const nestedRows = buildRowsFromTableNode(child);
        if (
          nestedRows.length === 1
          && (nestedRows[0].columns || []).length === 1
          && (nestedRows[0].columns?.[0]?.components || []).length === 0
          && (nestedRows[0].columns?.[0]?.nestedRows || []).length > 0
        ) {
          column.nestedRows.push(...(nestedRows[0].columns[0].nestedRows || []));
          addScanReasons(column, ['unwrapped_single_column_table_wrapper'], 0.84);
        } else if (nestedRows.length === 1 && (nestedRows[0].columns || []).length > 1 && column.components.length === 0) {
          column.nestedRows.push(...nestedRows);
          addScanReasons(column, ['promoted_nested_multicolumn'], 0.82);
        } else if (isComplexNestedLayout(nestedRows) && column.components.length > 0) {
          appendComponentToColumn(column, createRawHtmlComponent(child));
          addScanReasons(column, ['complex_nested_table_raw_fallback'], 0.4);
        } else if (nestedRows.length > 0) {
          mergeNestedRowsIntoColumn(column, nestedRows);
        } else {
          appendNodeContentToColumn(child, column);
        }
      } else {
        appendNodeContentToColumn(child, column);
      }
    });

    return column;
  }).filter(isColumnMeaningful);
};

const buildRowsFromTableNode = (tableNode) => {
  const directRows = getDirectRowNodes(tableNode);

  return directRows.map((rowNode) => {
    const row = createStructureRow(rowNode);
    addScanReasons(row, ['direct_table_row'], 0.92);
    row.columns = buildColumnsFromRowNode(rowNode);
    return row;
  }).filter((row) => (row.columns || []).length > 0);
};

export const scanIrToStructureMap = (irDoc) => {
  const dominantTable = selectDominantTableNode(irDoc);
  if (dominantTable) {
    const section = createStructureSection(dominantTable);
    addScanReasons(section, ['dominant_table_root'], 0.95);
    section.rows = normalizeScannedRows(buildRowsFromTableNode(dominantTable), section);
    if (section.rows.length > 0) {
      return {
        sections: [section],
        diagnostics: {
          mode: 'dominant_table',
          dominantTableId: dominantTable.id,
          dominantTableTag: dominantTable.tag,
        },
      };
    }
  }

  const sections = [];
  (irDoc?.nodes || []).forEach((node) => {
    if (node?.kind === IR_NODE_KIND.COMPONENT || node?.kind === IR_NODE_KIND.TEXT || hasRenderableContentSignature(node)) {
      const section = createStructureSection(node);
      addScanReasons(section, ['fallback_content_section'], 0.55);
      const row = createStructureRow(node);
      const column = createStructureColumn(node, 12);
      appendNodeContentToColumn(node, column);
      if (isColumnMeaningful(column)) {
        row.columns = [column];
        section.rows = [row];
        sections.push(section);
      }
    }
  });

  return {
    sections,
    diagnostics: {
      mode: 'fallback_content_scan',
      dominantTableId: null,
      dominantTableTag: null,
    },
  };
};
