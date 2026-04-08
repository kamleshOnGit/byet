import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Text, VStack } from '@chakra-ui/react';
import { AddIcon, EditIcon } from '@chakra-ui/icons';
import { parseHtmlToSections } from './utils/htmlParser';
import { htmlToIr } from './import/htmlToIr';
import { irToSections, scanIrToStructureMap } from './ir/irToSections';

const EmailList = () => {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const normalizeImportedUrl = (value, assetBaseUrl) => {
    if (!value) return '';
    const raw = `${value}`.trim();
    if (!raw || raw.startsWith('data:') || raw.startsWith('cid:') || raw.startsWith('#')) return raw;
    if (/^(https?:|file:|mailto:|tel:)/i.test(raw)) return raw;
    if (!assetBaseUrl) return raw;
    try {
      return new URL(raw, assetBaseUrl).toString();
    } catch (err) {
      return raw;
    }
  };

  const normalizeImportedSectionsUrls = (sections = [], assetBaseUrl = '') => sections.map((section) => ({
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
    } catch (err) {
      return '';
    }
  };

  const getStructureSummary = (sections = []) => {
    const summary = {
      sections: sections.length,
      rows: 0,
      columns: 0,
      components: 0,
    };

    sections.forEach((section) => {
      const rows = section?.rows || [];
      summary.rows += rows.length;
      rows.forEach((row) => {
        const columns = row?.columns || [];
        summary.columns += columns.length;
        columns.forEach((column) => {
          summary.components += (column?.components || []).length;
        });
      });
    });

    return summary;
  };

  const compareStructures = (legacySections = [], irSections = []) => {
    const legacy = getStructureSummary(legacySections);
    const ir = getStructureSummary(irSections);

    const buildRowSignatures = (sections = []) => sections.flatMap((section, sectionIndex) =>
      (section?.rows || []).map((row, rowIndex) => {
        const columns = row?.columns || [];
        return {
          key: `${sectionIndex}:${rowIndex}`,
          columnCount: columns.length,
          componentCounts: columns.map((column) => (column?.components || []).length),
          componentTypes: columns.map((column) => (column?.components || []).map((component) => component?.type || 'unknown').join('|')),
          hasBackground: !!(row?.settings?.backgroundColor || row?.settings?.backgroundImage),
        };
      })
    );

    const legacyRows = buildRowSignatures(legacySections);
    const irRows = buildRowSignatures(irSections);
    const pairedRows = Array.from({ length: Math.max(legacyRows.length, irRows.length) }, (_, index) => ({
      legacy: legacyRows[index] || null,
      ir: irRows[index] || null,
    }));

    const rowShapeMismatchCount = pairedRows.reduce((count, pair) => {
      if (!pair.legacy || !pair.ir) return count + 1;
      const sameColumnCount = pair.legacy.columnCount === pair.ir.columnCount;
      const sameComponentCounts = JSON.stringify(pair.legacy.componentCounts) === JSON.stringify(pair.ir.componentCounts);
      const sameComponentTypes = JSON.stringify(pair.legacy.componentTypes) === JSON.stringify(pair.ir.componentTypes);
      return count + (sameColumnCount && sameComponentCounts && sameComponentTypes ? 0 : 1);
    }, 0);

    return {
      legacy,
      ir,
      delta: {
        sections: ir.sections - legacy.sections,
        rows: ir.rows - legacy.rows,
        columns: ir.columns - legacy.columns,
        components: ir.components - legacy.components,
      },
      shape: {
        legacyRows,
        irRows,
        rowShapeMismatchCount,
      },
    };
  };

  const shouldUseIrSections = (comparison, irSections = []) => {
    if (!comparison || !Array.isArray(irSections) || irSections.length === 0) return false;

    const hasRenderableComponents = irSections.some((section) =>
      (section?.rows || []).some((row) =>
        (row?.columns || []).some((column) => (column?.components || []).length > 0)
      )
    );

    if (!hasRenderableComponents) return false;

    const { legacy, ir, delta } = comparison;
    const sectionsClose = Math.abs(delta.sections) <= 1;
    const rowsClose = Math.abs(delta.rows) <= Math.max(1, Math.ceil((legacy.rows || 0) * 0.15));
    const columnsClose = Math.abs(delta.columns) <= Math.max(2, Math.ceil((legacy.columns || 0) * 0.2));
    const componentsClose = Math.abs(delta.components) <= Math.max(3, Math.ceil((legacy.components || 0) * 0.25));
    const rowShapeClose = (comparison?.shape?.rowShapeMismatchCount || 0) <= Math.max(1, Math.ceil(((comparison?.shape?.legacyRows || []).length || 0) * 0.2));

    return hasRenderableComponents
      && ir.rows > 0
      && ir.columns > 0
      && sectionsClose
      && rowsClose
      && columnsClose
      && componentsClose
      && rowShapeClose;
  };

  const hasRenderableImportedContent = (sections = []) => sections.some((section) =>
    (section?.rows || []).some((row) =>
      (row?.columns || []).some((column) => (column?.components || []).length > 0)
    )
  );

  const getImportedFileBaseUrl = (file) => {
    const filePath = file?.path || '';
    if (!filePath) return '';
    try {
      const normalizedPath = `${filePath}`.replace(/\\/g, '/');
      const slashIndex = normalizedPath.lastIndexOf('/');
      const dirPath = slashIndex >= 0 ? normalizedPath.slice(0, slashIndex + 1) : normalizedPath;
      return new URL(`file:///${dirPath.replace(/^\/+/, '')}`).toString();
    } catch (err) {
      return '';
    }
  };

  const handleCreate = () => {
    navigate('/create');
  };

  const handleEditClick = () => {
    if (fileRef.current) fileRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const assetBaseUrl = getImportedFileBaseUrl(file) || getSavedFromBaseUrl(text);
      let importedSections;
      let importedTemplateSettings;
      const parsedTemplate = parseHtmlToSections(text);
      if (!parsedTemplate) return;

      const importedIr = htmlToIr(text, { assetBaseUrl });
      let mappedIrSections = [];
      let irScan = { sections: [], diagnostics: {} };
      try {
        irScan = scanIrToStructureMap(importedIr);
        mappedIrSections = (irScan.sections || []).length > 0 ? irScan.sections : irToSections(importedIr);
      } catch (irErr) {
        console.error('IR structure mapping failed during comparison:', irErr);
      }

      const legacySections = Array.isArray(parsedTemplate)
        ? parsedTemplate
        : parsedTemplate.sections;
      importedTemplateSettings = Array.isArray(parsedTemplate)
        ? null
        : parsedTemplate.templateSettings;

      const structureComparison = compareStructures(legacySections || [], mappedIrSections || []);
      if (mappedIrSections.length > 0) {
        console.log('Import structure compare:', structureComparison);
        console.log('IR scan diagnostics:', irScan?.diagnostics || {});
      }

      const irLooksUsable = hasRenderableImportedContent(mappedIrSections);
      const useIrSections = irLooksUsable;
      if (useIrSections) {
        importedSections = normalizeImportedSectionsUrls(mappedIrSections, assetBaseUrl);
        console.log('Using IR-mapped import structure as active path', {
          closeToLegacy: shouldUseIrSections(structureComparison, mappedIrSections),
          comparison: structureComparison,
        });
      } else {
        importedSections = normalizeImportedSectionsUrls(legacySections, assetBaseUrl);
        console.log('Falling back to legacy import structure because IR output is unusable', structureComparison);
      }

      if (!importedSections) return;

      navigate('/create', {
        state: {
          importedSections,
          importedTemplateSettings,
          importedIr,
        },
      });
    } catch (err) {
      console.error('Failed to read uploaded file:', err);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Box minH="calc(100vh - 72px)" display="flex" alignItems="center" justifyContent="center" p={8}>
      <VStack spacing={6} align="stretch" w="320px">
        <Button
          onClick={handleCreate}
          leftIcon={<AddIcon />}
          colorScheme="teal"
          size="lg"
          justifyContent="flex-start"
          h="56px"
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
        >
          Edit
        </Button>

        <Text fontSize="sm" color="gray.500" textAlign="center">
          Upload an HTML email template or signature to edit and download.
        </Text>

        <input
          ref={fileRef}
          type="file"
          accept=".html,text/html"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </VStack>
    </Box>
  );
};

export default EmailList;
