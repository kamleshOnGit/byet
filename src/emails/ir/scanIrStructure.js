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

// ---------------------------------------------------------------------------
// Fix 4: Dominant-table heuristic — prefer CONTENT-DENSE tables over wide
// wrapper tables.  Email templates are typically structured as:
//   outer wrapper table (width:100%, 1 row, 1 td)
//     → inner container table (width:600px, many rows)
//       → actual content rows
// The old algorithm scored by row-count, which made it pick the outer wrapper
// (score = 1 row × 10 + few descendants) when the inner table had more rows.
// The new algorithm:
//   1. Strongly rewards tables whose direct <td> cells contain leaf components
//      (text, images, links) — content density per TD.
//   2. Rewards deeper nesting (content tables sit deeper than wrappers).
//   3. Penalises tables that are pure single-cell wrappers (1 TR × 1 TD with
//      no direct leaf content) — these are structural envelopes, not content.
// ---------------------------------------------------------------------------
const scoreTableNode = (tableNode) => {
  const rows = getDirectRowNodes(tableNode);
  const rowCount = rows.length;
  // Count direct leaf-component descendants (not recursing into nested tables)
  let directLeaves = 0;
  let directCells = 0;
  let maxCellsInRow = 0;
  rows.forEach((rowNode) => {
    const tds = (rowNode.children || []).filter((c) => `${c?.tag || ''}`.toLowerCase() === 'td');
    directCells += tds.length;
    maxCellsInRow = Math.max(maxCellsInRow, tds.length);
    tds.forEach((td) => {
      // Count immediate child components (not recursing through nested tables)
      (td.children || []).forEach((child) => {
        if (child.kind === IR_NODE_KIND.COMPONENT) directLeaves += 1;
        else if (child.kind === IR_NODE_KIND.TEXT && `${child.text || ''}`.trim()) directLeaves += 1;
      });
    });
  });

  // Structural wrapper penalty: single-row, single-cell, no direct leaves
  const isPureWrapper =
    rowCount === 1 &&
    directCells <= 1 &&
    directLeaves === 0;

  // Depth bonus: content tables tend to be deeply nested
  const depth = tableNode?.relation?.depth || 0;

  return (
    (directLeaves * 50) +      // strongest signal: direct renderable content
    (directCells * 10) +       // multi-column rows are content indicators
    (maxCellsInRow * 8) +      // widest row shows column count
    (rowCount * 5) +           // more rows = more content sections
    (depth * 3) -              // deeper = more likely to be inner content table
    (isPureWrapper ? 200 : 0)  // penalise pure wrapper envelopes
  );
};

const selectDominantTableNode = (irDoc) => {
  const tables = collectTableNodes(irDoc?.nodes || []).filter(isMeaningfulTableNode);
  if (tables.length === 0) return null;
  if (tables.length === 1) return tables[0];

  return tables.reduce((best, candidate) => {
    if (!best) return candidate;
    return scoreTableNode(candidate) > scoreTableNode(best) ? candidate : best;
  }, null);
};

const collectMeaningfulChildren = (node, predicate) => (node?.children || []).filter((child) => predicate(`${child?.tag || ''}`.toLowerCase(), child));

// ---------------------------------------------------------------------------
// Fix 6: Hardened gutter/spacer TD detection.
// Covers patterns from Outlook 2-3 column layouts, MJML, Campaign Monitor,
// Mailchimp, Co-Lab, and generic table-based email frameworks.
// A TD is a gutter ONLY when it has NO renderable content AND matches at
// least one structural spacer indicator — preventing false positives on TDs
// that genuinely contain text or images.
// ---------------------------------------------------------------------------
const isGutterTdNode = (node) => {
  if (`${node?.tag || ''}`.toLowerCase() !== 'td') return false;
  const sig = node?.contentSignature || {};

  // Hard safety: TDs with actual content are NEVER gutters
  if (sig.hasImage || sig.hasLink || sig.hasNestedTable || sig.hasButtonLike) return false;

  // Also guard against TDs with meaningful text (more than just &nbsp;/whitespace)
  const innerText = `${node?.outerHTML || ''}`.replace(/<[^>]+>/g, '').replace(/&nbsp;|\s/g, '').trim();
  if (innerText.length > 0) return false;

  // From this point the TD has no renderable content — check spacer indicators.

  // 1. Layout hint set by detectLayoutHints() in htmlToIr
  if (node?.layoutHints?.shouldSkip) return true;

  const styleRaw = `${node?.attrs?.style || ''}`;
  const cls = `${node?.attrs?.class || ''}`.toLowerCase();
  const widthAttr = `${node?.attrs?.width || ''}`;

  // 2. font-size:0 — classic gutter trick (invisible text, zero-height)
  if (/font-size\s*:\s*0/i.test(styleRaw)) return true;

  // 3. line-height:0 combined with no content
  if (/line-height\s*:\s*0/i.test(styleRaw)) return true;

  // 4. Explicit zero-width (width:0, width:0px, width="0")
  if (/width\s*:\s*0\s*(px)?[;"]?/i.test(styleRaw)) return true;
  if (widthAttr === '0' || widthAttr === '0px') return true;

  // 5. Named spacer class patterns from common email frameworks:
  //    Co-Lab:          l{n}-s{n}
  //    Generic:         spacer, gutter, divider, gap, separator, col-gap
  //    Mailchimp/MJML:  mj-column-per-*, mc-gutter
  //    Campaign Monitor: spacer-*
  if (/\bl\d+-s\d+\b/.test(cls)) return true;
  if (/\b(spacer|gutter|divider|gap-col|col-gap|mj-column-per|mc-gutter|spacer-[a-z])\b/.test(cls)) return true;

  // 6. Explicit display:none — hidden TDs used for Outlook compatibility
  if (/display\s*:\s*none/i.test(styleRaw)) return true;

  // 7. mso-hide:all — Outlook-specific hide directive  
  if (/mso-hide\s*:\s*all/i.test(styleRaw)) return true;

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

// Detects multiple sibling float:left tables that each contain a single link — classic nav pattern.
// Guard: if ANY float table has an image or non-link content it is a content column cluster,
// not a navigation menu.  In that case return null so the caller falls through to the
// float-column detection path instead.
const detectFloatNavTables = (childNodes) => {
  const tableSiblings = childNodes.filter((n) => `${n?.tag || ''}`.toLowerCase() === 'table');
  if (tableSiblings.length < 2) return null;
  // At least majority of sibling tables must have float:left/right style
  const floatTables = tableSiblings.filter((t) => {
    const floatVal = `${t?.ownSettings?.float || t?.settings?.float || ''}`.toLowerCase();
    return floatVal === 'left' || floatVal === 'right';
  });
  if (floatTables.length < 2) return null;

  // Guard: if any float table contains an image it is a product/content column, not a nav bar.
  const hasImageInTable = (node) => {
    if (!node) return false;
    if (node.kind === IR_NODE_KIND.COMPONENT && node.type === COMPONENT_TYPES.IMAGE) return true;
    const sig = node?.contentSignature || {};
    if (sig.hasImage) return true;
    return (node.children || []).some(hasImageInTable);
  };
  if (floatTables.some(hasImageInTable)) return null;

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
    // If a float table has no link (e.g. logo-only) skip it for the menu-items list
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

    // -----------------------------------------------------------------------
    // CSS table-layout multi-column detection (Unlayer / BEE / custom pattern).
    // A <div style="display:table"> whose direct children have display:table-cell
    // represents parallel columns — each cell-div becomes a separate column.
    // We emit a nested row so normalizeScannedRows can promote it correctly.
    // -----------------------------------------------------------------------
    if (tag === 'div') {
      const displayVal = `${node?.ownSettings?.display || ''}`.toLowerCase();
      if (displayVal === 'table' || displayVal === 'inline-table') {
        const cellChildren = (node.children || []).filter((c) => {
          if (`${c?.tag || ''}`.toLowerCase() !== 'div') return false;
          const cDisplay = `${c?.ownSettings?.display || ''}`.toLowerCase();
          return cDisplay === 'table-cell' || cDisplay === 'inline-block';
        });
        if (cellChildren.length >= 2) {
          const colSize = Math.floor(12 / cellChildren.length);
          const nestedRow = createStructureRow(node);
          addScanReasons(nestedRow, ['css_table_layout_row'], 0.8);
          nestedRow.columns = cellChildren.map((cellDiv) => {
            const col = createStructureColumn(cellDiv, colSize);
            addScanReasons(col, ['css_table_cell_column'], 0.78);
            (cellDiv.children || []).forEach((grandchild) => appendNodeContentToColumn(grandchild, col));
            return col;
          }).filter(isColumnMeaningful);
          if (nestedRow.columns.length >= 2) {
            column.nestedRows.push(nestedRow);
            addScanReasons(column, ['css_table_multi_column_nested'], 0.78);
            return;
          }
        }
      }
    }

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

// ---------------------------------------------------------------------------
// Helper: extract renderable content from a float table node into a column.
// Float tables used as columns are typically single-row/single-cell wrappers,
// so we flatten the first level and merge components directly.
// ---------------------------------------------------------------------------
const buildColumnFromFloatTable = (floatTableNode, colSize) => {
  const col = createStructureColumn(floatTableNode, colSize);
  addScanReasons(col, ['float_table_column'], 0.82);
  const floatRows = buildRowsFromTableNode(floatTableNode);
  floatRows.forEach((fr) => {
    (fr.columns || []).forEach((innerCol) => {
      (innerCol.components || []).forEach((comp) => appendComponentToColumn(col, comp));
      if ((innerCol.nestedRows || []).length > 0) {
        col.nestedRows.push(...innerCol.nestedRows);
      }
    });
  });
  return col;
};

const buildColumnsFromRowNode = (rowNode) => {
  const tdNodes = collectMeaningfulChildren(rowNode, (tag) => tag === 'td');
  // Filter out pure gutter/spacer TDs so siblingCount reflects actual content columns
  const contentTdNodes = tdNodes.filter((n) => !isGutterTdNode(n));
  let columnNodes = contentTdNodes.length > 0 ? contentTdNodes : (tdNodes.length > 0 ? tdNodes : [rowNode]);

  // ---------------------------------------------------------------------------
  // Float-based multi-column detection (Stripo / Esputnik pattern).
  // When a single TD wraps ≥2 sibling tables with float:left / float:right the
  // float tables ARE the parallel columns — not a single wide cell.
  // detectFloatNavTables already guards the nav-link case; here we handle the
  // generic content-column case (images, text, products, etc.).
  // ---------------------------------------------------------------------------
  if (columnNodes.length === 1) {
    const singleTd = columnNodes[0];
    const floatTableSiblings = (singleTd.children || []).filter((child) => {
      if (`${child?.tag || ''}`.toLowerCase() !== 'table') return false;
      const floatVal = `${child?.ownSettings?.float || child?.settings?.float || ''}`.toLowerCase();
      return floatVal === 'left' || floatVal === 'right';
    });
    if (floatTableSiblings.length >= 2) {
      const colSize = Math.floor(12 / floatTableSiblings.length);
      const floatColumns = floatTableSiblings
        .map((ft) => buildColumnFromFloatTable(ft, colSize))
        .filter(isColumnMeaningful);
      if (floatColumns.length >= 2) return floatColumns;
    }
  }

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

// ---------------------------------------------------------------------------
// Fix 8: Div-layout walk — for templates that use <div>-based layouts
// (no meaningful <table> structure).  Treats top-level and direct-child block
// divs as rows, and their children as single-column content.
// Activated when options.allowDivWalk === true or when no dominant table exists.
// ---------------------------------------------------------------------------
const BLOCK_DIV_TAGS = new Set(['div', 'section', 'article', 'main', 'header', 'footer', 'aside', 'nav']);

const buildRowsFromDivNode = (containerNode) => {
  const children = containerNode?.children || [];
  const rows = [];

  children.forEach((child) => {
    if (!child || child.kind === IR_NODE_KIND.TEXT) return;
    const tag = `${child.tag || ''}`.toLowerCase();

    // Skip invisible/noise elements
    if (child?.layoutHints?.shouldSkip) return;

    // Each block-level div/section/article becomes a row
    if (BLOCK_DIV_TAGS.has(tag)) {
      const row = createStructureRow(child);
      addScanReasons(row, ['div_block_row'], 0.75);
      const column = createStructureColumn(child, 12);
      addScanReasons(column, ['div_single_column'], 0.75);

      // If the div has multiple block children, try to make them parallel columns
      const blockChildren = (child.children || []).filter((c) => BLOCK_DIV_TAGS.has(`${c?.tag || ''}`.toLowerCase()));
      if (blockChildren.length > 1) {
        const siblingCount = blockChildren.length;
        row.columns = blockChildren.map((blockChild, idx) => {
          const col = createStructureColumn(blockChild, Math.floor(12 / siblingCount));
          addScanReasons(col, ['div_parallel_column'], 0.7);
          appendNodeContentToColumn(blockChild, col);
          return col;
        }).filter(isColumnMeaningful);
      } else {
        appendNodeContentToColumn(child, column);
        if (isColumnMeaningful(column)) {
          row.columns = [column];
        }
      }

      if ((row.columns || []).length > 0) {
        rows.push(row);
      }
    } else if (child.kind === IR_NODE_KIND.COMPONENT || hasRenderableContentSignature(child)) {
      // Inline component at root level — wrap in a row
      const row = createStructureRow(child);
      addScanReasons(row, ['div_inline_component_row'], 0.65);
      const column = createStructureColumn(child, 12);
      appendNodeContentToColumn(child, column);
      if (isColumnMeaningful(column)) {
        row.columns = [column];
        rows.push(row);
      }
    }
  });

  return rows;
};

// ---------------------------------------------------------------------------
// Helper: resolve the node whose *direct children* should be treated as div
// layout rows.  Handles two cases:
//   1. The body-level node is itself a block div container (pure div-layout).
//   2. The body-level node is a single-row/single-TD <table> wrapper that holds
//      multiple block div rows inside its one cell (Unlayer / BEE hybrid).
// ---------------------------------------------------------------------------
const findDivLayoutContainer = (topNodes) => {
  // Case 1: direct block-div container at top level
  const directDivContainers = topNodes.filter((n) => {
    const tag = `${n?.tag || ''}`.toLowerCase();
    return BLOCK_DIV_TAGS.has(tag) && hasRenderableContentSignature(n);
  });
  if (directDivContainers.length > 0) {
    return directDivContainers.reduce((best, c) =>
      countRenderableDescendants(c) > countRenderableDescendants(best) ? c : best
    );
  }

  // Case 2: outer <table> wrapper with a single row / single TD whose children
  // are multiple block divs (Unlayer u-row-container pattern, BEE, etc.)
  for (const node of topNodes) {
    const tag = `${node?.tag || ''}`.toLowerCase();
    if (tag !== 'table') continue;
    const trs = getDirectRowNodes(node);
    if (trs.length !== 1) continue;
    const tds = (trs[0].children || []).filter((c) => `${c?.tag || ''}`.toLowerCase() === 'td');
    if (tds.length !== 1) continue;
    const tdDivChildren = (tds[0].children || []).filter((c) =>
      BLOCK_DIV_TAGS.has(`${c?.tag || ''}`.toLowerCase()) && hasRenderableContentSignature(c)
    );
    if (tdDivChildren.length >= 2) {
      // Return the single TD itself — buildRowsFromDivNode will iterate its div children
      return tds[0];
    }
  }

  return null;
};

export const scanIrToStructureMap = (irDoc, options = {}) => {
  // For explicitly identified div-layout templates (Unlayer, BEE, etc.) skip the
  // dominant-table scan entirely.  A randomly-selected inner content table would
  // represent only a fraction of the template, producing a broken import.
  let dominantTable = null;
  if (!options.allowDivWalk) {
    dominantTable = selectDominantTableNode(irDoc);
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
  }

  // Div-layout walk — used when no dominant table found OR explicitly requested
  if (options.allowDivWalk || !dominantTable) {
    const topNodes = irDoc?.nodes || [];
    // Find the container whose children we should iterate as layout rows.
    // This now also handles Unlayer-style outer <table> wrappers.
    const container = findDivLayoutContainer(topNodes);

    if (container) {
      const divRows = buildRowsFromDivNode(container);
      if (divRows.length > 0) {
        const section = createStructureSection(container);
        addScanReasons(section, ['div_layout_root'], 0.75);
        section.rows = normalizeScannedRows(divRows, section);
        if (section.rows.length > 0) {
          return {
            sections: [section],
            diagnostics: {
              mode: 'div_walk',
              dominantTableId: null,
              dominantTableTag: null,
            },
          };
        }
      }
    }
  }

  // Final fallback: treat every IR node with content as its own section
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
