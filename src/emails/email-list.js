import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Text, VStack, Alert, AlertIcon, AlertDescription, CloseButton, Progress } from '@chakra-ui/react';
import { AddIcon, EditIcon } from '@chakra-ui/icons';
import { parseHtmlToSections } from './utils/htmlParser';
import { htmlToIr } from './import/htmlToIr';
import { irToSections, scanIrToStructureMap } from './ir/irToSections';

// ---------------------------------------------------------------------------
// Asset inlining — converts local relative image src values to data: URIs so
// they display correctly inside the editor regardless of CORS or file:/// rules.
// ---------------------------------------------------------------------------

/**
 * Walk all image File objects from a FileList (folder upload) and build a map
 * of  filename → data: URI  so we can patch <img src="..."> values inline.
 * Also handles single-file uploads: we inline any images already present in
 * the HTML that have file:// or absolute paths by fetching them.
 */
const buildAssetDataUrlMap = async (imageFiles = []) => {
  const map = {};
  await Promise.all(
    Array.from(imageFiles).map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            map[file.name] = reader.result || '';
            // Also store by webkitRelativePath basename for folder uploads
            if (file.webkitRelativePath) {
              map[file.webkitRelativePath] = reader.result || '';
            }
            resolve();
          };
          reader.onerror = () => resolve();
          reader.readAsDataURL(file);
        })
    )
  );
  return map;
};

/**
 * Replace all <img src="..."> values in raw HTML text with data: URIs from
 * the asset map.  Handles:
 *   - Bare filenames:        images/logo.png  → map["images/logo.png"]
 *   - Relative paths:        ../images/x.jpg  → map["../images/x.jpg"]
 *   - Already-absolute file: file:///C:/…     → left as-is (no map entry)
 *   - data:/http(s)          → left untouched
 */
const patchHtmlImageSrcs = (htmlText, assetMap) => {
  if (!assetMap || Object.keys(assetMap).length === 0) return htmlText;
  return htmlText.replace(/(<img\b[^>]*?\bsrc\s*=\s*)(["'])([^"']+)\2/gi, (match, prefix, quote, src) => {
    // Skip already-inlined or remote assets
    if (/^(data:|https?:|cid:|#)/i.test(src)) return match;
    // Try exact match first
    if (assetMap[src]) return `${prefix}${quote}${assetMap[src]}${quote}`;
    // Try basename match (strip path prefix)
    const basename = src.replace(/.*[/\\]/, '');
    if (assetMap[basename]) return `${prefix}${quote}${assetMap[basename]}${quote}`;
    return match;
  });
};

// ---------------------------------------------------------------------------
// URL normalization helpers
// ---------------------------------------------------------------------------
const normalizeImportedUrl = (value, assetBaseUrl) => {
  if (!value) return '';
  const raw = `${value}`.trim();
  if (!raw || raw.startsWith('data:') || raw.startsWith('cid:') || raw.startsWith('#')) return raw;
  if (/^(https?:|file:|mailto:|tel:)/i.test(raw)) return raw;
  if (!assetBaseUrl) return raw;
  try {
    return new URL(raw, assetBaseUrl).toString();
  } catch {
    return raw;
  }
};

const normalizeImportedSectionsUrls = (sections = [], assetBaseUrl = '') =>
  sections.map((section) => ({
    ...section,
    settings: {
      ...(section?.settings || {}),
      backgroundImage: normalizeImportedUrl(section?.settings?.backgroundImage || '', assetBaseUrl),
    },
    rows: (section?.rows || []).map((row) => ({
      ...row,
      settings: {
        ...(row?.settings || {}),
        backgroundImage: normalizeImportedUrl(row?.settings?.backgroundImage || '', assetBaseUrl),
      },
      columns: (row?.columns || []).map((column) => ({
        ...column,
        settings: {
          ...(column?.settings || {}),
          backgroundImage: normalizeImportedUrl(column?.settings?.backgroundImage || '', assetBaseUrl),
        },
        components: (column?.components || []).map((component) => ({
          ...component,
          imageUrl: normalizeImportedUrl(component?.imageUrl || '', assetBaseUrl),
          linkUrl: normalizeImportedUrl(component?.linkUrl || '', assetBaseUrl),
          settings: {
            ...(component?.settings || {}),
            backgroundImage: normalizeImportedUrl(component?.settings?.backgroundImage || '', assetBaseUrl),
          },
        })),
      })),
    })),
  }));

const getSavedFromBaseUrl = (htmlText = '') => {
  const match = `${htmlText}`.match(/saved from url=\([^)]*\)(https?:\/\/[^\s>]+)/i);
  const rawUrl = match?.[1] || '';
  if (!rawUrl) return '';
  try {
    return new URL('.', rawUrl).toString();
  } catch {
    return '';
  }
};

// ---------------------------------------------------------------------------
// Fix 7: Quality scoring — count renderable components, not just presence.
// Returns { count, score } so callers can compare parsers numerically.
// ---------------------------------------------------------------------------
const countImportedComponents = (sections = []) => {
  let count = 0;
  let hasMultiColumn = false;
  sections.forEach((section) => {
    (section?.rows || []).forEach((row) => {
      const cols = row?.columns || [];
      if (cols.length > 1) hasMultiColumn = true;
      cols.forEach((column) => {
        count += (column?.components || []).length;
        // Components inside nestedRows count too
        (column?.nestedRows || []).forEach((nestedRow) => {
          (nestedRow?.columns || []).forEach((nc) => {
            count += (nc?.components || []).length;
          });
        });
      });
    });
  });
  // Bonus: multi-column layouts are structurally richer → prefer them
  return { count, score: count + (hasMultiColumn ? 10 : 0) };
};

// eslint-disable-next-line no-unused-vars
const hasRenderableImportedContent = (sections = []) =>
  countImportedComponents(sections).count > 0;

// ---------------------------------------------------------------------------
// Fix 8 (enhanced): Div-layout detection — identify templates whose primary
// layout structure is div-based so the div-walk scanner is used instead of
// the dominant-table heuristic.
//
// Detects two cases:
//  a) Well-known email-builder class markers (Unlayer u-row-container / u-col,
//     BEE bee-row / bee-column, Chamaileon cm-block, etc.)
//  b) Structurally: no <table> at all, or divs vastly outnumber tables and
//     there are very few tables (pure CSS-grid / flexbox templates).
//
// NOTE: Hybrid templates (outer <table> wrapper + div rows inside) are
// detected via the class markers — the simple ratio test is kept only as a
// fallback for truly table-free layouts.
// ---------------------------------------------------------------------------
const isDivBasedTemplate = (htmlText = '') => {
  // Class-based markers for popular div-layout email builders
  const DIV_LAYOUT_CLASS_PATTERNS = [
    /class="[^"]*\bu-row-container\b[^"]*"/,  // Unlayer
    /class="[^"]*\bu-row\b[^"]*"/,            // Unlayer
    /class="[^"]*\bu-col\b[^"]*"/,            // Unlayer
    /class="[^"]*\bbee-row\b[^"]*"/,          // BEE Free
    /class="[^"]*\bbee-col\b[^"]*"/,          // BEE Free
    /class="[^"]*\bbee-block\b[^"]*"/,        // BEE Free
    /class="[^"]*\bcm-block\b[^"]*"/,         // Chamaileon
    /class="[^"]*\bstripo-row\b[^"]*"/,       // Stripo div variant
    /class="[^"]*\bemail-row-container\b[^"]*"/, // generic
  ];
  if (DIV_LAYOUT_CLASS_PATTERNS.some((re) => re.test(htmlText))) return true;

  // Structural fallback: no tables or divs vastly outnumber tables
  const lower = htmlText.toLowerCase();
  const tableMatches = (lower.match(/<table\b/g) || []).length;
  const divMatches = (lower.match(/<div\b/g) || []).length;
  return tableMatches === 0 || (divMatches > 0 && tableMatches < 2 && divMatches > tableMatches * 3);
};

const EmailList = () => {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const folderRef = useRef(null);
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleCreate = () => {
    navigate('/create');
  };

  const handleEditClick = () => {
    if (fileRef.current) fileRef.current.click();
  };

  // Fix 9: central error display helper
  const showImportError = (msg) => {
    setImportError(msg);
    setTimeout(() => setImportError(''), 8000);
  };

  const processImport = async (htmlFile, siblingImageFiles = []) => {
    setIsImporting(true);
    setImportError('');
    try {
      // File size guard (10 MB)
      if (htmlFile.size > 10 * 1024 * 1024) {
        showImportError('File is too large (max 10 MB). Please use a smaller template.');
        return;
      }

      let text = await htmlFile.text();

      // Fix 1: Build asset map from sibling image files (folder upload)
      // and patch relative <img src> values with data: URIs inline.
      const assetMap = siblingImageFiles.length > 0
        ? await buildAssetDataUrlMap(siblingImageFiles)
        : {};
      if (Object.keys(assetMap).length > 0) {
        text = patchHtmlImageSrcs(text, assetMap);
      }

      // Fall back: try to resolve a base URL from saved-from comment
      const assetBaseUrl = getSavedFromBaseUrl(text);

      // Fix 8: choose parsing strategy based on template structure
      const divBased = isDivBasedTemplate(text);

      // ---- Legacy parser (always runs as baseline) ----
      let parsedTemplate = null;
      try {
        parsedTemplate = parseHtmlToSections(text);
      } catch (legacyErr) {
        console.warn('Legacy parser error:', legacyErr);
      }

      if (!parsedTemplate) {
        // Legacy parser returned nothing meaningful
        if (!divBased) {
          showImportError('Could not parse the HTML template. The file may be corrupted or use an unsupported structure.');
          return;
        }
      }

      // ---- IR parser ----
      let importedIr = null;
      let mappedIrSections = [];
      try {
        importedIr = htmlToIr(text, { assetBaseUrl, isDivBased: divBased });
        let irScan = { sections: [] };
        irScan = scanIrToStructureMap(importedIr, { allowDivWalk: divBased });
        mappedIrSections = irScan.sections?.length > 0 ? irScan.sections : irToSections(importedIr);
      } catch (irErr) {
        console.warn('IR structure mapping failed:', irErr);
      }

      const legacySections = parsedTemplate
        ? (Array.isArray(parsedTemplate) ? parsedTemplate : parsedTemplate.sections)
        : [];
      const importedTemplateSettings = parsedTemplate && !Array.isArray(parsedTemplate)
        ? parsedTemplate.templateSettings
        : null;

      // Fix 7: quality scoring — pick the parser that produced more components
      const irQuality = countImportedComponents(mappedIrSections);
      const legacyQuality = countImportedComponents(legacySections);

      let importedSections;
      let chosenParser;
      if (irQuality.score >= legacyQuality.score && irQuality.count > 0) {
        importedSections = normalizeImportedSectionsUrls(mappedIrSections, assetBaseUrl);
        chosenParser = 'ir';
      } else if (legacyQuality.count > 0) {
        importedSections = normalizeImportedSectionsUrls(legacySections, assetBaseUrl);
        chosenParser = 'legacy';
      } else {
        // Fix 9: neither parser extracted anything
        showImportError(
          'No editable content could be found in the template. ' +
          'The file may use unsupported markup (e.g., CSS grid, SVG-only layout).'
        );
        return;
      }

      console.info(`[import] Using ${chosenParser} parser. IR score=${irQuality.score}, legacy score=${legacyQuality.score}`);

      navigate('/create', {
        state: {
          importedSections,
          importedTemplateSettings,
          importedIr,
        },
      });
    } catch (err) {
      console.error('Failed to import file:', err);
      // Fix 9: surface the error to the user
      showImportError(
        `Import failed: ${err?.message || 'Unknown error'}. ` +
        'Please check the file and try again.'
      );
    } finally {
      setIsImporting(false);
      if (fileRef.current) fileRef.current.value = '';
      if (folderRef.current) folderRef.current.value = '';
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e?.target?.files || []);
    if (files.length === 0) return;
    const htmlFile = files.find((f) => /\.(html|htm)$/i.test(f.name));
    if (!htmlFile) {
      showImportError('Please select an HTML file (.html or .htm).');
      return;
    }
    const imageFiles = files.filter((f) => /\.(png|jpe?g|gif|svg|webp|bmp|ico)$/i.test(f.name));
    await processImport(htmlFile, imageFiles);
  };

  return (
    <Box minH="calc(100vh - 72px)" display="flex" alignItems="center" justifyContent="center" p={8}>
      <VStack spacing={6} align="stretch" w="340px">
        {importError && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <AlertDescription fontSize="sm" flex="1">{importError}</AlertDescription>
            <CloseButton size="sm" onClick={() => setImportError('')} ml={2} />
          </Alert>
        )}

        {isImporting && (
          <Box>
            <Text fontSize="sm" color="gray.500" mb={1}>Importing template…</Text>
            <Progress size="xs" isIndeterminate colorScheme="teal" borderRadius="full" />
          </Box>
        )}

        <Button
          onClick={handleCreate}
          leftIcon={<AddIcon />}
          colorScheme="teal"
          size="lg"
          justifyContent="flex-start"
          h="56px"
          isDisabled={isImporting}
        >
          Create
        </Button>

        <Button
          onClick={handleEditClick}
          leftIcon={<EditIcon />}
          variant="outline"
          colorScheme="teal"
          size="lg"
          justifyContent="flex-start"
          h="56px"
          isDisabled={isImporting}
          isLoading={isImporting}
          loadingText="Importing…"
        >
          Edit (Upload Template)
        </Button>

        <Text fontSize="sm" color="gray.500" textAlign="center">
          Upload an HTML email template to edit and download.
          For templates with local images, use the folder upload or ensure images are embedded.
        </Text>

        {/* Single-file or multi-file (folder) upload — accepts .html + images */}
        <input
          ref={fileRef}
          type="file"
          accept=".html,.htm,text/html,image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </VStack>
    </Box>
  );
};

export default EmailList;
