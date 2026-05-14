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


  const hasRenderableImportedContent = (sections = []) => sections.some((section) =>
    (section?.rows || []).some((row) =>
      (row?.columns || []).some((column) => (column?.components || []).length > 0)
    )
  );

  const getImportedFileBaseUrl = (file) => {
    const filePath = file?.path || '';
    if (filePath) {
      try {
        const normalizedPath = `${filePath}`.replace(/\\/g, '/');
        const slashIndex = normalizedPath.lastIndexOf('/');
        const dirPath = slashIndex >= 0 ? normalizedPath.slice(0, slashIndex + 1) : normalizedPath;
        return new URL(`file:///${dirPath.replace(/^\/+/, '')}`).toString();
      } catch (err) {
        return '';
      }
    }
    const relPath = file?.webkitRelativePath || '';
    if (relPath) {
      try {
        const normalized = `${relPath}`.replace(/\\/g, '/');
        const slashIndex = normalized.lastIndexOf('/');
        const dirPath = slashIndex >= 0 ? normalized.slice(0, slashIndex + 1) : '';
        if (dirPath) return new URL(dirPath, window.location.href).toString();
      } catch (err) {
        return '';
      }
    }
    return '';
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
      if (!file.name.match(/\.(html|htm)$/i)) {
        alert('Please select an HTML file');
        return;
      }
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


      const irLooksUsable = hasRenderableImportedContent(mappedIrSections);
      const useIrSections = irLooksUsable;
      if (useIrSections) {
        importedSections = normalizeImportedSectionsUrls(mappedIrSections, assetBaseUrl);
      } else {
        importedSections = normalizeImportedSectionsUrls(legacySections, assetBaseUrl);
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
