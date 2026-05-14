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
import { COMPONENT_TYPES } from '../partials/componentTypes';
import { createComponentInstance } from '../partials/componentRegistry';

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
  column._ownSettings = sourceNode?.ownSettings || sourceNode?.styleMap?.own || {};
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

// Detect spacer/gutter TD nodes: zero-content TDs used only for spacing (e.g. class l0-s0, font-size:0)
const isGutterTdNode = (node) => {
  if (`${node?.tag || ''}`.toLowerCase() !== 'td') return false;
  const sig = node?.contentSignature || {};
  if (sig.hasImage || sig.hasLink || sig.hasNestedTable) return false;
  // Gutter TDs typically have shouldSkip hint or only nbsp/whitespace content
  if (node?.layoutHints?.shouldSkip) return true;
  // Check for font-size:0 style (classic gutter pattern)
  const styleRaw = `${node?.attrs?.style || ''}`;
  if (/font-size\s*:\s*0/i.test(styleRaw)) return true;
  // Class pattern: l{n}-s{n} (spacer columns in multi-column layouts)
  const cls = `${node?.attrs?.class || ''}`;
  if (/\bl\d+-s\d+\b/i.test(cls)) return true;
  return false;
};

const appendComponentToColumn = (column, component) => {
  if (!column || !component) return;
  column.components.push(component);
};

const collectNodeText = (node) => {
  if (!node) return '';
  if (node.kind === IR_NODE_KIND.TEXT) return node.text || '';
  if (node.kind === IR_NODE_KIND.COMPONENT) {
    if (node.type === 'Img') return '';
    return node.props?.text || node.text || '';
  }
  return (node.children || [])
    .map(collectNodeText)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const isComplexNestedLayout = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  if (rows.length > 1) return true;
  return rows.some((row) => (row?.columns || []).length > 1);
};

const isStructurallyMeaningfulRow = (row) => {
  if (!row) return false;
  const columns = row.columns || [];
  if (columns.some((col) => (col.components || []).length > 0)) return true;
  if (columns.some((col) => (col.nestedRows || []).length > 0)) return true;
  return false;
};

// Detects multiple sibling float:left tables that each contain a single link — classic nav pattern
const detectFloatNavTables = (childNodes) => {
  const tableSiblings = childNodes.filter((n) => `${n?.tag || ''}`.toLowerCase() === 'table');
  if (tableSiblings.length < 2) return null;
  // At least majority of sibling tables must have float:left style
  const floatTables = tableSiblings.filter((t) => {
    const floatVal = `${t?.ownSettings?.float || t?.settings?.float || ''}`.toLowerCase();
    return floatVal === 'left' || floatVal === 'right';
  });
  if (floatTables.length < 2) return null;
  // Check that all non-float tables are also in the same position (i.e. it's a mixed nav)
  // Extract link text from each float table
  const navItems = [];
  for (const t of floatTables) {
    const allLinks = [];
    const findLinks = (node) => {
      if (!node) return;
      if (node.kind === IR_NODE_KIND.COMPONENT && node.type === COMPONENT_TYPES.LINK) {
        allLinks.push(node.props?.text || '');
        return;
      }
      (node.children || []).forEach(findLinks);
    };
    findLinks(t);
    if (allLinks.length > 0) navItems.push(allLinks[0]);
    // If a float table has no link (e.g. logo with img), skip it for the menu items list
  }
  return navItems.length >= 2 ? navItems : null;
};

// Inline-only tags: no block-level structure, safe to keep as raw HTML for inline flow
const INLINE_ONLY_TAGS = new Set(['span', 'a', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'sub', 'sup', 'font', 'br', '#text']);

const isInlineOnlyContent = (node) => {
  if (!node) return false;
  const tag = `${node.tag || ''}`.toLowerCase();
  const sig = node.contentSignature || {};
  // Must be a div or p with text content (not empty)
  if (!['div', 'p', 'center'].includes(tag)) return false;
  if (!sig.hasText && !sig.hasLink) return false; // empty or image-only
  // No nested tables and no block-level wrappers inside
  if (sig.hasNestedTable || sig.hasBlockWrapper) return false;
  // All descendant tags must be inline (ignore the node's own tag)
  const descendantTags = (sig.tags || []).filter((t) => t !== tag);
  return descendantTags.every((t) => INLINE_ONLY_TAGS.has(t));
};

const shouldConvertNodeToRawHtml = (node) => {
  if (!node || node.kind !== IR_NODE_KIND.ELEMENT || !node.outerHTML) return false;
  const tag = `${node.tag || ''}`.toLowerCase();
  if (['table', 'tr', 'td', 'tbody', 'thead', 'tfoot', 'body', 'html'].includes(tag)) return false;
  if (node?.layoutHints?.keepRowsGrouped || node?.layoutHints?.preferSingleBlock) return false;
  
  // Be more permissive - only convert to raw HTML as last resort
  const semanticRole = `${node?.semanticRole || ''}`.toLowerCase();
  if (['nav', 'social', 'hero', 'product', 'legal', 'logo', 'content_group', 'header'].includes(semanticRole)) return false;
  
  if (shouldFlattenWrapper(node)) return false;
  
  const sig = node.contentSignature || {};
  // Only use raw HTML if extremely complex and no other option
  const hasExtremelyComplexContent = sig.hasNestedTable && sig.hasStyledNode && sig.hasBlockWrapper && sig.hasInlineWrapper;
  const hasRenderableContent = hasRenderableContentSignature(node);
  
  // Higher threshold for raw HTML - only if truly unparseable
  return !!(hasExtremelyComplexContent && hasRenderableContent && sig.tags.length > 8);
};

const appendNodeContentToColumn = (node, column) => {
  if (!node || !column) return;
  
  // Skip tracking and spacer elements
  if (node?.layoutHints?.shouldSkip) {
    addScanReasons(column, ['skipped_tracking_or_spacer'], 0.95);
    return;
  }
  
  if (node.kind === IR_NODE_KIND.COMPONENT) {
    appendComponentToColumn(column, createComponentFromIr(node));
    addScanReasons(column, [`component:${node.type || 'unknown'}`], 0.9);
    return;
  }
  
  // Try to parse complex structures more deeply before falling back
  if (node.kind === IR_NODE_KIND.ELEMENT) {
    const tag = `${node.tag || ''}`.toLowerCase();
    const sig = node.contentSignature || {};

    // Inline-only div/p: spans, text, br — preserve as raw HTML to keep inline flow.
    // Splitting these into individual SPAN components breaks the layout in preview.
    if (isInlineOnlyContent(node) && node.outerHTML) {
      appendComponentToColumn(column, createRawHtmlComponent(node));
      addScanReasons(column, ['inline_only_raw_html'], 0.85);
      return;
    }
    
    // For complex divs with mixed content, try to parse children first
    if (tag === 'div' && sig.hasNestedTable && (sig.hasText || sig.hasImage)) {
      const hasMeaningfulChildren = (node.children || []).some(child => 
        child.kind === IR_NODE_KIND.COMPONENT || 
        (child.kind === IR_NODE_KIND.TEXT && isMeaningfulText(child.text)) ||
        (child.kind === IR_NODE_KIND.ELEMENT && hasRenderableContentSignature(child))
      );
      
      if (hasMeaningfulChildren) {
        (node.children || []).forEach((child) => {
          appendNodeContentToColumn(child, column);
        });
        addScanReasons(column, ['parsed_complex_div_structure'], 0.75);
        return;
      }
    }
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
  const semanticRole = `${node?.semanticRole || ''}`.toLowerCase();
  const shouldPreferStructuredChildren = !!(
    node?.layoutHints?.keepRowsGrouped
    || node?.layoutHints?.preferSingleBlock
    || ['nav', 'social', 'hero', 'product', 'legal', 'logo', 'content_group', 'header'].includes(semanticRole)
  );
  if (tag === 'table') {
    const nestedRows = buildRowsFromTableNode(node);
    if (node?.layoutHints?.keepRowsGrouped && nestedRows.length > 0) {
      column.nestedRows.push(...nestedRows.filter(isStructurallyMeaningfulRow));
      addScanReasons(column, ['grouped_semantic_table_rows_preserved'], 0.82);
    } else if (nestedRows.length === 1 && (nestedRows[0].columns || []).length > 1 && column.components.length === 0) {
      column.nestedRows.push(...nestedRows);
      addScanReasons(column, ['promoted_nested_multicolumn_via_wrapper'], 0.75);
    } else if (nestedRows.length > 0) {
      // Be more conservative about flattening tables - preserve structure
      const hasComplexStructure = nestedRows.some(row => 
        (row.columns || []).length > 1 || 
        row.columns.some(col => (col.components || []).length > 1)
      );
      
      if (hasComplexStructure) {
        column.nestedRows.push(...nestedRows.filter(isStructurallyMeaningfulRow));
        addScanReasons(column, ['preserved_complex_table_structure'], 0.78);
      } else {
        mergeNestedRowsIntoColumn(column, nestedRows, 'merged_simple_table');
      }
    }
    return;
  }
  if (shouldPreferStructuredChildren) {
    (node.children || []).forEach((child) => appendNodeContentToColumn(child, column));
    addScanReasons(column, [`semantic_children:${semanticRole || tag}`], 0.78);
    return;
  }
  if (shouldFlattenWrapper(node) || !['tr', 'td'].includes(tag)) {
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
  // Filter out pure gutter/spacer TDs so siblingCount reflects actual content columns
  const contentTdNodes = tdNodes.filter((n) => !isGutterTdNode(n));
  const columnNodes = contentTdNodes.length > 0 ? contentTdNodes : (tdNodes.length > 0 ? tdNodes : [rowNode]);
  const siblingCount = columnNodes.length;
  return columnNodes.map((columnNode) => {
    const column = createStructureColumn(columnNode, inferColumnSize(columnNode, siblingCount));
    addScanReasons(column, [tdNodes.length > 0 ? 'direct_td_column' : 'synthetic_single_column'], tdNodes.length > 0 ? 0.9 : 0.7);
 
    // Detect float:left nav tables before processing children individually
    const navItems = detectFloatNavTables(columnNode.children || []);
    if (navItems) {
      const navComp = createComponentInstance(COMPONENT_TYPES.MENU);
      navComp.id = createId();
      navComp.type = COMPONENT_TYPES.MENU;
      navComp.content = navItems.join('\n');
      navComp.menuItems = navItems.join('\n');
      applyEffectiveSettings({ settings: navComp.settings }, columnNode);
      appendComponentToColumn(column, navComp);
      addScanReasons(column, ['float_nav_tables_merged'], 0.88);
      return column;
    }

    (columnNode.children || []).forEach((child) => {
      const tag = `${child.tag || ''}`.toLowerCase();
      if (tag === 'table') {
        const nestedRows = buildRowsFromTableNode(child);
        const keepRowsGrouped = !!child?.layoutHints?.keepRowsGrouped;

        if (
          nestedRows.length === 1
          && (nestedRows[0].columns || []).length === 1
          && (nestedRows[0].columns?.[0]?.components || []).length === 0
          && (nestedRows[0].columns?.[0]?.nestedRows || []).length > 0
          && !keepRowsGrouped
        ) {
          column.nestedRows.push(...(nestedRows[0].columns[0].nestedRows || []));
          addScanReasons(column, ['unwrapped_single_column_table_wrapper'], 0.84);
        } else if (keepRowsGrouped && nestedRows.length > 0) {
          column.nestedRows.push(...nestedRows.filter(isStructurallyMeaningfulRow));
          addScanReasons(column, ['semantic_group_rows_preserved'], 0.84);
        } else if (nestedRows.length === 1 && (nestedRows[0].columns || []).length > 1 && column.components.length === 0) {
          column.nestedRows.push(...nestedRows);
          addScanReasons(column, ['promoted_nested_multicolumn'], 0.82);
        } else if (isComplexNestedLayout(nestedRows) && column.components.length > 0 && !keepRowsGrouped) {
          appendComponentToColumn(column, createRawHtmlComponent(child));
          addScanReasons(column, ['complex_nested_table_raw_fallback'], 0.4);
        } else if (nestedRows.length > 0) {
          if (siblingCount === 1) {
            column.nestedRows.push(...nestedRows);
            addScanReasons(column, ['nested_multi_row_expansion'], 0.72);
          } else {
            mergeNestedRowsIntoColumn(column, nestedRows, 'merged_sibling_multi_row');
            addScanReasons(column, ['merged_sibling_multi_row'], 0.72);
          }
        } else {
          appendNodeContentToColumn(child, column);
        }
      } else {
        appendNodeContentToColumn(child, column);
      }
    });

    if ((column.components || []).length === 0 && (column.nestedRows || []).length === 0) {
      const fallbackText = collectNodeText(columnNode);
      if (isMeaningfulText(fallbackText)) {
        appendComponentToColumn(column, createTextComponent({
          ...columnNode,
          kind: IR_NODE_KIND.TEXT,
          text: fallbackText,
        }));
        addScanReasons(column, ['fallback_text_from_empty_cell'], 0.62);
      }
    }

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
    const rawRows = buildRowsFromTableNode(dominantTable);
    section.rows = normalizeScannedRows(rawRows, section);
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
