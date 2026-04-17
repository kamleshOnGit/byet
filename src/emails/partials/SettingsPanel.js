import React, { useState, useEffect } from 'react';
import { Box, Text, Input, Select, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Divider, Button, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon } from '@chakra-ui/react';

const SettingsPanel = ({ selectedTarget, onUpdateTarget, templateSettings, onTemplateSettingsChange }) => {
  const [draftValues, setDraftValues] = useState({});
  const [settings, setSettings] = useState({
    // Padding and margin
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    margin: { top: 0, right: 0, bottom: 0, left: 0 },

    // Text styles
    fontSize: '',
    fontWeight: '',
    fontFamily: '',
    textAlign: '',
    textColor: '',
    textDecoration: '',
    textTransform: '',
    fontStyle: '',
    whiteSpace: '',
    wordBreak: '',

    // Background
    backgroundColor: 'transparent',
    backgroundImage: '',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',

    // Dimensions
    width: '',
    height: '',
    minWidth: '',
    maxWidth: '',
    minHeight: '',
    maxHeight: '',

    // Border
    border: 'none',
    borderColor: '#000000',
    borderWidth: 0,
    borderRadius: 0,

    // Typography
    letterSpacing: '',
    lineHeight: '',

    // Layout
    boxSizing: 'border-box',
    display: '',
    float: '',
    alignSelf: '',
    justifyContent: '',
    alignItems: '',
    flexDirection: '',
    flexWrap: '',
    overflow: '',
    opacity: '',
    colSpan: 1,
    rowSpan: 1,
    verticalAlign: '',
    borderCollapse: 'collapse',
    cellSpacing: 0,
    cellPadding: 0,

    // Link specific
    linkColor: '',

    // Button specific
    buttonColor: '',
    buttonTextColor: '',

    // List specific
    listStyleType: 'disc',
    listStylePosition: '',
  });

  const normalizeColorValue = (value, fallback = '#000000') => {
    const raw = `${value || ''}`.trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw) ? raw : fallback;
  };

  const clampAlpha = (value) => {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(1, Math.max(0, parsed));
  };

  const parseColorParts = (value, fallback = '#000000') => {
    const raw = `${value || ''}`.trim();
    if (!raw || raw === 'transparent') {
      return { hex: fallback, alpha: 0, preview: 'transparent' };
    }
    const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1].length === 3
        ? `#${hexMatch[1].split('').map((ch) => `${ch}${ch}`).join('')}`
        : raw;
      return { hex, alpha: 1, preview: hex };
    }
    const rgbaMatch = raw.match(/^rgba?\(([^)]+)\)$/i);
    if (rgbaMatch) {
      const parts = rgbaMatch[1].split(',').map((part) => part.trim());
      const r = Math.min(255, Math.max(0, Number.parseInt(parts[0], 10) || 0));
      const g = Math.min(255, Math.max(0, Number.parseInt(parts[1], 10) || 0));
      const b = Math.min(255, Math.max(0, Number.parseInt(parts[2], 10) || 0));
      const a = parts.length > 3 ? clampAlpha(parts[3]) : 1;
      const hex = `#${[r, g, b].map((num) => num.toString(16).padStart(2, '0')).join('')}`;
      return { hex, alpha: a, preview: `rgba(${r}, ${g}, ${b}, ${a})` };
    }
    return { hex: fallback, alpha: 1, preview: raw };
  };

  const buildColorValue = (hex, alpha) => {
    const safeHex = normalizeColorValue(hex, '#000000');
    const safeAlpha = clampAlpha(alpha);
    if (safeAlpha <= 0) return 'transparent';
    if (safeAlpha >= 1) return safeHex;
    const normalized = safeHex.replace('#', '');
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
  };

  const renderColorField = (label, key, placeholder, fallback = '#000000') => (
    <Box mb={3}>
      <Text fontSize="xs" mb={1}>{label}</Text>
      <Box display="flex" gap={2} alignItems="center">
        {(() => {
          const colorParts = parseColorParts(settings[key], fallback);
          return (
            <>
        <Input
          type="color"
          value={colorParts.hex}
          onChange={(e) => handleSettingChange(key, buildColorValue(e.target.value, colorParts.alpha))}
          size="sm"
          width="56px"
          p={1}
          borderColor={settings[key] ? colorParts.hex : 'gray.200'}
          bg="white"
        />
        <Input
          value={settings[key]}
          onChange={(e) => handleSettingChange(key, e.target.value)}
          size="sm"
          placeholder={placeholder}
        />
        <Input
          type="number"
          min={0}
          max={100}
          step={1}
          value={Math.round(colorParts.alpha * 100)}
          onChange={(e) => handleSettingChange(key, buildColorValue(colorParts.hex, (Number.parseFloat(e.target.value) || 0) / 100))}
          size="sm"
          width="72px"
          placeholder="A%"
        />
        <Box
          width="24px"
          height="24px"
          borderRadius="md"
          border="1px solid"
          borderColor="gray.200"
          bg={colorParts.preview === 'transparent' ? 'transparent' : colorParts.preview}
          backgroundImage={settings[key] === 'transparent' ? 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)' : 'none'}
          backgroundSize="8px 8px"
          backgroundPosition="0 0, 0 4px, 4px -4px, -4px 0px"
        />
            </>
          );
        })()}
      </Box>
    </Box>
  );

  const renderTemplateColorField = (label, key, placeholder, fallback = '#000000') => (
    <Box mb={3}>
      <Text fontSize="xs" mb={1}>{label}</Text>
      <Box display="flex" gap={2} alignItems="center">
        {(() => {
          const colorParts = parseColorParts(templateSettings?.[key], fallback);
          return (
            <>
        <Input
          type="color"
          value={colorParts.hex}
          onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, [key]: buildColorValue(e.target.value, colorParts.alpha) })}
          size="sm"
          width="56px"
          p={1}
          bg="white"
        />
        <Input
          value={templateSettings?.[key] || ''}
          onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, [key]: e.target.value })}
          size="sm"
          placeholder={placeholder}
        />
        <Input
          type="number"
          min={0}
          max={100}
          step={1}
          value={Math.round(colorParts.alpha * 100)}
          onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, [key]: buildColorValue(colorParts.hex, (Number.parseFloat(e.target.value) || 0) / 100) })}
          size="sm"
          width="72px"
          placeholder="A%"
        />
        <Box width="24px" height="24px" borderRadius="md" border="1px solid" borderColor="gray.200" bg={colorParts.preview === 'transparent' ? 'transparent' : colorParts.preview} backgroundImage={(templateSettings?.[key] || '') === 'transparent' ? 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)' : 'none'} backgroundSize="8px 8px" backgroundPosition="0 0, 0 4px, 4px -4px, -4px 0px" />
            </>
          );
        })()}
      </Box>
    </Box>
  );

  // Update settings when selected component changes
  useEffect(() => {
    if (selectedTarget?.data?.settings) {
      setDraftValues({});
      setSettings({
        // Start with default settings
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        fontSize: '',
        fontWeight: '',
        fontFamily: '',
        textAlign: '',
        textColor: '',
        textDecoration: '',
        textTransform: '',
        fontStyle: '',
        whiteSpace: '',
        wordBreak: '',
        backgroundColor: 'transparent',
        backgroundImage: '',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        width: '',
        height: '',
        minWidth: '',
        maxWidth: '',
        minHeight: '',
        maxHeight: '',
        border: 'none',
        borderColor: '#000000',
        borderWidth: 0,
        borderRadius: 0,
        letterSpacing: '',
        lineHeight: '',
        boxSizing: 'border-box',
        display: '',
        float: '',
        alignSelf: '',
        justifyContent: '',
        alignItems: '',
        flexDirection: '',
        flexWrap: '',
        overflow: '',
        opacity: '',
        colSpan: 1,
        rowSpan: 1,
        verticalAlign: '',
        borderCollapse: 'collapse',
        cellSpacing: 0,
        cellPadding: 0,
        linkColor: '',
        buttonColor: '',
        buttonTextColor: '',
        listStyleType: 'disc',
        listStylePosition: '',
        // Then override with target settings
        ...selectedTarget.data.settings,
        ...(selectedTarget.kind === 'tableCell' ? {
          width: selectedTarget.data.width ?? selectedTarget.data.settings?.width ?? '',
          colSpan: selectedTarget.data.colSpan ?? selectedTarget.data.settings?.colSpan ?? 1,
          rowSpan: selectedTarget.data.rowSpan ?? selectedTarget.data.settings?.rowSpan ?? 1,
          verticalAlign: selectedTarget.data.settings?.verticalAlign || '',
        } : {}),
      });
    }
  }, [selectedTarget]);

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Update the target if onUpdateTarget is provided
    if (onUpdateTarget && selectedTarget) {
      onUpdateTarget({
        ...selectedTarget,
        settings: newSettings,
      });
    }
  };

  const handlePaddingChange = (side, value) => {
    const newPadding = { ...settings.padding, [side]: value };
    handleSettingChange('padding', newPadding);
  };

  const handleMarginChange = (side, value) => {
    const newMargin = { ...settings.margin, [side]: value };
    handleSettingChange('margin', newMargin);
  };

  const getDraftKey = (group, side) => `${group}.${side}`;

  const handleBoxNumberDraftChange = (group, side, value) => {
    setDraftValues((prev) => ({ ...prev, [getDraftKey(group, side)]: value }));
  };

  const commitBoxNumberDraft = (group, side, fallback = 0) => {
    const draftKey = getDraftKey(group, side);
    const rawValue = draftValues[draftKey];
    if (rawValue === undefined) return;
    const trimmed = `${rawValue}`.trim();
    const nextValue = trimmed === '' ? fallback : (Number.parseInt(trimmed, 10) || fallback);
    if (group === 'padding') {
      handlePaddingChange(side, nextValue);
    } else {
      handleMarginChange(side, nextValue);
    }
    setDraftValues((prev) => {
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
  };

  const getBoxNumberValue = (group, side) => {
    const draftKey = getDraftKey(group, side);
    if (Object.prototype.hasOwnProperty.call(draftValues, draftKey)) {
      return draftValues[draftKey];
    }
    return settings[group]?.[side] ?? 0;
  };

  const toTitleCase = (value) => {
    if (!value) return value;
    return `${value}`.charAt(0).toUpperCase() + `${value}`.slice(1);
  };

  const targetLabel = selectedTarget

    ? (selectedTarget.kind === 'component' ? selectedTarget.data?.type : toTitleCase(selectedTarget.kind))
    : null;

  const isComponent = selectedTarget?.kind === 'component';
  const componentType = selectedTarget?.data?.type;
  const isRowOrColumn = selectedTarget?.kind === 'row' || selectedTarget?.kind === 'column';

  const originalTag = selectedTarget?.data?.settings?.originalTag;

  const componentTypesWithBoxStyles = [

    'Text',
    'Paragraph',
    'Heading',
    'Header1',
    'Header2',
    'Header3',
    'Img',
    'Link',
    'Button',
    'UnorderedList',
    'Div',
    'Span',
    'Menu',
    'Nav',
    'Header',
    'Footer',
    'Sidebar',
    'Banner',
  ];

  const componentTypesWithTextStyles = [
    'Text',
    'Paragraph',
    'Heading',
    'Header1',
    'Header2',
    'Header3',
    'Link',
    'Button',
    'UnorderedList',
    'Div',
    'Span',
    'Menu',
    'Nav',
    'Header',
    'Footer',
    'Sidebar',
    'Banner',
  ];

  const showPadding = isRowOrColumn || (!isComponent ? true : componentTypesWithBoxStyles.includes(componentType));
  const showMargin = isRowOrColumn || (!isComponent ? true : componentTypesWithBoxStyles.includes(componentType));
  const showText = isRowOrColumn || (!isComponent ? true : componentTypesWithTextStyles.includes(componentType));
  const showBackground = isRowOrColumn || (!isComponent ? true : componentTypesWithBoxStyles.includes(componentType));
  const showDimensions = Boolean(selectedTarget);
  const showBorder = isRowOrColumn || (!isComponent ? true : componentTypesWithBoxStyles.includes(componentType));
  const showTypographyAdvanced = isRowOrColumn || (!isComponent ? true : componentTypesWithTextStyles.includes(componentType));
  const showLayout = isRowOrColumn || (!isComponent ? true : componentTypesWithBoxStyles.includes(componentType));
  const showListStyle = isComponent && (componentType === 'OrderedList' || componentType === 'UnorderedList');
  const isTableComponent = isComponent && componentType === 'Table';
  const isTableRowTarget = selectedTarget?.kind === 'tableRow';
  const isTableCellTarget = selectedTarget?.kind === 'tableCell';

  return (
    <Box w="100%" h="100%" p={4} overflowY="auto">
      <Accordion allowMultiple defaultIndex={[1]}>
        <AccordionItem>
          <AccordionButton px={0}>
            <Box flex="1" textAlign="left">
              <Text fontSize="lg" fontWeight="bold">Template global style</Text>
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel px={0} pt={4}>
            <Text fontSize="md" fontWeight="semibold" mb={2}>Typography</Text>
            <Box mb={3}>
              <Text fontSize="xs" mb={1}>Font Family</Text>
              <Input
                value={templateSettings?.fontFamily || ''}
                onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, fontFamily: e.target.value })}
                size="sm"
                placeholder="Arial, sans-serif"
              />
            </Box>

            <Box mb={3}>
              <Text fontSize="xs" mb={1}>Font Size</Text>
              <Input
                value={templateSettings?.fontSize || ''}
                onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, fontSize: e.target.value })}
                size="sm"
                placeholder="14px"
              />
            </Box>

            <Box mb={3}>
              <Text fontSize="xs" mb={1}>Font Weight</Text>
              <Input
                value={templateSettings?.fontWeight || 'normal'}
                onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, fontWeight: e.target.value })}
                size="sm"
                placeholder="normal / bold / 700"
              />
            </Box>

            <Box mb={3}>
              <Text fontSize="xs" mb={1}>Line Height</Text>
              <Input
                value={templateSettings?.lineHeight || ''}
                onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, lineHeight: e.target.value })}
                size="sm"
                placeholder="1.5"
              />
            </Box>

            {renderTemplateColorField('Text Color', 'textColor', '#000000 / rgb(...) / inherit', '#000000')}

            <Divider my={4} />

            <Text fontSize="md" fontWeight="semibold" mb={2}>Template</Text>
            {renderTemplateColorField('Body Background Color', 'bodyBackgroundColor', 'transparent / #f5f5f5 / rgba(...)', '#f5f5f5')}

            <Box mb={3}>
              <Text fontSize="xs" mb={1}>Body Background Image</Text>
              <Input
                value={templateSettings?.bodyBackgroundImage || ''}
                onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, bodyBackgroundImage: e.target.value })}
                size="sm"
                placeholder="https://..."
              />
            </Box>

            <Box mb={3}>
              <Text fontSize="xs" mb={1}>Body Background Size</Text>
              <Input
                value={templateSettings?.bodyBackgroundSize || ''}
                onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, bodyBackgroundSize: e.target.value })}
                size="sm"
                placeholder="cover / contain / 100% auto"
              />
            </Box>

            <Box mb={3}>
              <Text fontSize="xs" mb={1}>Body Background Position</Text>
              <Input
                value={templateSettings?.bodyBackgroundPosition || ''}
                onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, bodyBackgroundPosition: e.target.value })}
                size="sm"
                placeholder="center / top center / 50% 0"
              />
            </Box>

            <Box mb={3}>
              <Text fontSize="xs" mb={1}>Body Background Repeat</Text>
              <Input
                value={templateSettings?.bodyBackgroundRepeat || ''}
                onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, bodyBackgroundRepeat: e.target.value })}
                size="sm"
                placeholder="no-repeat / repeat-x"
              />
            </Box>

            {renderTemplateColorField('Container Background Color', 'containerBackgroundColor', 'transparent / #ffffff / rgba(...)', '#ffffff')}

            <Box mb={3}>
              <Text fontSize="xs" mb={1}>Template Width</Text>
              <Input
                value={templateSettings?.containerWidth || ''}
                onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, containerWidth: e.target.value })}
                size="sm"
                placeholder="600px"
              />
            </Box>

            <Box mb={3}>
              <Text fontSize="xs" mb={1}>Template Min Height</Text>
              <Input
                value={templateSettings?.containerMinHeight || ''}
                onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, containerMinHeight: e.target.value })}
                size="sm"
                placeholder="auto / 400px"
              />
            </Box>

            <Box mb={3}>
              <Text fontSize="xs" mb={1}>Container Padding</Text>
              <Input
                value={templateSettings?.containerPadding || ''}
                onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, containerPadding: e.target.value })}
                size="sm"
                placeholder="20px"
              />
            </Box>
          </AccordionPanel>
        </AccordionItem>

        <AccordionItem>
          <AccordionButton px={0}>
            <Box flex="1" textAlign="left">
              <Text fontSize="lg" fontWeight="bold">
                {targetLabel ? `${targetLabel} Settings` : 'Element Settings'}
              </Text>
              {originalTag && (
                <Text fontSize="10px" color="gray.400" mt={-1}>
                  Original tag: &lt;{originalTag}&gt;
                </Text>
              )}
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel px={0} pt={4}>

            {!selectedTarget ? (
              <Text textAlign="center" color="gray.500">
                Select a row, column, or component to edit its settings
              </Text>
            ) : (
              <>

                {/* Component Specific Settings */}
                {selectedTarget.kind === 'component' && selectedTarget.data?.type === 'Button' && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Button Settings</Text>
                    {renderColorField('Button Color', 'buttonColor', '#0066cc / rgba(...)', '#0066cc')}
                    {renderColorField('Button Text Color', 'buttonTextColor', '#ffffff / inherit', '#ffffff')}
                    <Divider my={4} />
                  </>
                )}

                {selectedTarget.kind === 'component' && selectedTarget.data?.type === 'Link' && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Link Settings</Text>
                    {renderColorField('Link Color', 'linkColor', '#0066cc / inherit', '#0066cc')}
                    <Divider my={4} />
                  </>
                )}

                {isTableComponent && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Table Settings</Text>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Border Collapse</Text>
                      <Select value={settings.borderCollapse} onChange={(e) => handleSettingChange('borderCollapse', e.target.value)} size="sm">
                        <option value="collapse">Collapse</option>
                        <option value="separate">Separate</option>
                      </Select>
                    </Box>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Cell Spacing</Text>
                      <Input type="number" value={settings.cellSpacing} onChange={(e) => handleSettingChange('cellSpacing', Number.parseInt(e.target.value, 10) || 0)} size="sm" />
                    </Box>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Cell Padding</Text>
                      <Input type="number" value={settings.cellPadding} onChange={(e) => handleSettingChange('cellPadding', Number.parseInt(e.target.value, 10) || 0)} size="sm" />
                    </Box>
                    <Divider my={4} />
                  </>
                )}

                {isTableRowTarget && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Table Row Settings</Text>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Row Height</Text>
                      <Input value={settings.height} onChange={(e) => handleSettingChange('height', e.target.value)} size="sm" placeholder="auto / 60px" />
                    </Box>
                    <Divider my={4} />
                  </>
                )}

                {isTableCellTarget && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Table Cell Settings</Text>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Cell Width</Text>
                      <Input value={settings.width} onChange={(e) => handleSettingChange('width', e.target.value)} size="sm" placeholder="50% / 200px" />
                    </Box>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Col Span</Text>
                      <Input type="number" min={1} value={settings.colSpan} onChange={(e) => handleSettingChange('colSpan', Math.max(1, Number.parseInt(e.target.value, 10) || 1))} size="sm" />
                    </Box>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Row Span</Text>
                      <Input type="number" min={1} value={settings.rowSpan} onChange={(e) => handleSettingChange('rowSpan', Math.max(1, Number.parseInt(e.target.value, 10) || 1))} size="sm" />
                    </Box>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Vertical Align</Text>
                      <Select value={settings.verticalAlign} onChange={(e) => handleSettingChange('verticalAlign', e.target.value)} size="sm">
                        <option value="">Default</option>
                        <option value="top">Top</option>
                        <option value="middle">Middle</option>
                        <option value="bottom">Bottom</option>
                      </Select>
                    </Box>
                    <Divider my={4} />
                  </>
                )}

                {/* Dimensions */}
                {showDimensions && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Dimensions</Text>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Width</Text>
                      <Input
                        value={settings.width}
                        onChange={(e) => handleSettingChange('width', e.target.value)}
                        size="sm"
                      />
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Height</Text>
                      <Input
                        value={settings.height}
                        onChange={(e) => handleSettingChange('height', e.target.value)}
                        size="sm"
                      />
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Min Width</Text>
                      <Input
                        value={settings.minWidth}
                        onChange={(e) => handleSettingChange('minWidth', e.target.value)}
                        size="sm"
                        placeholder="120px / 50%"
                      />
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Max Width</Text>
                      <Input
                        value={settings.maxWidth}
                        onChange={(e) => handleSettingChange('maxWidth', e.target.value)}
                        size="sm"
                        placeholder="600px / 100%"
                      />
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Min Height</Text>
                      <Input
                        value={settings.minHeight}
                        onChange={(e) => handleSettingChange('minHeight', e.target.value)}
                        size="sm"
                        placeholder="40px"
                      />
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Max Height</Text>
                      <Input
                        value={settings.maxHeight}
                        onChange={(e) => handleSettingChange('maxHeight', e.target.value)}
                        size="sm"
                        placeholder="300px"
                      />
                    </Box>

                    <Divider my={4} />
                  </>
                )}

                {/* Layout */}
                {showLayout && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Layout</Text>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Display</Text>
                      <Select
                        value={settings.display}
                        onChange={(e) => handleSettingChange('display', e.target.value)}
                        size="sm"
                      >
                        <option value="">Default</option>
                        <option value="block">Block</option>
                        <option value="inline-block">Inline Block</option>
                        <option value="inline">Inline</option>
                        <option value="flex">Flex</option>
                      </Select>
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Align Self</Text>
                      <Select
                        value={settings.alignSelf}
                        onChange={(e) => handleSettingChange('alignSelf', e.target.value)}
                        size="sm"
                      >
                        <option value="">Default</option>
                        <option value="auto">Auto</option>
                        <option value="stretch">Stretch</option>
                        <option value="flex-start">Flex Start</option>
                        <option value="center">Center</option>
                        <option value="flex-end">Flex End</option>
                        <option value="baseline">Baseline</option>
                      </Select>
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Justify Content</Text>
                      <Select
                        value={settings.justifyContent}
                        onChange={(e) => handleSettingChange('justifyContent', e.target.value)}
                        size="sm"
                      >
                        <option value="">Default</option>
                        <option value="flex-start">Flex Start</option>
                        <option value="center">Center</option>
                        <option value="flex-end">Flex End</option>
                        <option value="space-between">Space Between</option>
                        <option value="space-around">Space Around</option>
                        <option value="space-evenly">Space Evenly</option>
                      </Select>
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Align Items</Text>
                      <Select
                        value={settings.alignItems}
                        onChange={(e) => handleSettingChange('alignItems', e.target.value)}
                        size="sm"
                      >
                        <option value="">Default</option>
                        <option value="stretch">Stretch</option>
                        <option value="flex-start">Flex Start</option>
                        <option value="center">Center</option>
                        <option value="flex-end">Flex End</option>
                      </Select>
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Flex Direction</Text>
                      <Select
                        value={settings.flexDirection}
                        onChange={(e) => handleSettingChange('flexDirection', e.target.value)}
                        size="sm"
                      >
                        <option value="">Default</option>
                        <option value="row">Row</option>
                        <option value="column">Column</option>
                        <option value="row-reverse">Row Reverse</option>
                        <option value="column-reverse">Column Reverse</option>
                      </Select>
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Flex Wrap</Text>
                      <Select
                        value={settings.flexWrap}
                        onChange={(e) => handleSettingChange('flexWrap', e.target.value)}
                        size="sm"
                      >
                        <option value="">Default</option>
                        <option value="nowrap">No Wrap</option>
                        <option value="wrap">Wrap</option>
                        <option value="wrap-reverse">Wrap Reverse</option>
                      </Select>
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Float</Text>
                      <Select
                        value={settings.float}
                        onChange={(e) => handleSettingChange('float', e.target.value)}
                        size="sm"
                      >
                        <option value="">Default</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="none">None</option>
                      </Select>
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Overflow</Text>
                      <Select
                        value={settings.overflow}
                        onChange={(e) => handleSettingChange('overflow', e.target.value)}
                        size="sm"
                      >
                        <option value="">Default</option>
                        <option value="visible">Visible</option>
                        <option value="hidden">Hidden</option>
                        <option value="auto">Auto</option>
                        <option value="scroll">Scroll</option>
                      </Select>
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Opacity</Text>
                      <Input
                        value={settings.opacity}
                        onChange={(e) => handleSettingChange('opacity', e.target.value)}
                        size="sm"
                        placeholder="1 / 0.5"
                      />
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Box Sizing</Text>
                      <Select
                        value={settings.boxSizing}
                        onChange={(e) => handleSettingChange('boxSizing', e.target.value)}
                        size="sm"
                      >
                        <option value="border-box">Border Box</option>
                        <option value="content-box">Content Box</option>
                      </Select>
                    </Box>

                    <Divider my={4} />
                  </>
                )}

                {/* Padding Settings */}
                {showPadding && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Padding</Text>
                    <Box display="flex" justifyContent="space-between" mb={3}>
                      <Box>
                        <Text fontSize="xs" mb={1}>Top</Text>
                        <Input
                          type="number"
                          value={getBoxNumberValue('padding', 'top')}
                          onChange={(e) => handleBoxNumberDraftChange('padding', 'top', e.target.value)}
                          onBlur={() => commitBoxNumberDraft('padding', 'top', 0)}
                          size="sm"
                          width="70px"
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xs" mb={1}>Right</Text>
                        <Input
                          type="number"
                          value={getBoxNumberValue('padding', 'right')}
                          onChange={(e) => handleBoxNumberDraftChange('padding', 'right', e.target.value)}
                          onBlur={() => commitBoxNumberDraft('padding', 'right', 0)}
                          size="sm"
                          width="70px"
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xs" mb={1}>Bottom</Text>
                        <Input
                          type="number"
                          value={getBoxNumberValue('padding', 'bottom')}
                          onChange={(e) => handleBoxNumberDraftChange('padding', 'bottom', e.target.value)}
                          onBlur={() => commitBoxNumberDraft('padding', 'bottom', 0)}
                          size="sm"
                          width="70px"
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xs" mb={1}>Left</Text>
                        <Input
                          type="number"
                          value={getBoxNumberValue('padding', 'left')}
                          onChange={(e) => handleBoxNumberDraftChange('padding', 'left', e.target.value)}
                          onBlur={() => commitBoxNumberDraft('padding', 'left', 0)}
                          size="sm"
                          width="70px"
                        />
                      </Box>
                    </Box>

                    <Divider my={4} />
                  </>
                )}

                {/* Margin Settings */}
                {showMargin && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Margin</Text>
                    <Box display="flex" justifyContent="space-between" mb={3}>
                      <Box>
                        <Text fontSize="xs" mb={1}>Top</Text>
                        <Input
                          type="number"
                          value={getBoxNumberValue('margin', 'top')}
                          onChange={(e) => handleBoxNumberDraftChange('margin', 'top', e.target.value)}
                          onBlur={() => commitBoxNumberDraft('margin', 'top', 0)}
                          size="sm"
                          width="70px"
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xs" mb={1}>Right</Text>
                        <Input
                          type="number"
                          value={getBoxNumberValue('margin', 'right')}
                          onChange={(e) => handleBoxNumberDraftChange('margin', 'right', e.target.value)}
                          onBlur={() => commitBoxNumberDraft('margin', 'right', 0)}
                          size="sm"
                          width="70px"
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xs" mb={1}>Bottom</Text>
                        <Input
                          type="number"
                          value={getBoxNumberValue('margin', 'bottom')}
                          onChange={(e) => handleBoxNumberDraftChange('margin', 'bottom', e.target.value)}
                          onBlur={() => commitBoxNumberDraft('margin', 'bottom', 0)}
                          size="sm"
                          width="70px"
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xs" mb={1}>Left</Text>
                        <Input
                          type="number"
                          value={getBoxNumberValue('margin', 'left')}
                          onChange={(e) => handleBoxNumberDraftChange('margin', 'left', e.target.value)}
                          onBlur={() => commitBoxNumberDraft('margin', 'left', 0)}
                          size="sm"
                          width="70px"
                        />
                      </Box>
                    </Box>

                    <Divider my={4} />
                  </>
                )}

                {/* Text Settings */}
                {showText && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Text</Text>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Font Size</Text>
                      <Input
                        value={settings.fontSize}
                        onChange={(e) => handleSettingChange('fontSize', e.target.value)}
                        size="sm"
                        placeholder="14px, 16px, 1.2em..."
                      />
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Font Weight</Text>
                      <Input
                        value={settings.fontWeight}
                        onChange={(e) => handleSettingChange('fontWeight', e.target.value)}
                        size="sm"
                        placeholder="normal / bold / 700"
                      />
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Font Family</Text>
                      <Input
                        value={settings.fontFamily}
                        onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
                        size="sm"
                        placeholder="Arial, sans-serif"
                      />
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Text Alignment</Text>
                      <Select
                        value={settings.textAlign}
                        onChange={(e) => handleSettingChange('textAlign', e.target.value)}
                        size="sm"
                      >
                        <option value="">Default</option>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                        <option value="justify">Justify</option>
                      </Select>
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Text Decoration</Text>
                      <Select
                        value={settings.textDecoration}
                        onChange={(e) => handleSettingChange('textDecoration', e.target.value)}
                        size="sm"
                      >
                        <option value="">Default</option>
                        <option value="none">None</option>
                        <option value="underline">Underline</option>
                        <option value="overline">Overline</option>
                        <option value="line-through">Line Through</option>
                      </Select>
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Text Transform</Text>
                      <Select
                        value={settings.textTransform}
                        onChange={(e) => handleSettingChange('textTransform', e.target.value)}
                        size="sm"
                      >
                        <option value="">Default</option>
                        <option value="none">None</option>
                        <option value="uppercase">Uppercase</option>
                        <option value="lowercase">Lowercase</option>
                        <option value="capitalize">Capitalize</option>
                      </Select>
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Font Style</Text>
                      <Select
                        value={settings.fontStyle}
                        onChange={(e) => handleSettingChange('fontStyle', e.target.value)}
                        size="sm"
                      >
                        <option value="">Default</option>
                        <option value="normal">Normal</option>
                        <option value="italic">Italic</option>
                        <option value="oblique">Oblique</option>
                      </Select>
                    </Box>

                    {renderColorField('Text Color', 'textColor', '#000000 / rgb(...) / inherit', '#000000')}

                    <Divider my={4} />
                  </>
                )}

                {showListStyle && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>List</Text>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>List Style Type</Text>
                      <Select
                        value={settings.listStyleType}
                        onChange={(e) => handleSettingChange('listStyleType', e.target.value)}
                        size="sm"
                      >
                        <option value="disc">Disc</option>
                        <option value="circle">Circle</option>
                        <option value="square">Square</option>
                        <option value="decimal">Decimal</option>
                        <option value="lower-alpha">Lower Alpha</option>
                        <option value="upper-alpha">Upper Alpha</option>
                        <option value="lower-roman">Lower Roman</option>
                        <option value="upper-roman">Upper Roman</option>
                      </Select>
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>List Style Position</Text>
                      <Select
                        value={settings.listStylePosition}
                        onChange={(e) => handleSettingChange('listStylePosition', e.target.value)}
                        size="sm"
                      >
                        <option value="">Default</option>
                        <option value="outside">Outside</option>
                        <option value="inside">Inside</option>
                      </Select>
                    </Box>
                    <Divider my={4} />
                  </>
                )}

                {/* Background Settings */}
                {showBackground && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Background</Text>
                    {renderColorField('Background Color', 'backgroundColor', 'transparent / #ffffff / rgba(...)', '#ffffff')}

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Background Image URL</Text>
                      <Input
                        value={settings.backgroundImage}
                        onChange={(e) => handleSettingChange('backgroundImage', e.target.value)}
                        size="sm"
                        placeholder="https://..."
                      />
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Background Size</Text>
                      <Input
                        value={settings.backgroundSize}
                        onChange={(e) => handleSettingChange('backgroundSize', e.target.value)}
                        size="sm"
                        placeholder="cover / contain / 100% auto"
                      />
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Background Position</Text>
                      <Input
                        value={settings.backgroundPosition}
                        onChange={(e) => handleSettingChange('backgroundPosition', e.target.value)}
                        size="sm"
                        placeholder="center / top center / 50% 0"
                      />
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Background Repeat</Text>
                      <Input
                        value={settings.backgroundRepeat}
                        onChange={(e) => handleSettingChange('backgroundRepeat', e.target.value)}
                        size="sm"
                        placeholder="no-repeat / repeat / repeat-x"
                      />
                    </Box>

                    <Divider my={4} />
                  </>
                )}

                {/* Border Settings */}
                {showBorder && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Border</Text>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Border Style</Text>
                      <Select
                        value={settings.border}
                        onChange={(e) => handleSettingChange('border', e.target.value)}
                        size="sm"
                      >
                        <option value="none">None</option>
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                        <option value="double">Double</option>
                      </Select>
                    </Box>

                    {renderColorField('Border Color', 'borderColor', '#000000 / rgba(...)', '#000000')}

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Border Width</Text>
                      <Slider
                        value={settings.borderWidth}
                        onChange={(val) => handleSettingChange('borderWidth', val)}
                        min={0}
                        max={10}
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                      <Text fontSize="xs" textAlign="center">{settings.borderWidth}px</Text>
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Border Radius</Text>
                      <Slider
                        value={settings.borderRadius}
                        onChange={(val) => handleSettingChange('borderRadius', val)}
                        min={0}
                        max={50}
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                      <Text fontSize="xs" textAlign="center">{settings.borderRadius}px</Text>
                    </Box>

                    <Divider my={4} />
                  </>
                )}

                {/* Typography */}
                {showTypographyAdvanced && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Typography</Text>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Letter Spacing</Text>
                      <Input
                        value={settings.letterSpacing}
                        onChange={(e) => handleSettingChange('letterSpacing', e.target.value)}
                        size="sm"
                        placeholder="normal / 0.5px"
                      />
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Line Height</Text>
                      <Input
                        value={settings.lineHeight}
                        onChange={(e) => handleSettingChange('lineHeight', e.target.value)}
                        size="sm"
                        placeholder="normal / 1.5 / 20px"
                      />
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>White Space</Text>
                      <Select
                        value={settings.whiteSpace}
                        onChange={(e) => handleSettingChange('whiteSpace', e.target.value)}
                        size="sm"
                      >
                        <option value="">Default</option>
                        <option value="normal">Normal</option>
                        <option value="nowrap">No Wrap</option>
                        <option value="pre">Pre</option>
                        <option value="pre-wrap">Pre Wrap</option>
                        <option value="pre-line">Pre Line</option>
                      </Select>
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Word Break</Text>
                      <Select
                        value={settings.wordBreak}
                        onChange={(e) => handleSettingChange('wordBreak', e.target.value)}
                        size="sm"
                      >
                        <option value="">Default</option>
                        <option value="normal">Normal</option>
                        <option value="break-word">Break Word</option>
                        <option value="break-all">Break All</option>
                        <option value="keep-all">Keep All</option>
                      </Select>
                    </Box>

                    <Divider my={4} />
                  </>
                )}

                <Button
                  colorScheme="blue"
                  size="sm"
                  mt={4}
                  onClick={() => {
                    const defaultSettings = {
                      // Reset to default values
                      padding: { top: 0, right: 0, bottom: 0, left: 0 },
                      margin: { top: 0, right: 0, bottom: 0, left: 0 },
                      fontSize: '',
                      fontWeight: '',
                      fontFamily: '',
                      textAlign: '',
                      textColor: '',
                      textDecoration: '',
                      textTransform: '',
                      fontStyle: '',
                      whiteSpace: '',
                      wordBreak: '',
                      backgroundColor: 'transparent',
                      backgroundImage: '',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      width: '',
                      height: '',
                      minWidth: '',
                      maxWidth: '',
                      minHeight: '',
                      maxHeight: '',
                      border: 'none',
                      borderColor: '#000000',
                      borderWidth: 0,
                      borderRadius: 0,
                      letterSpacing: '',
                      lineHeight: '',
                      boxSizing: 'border-box',
                      display: '',
                      float: '',
                      alignSelf: '',
                      justifyContent: '',
                      alignItems: '',
                      flexDirection: '',
                      flexWrap: '',
                      overflow: '',
                      opacity: '',
                      colSpan: 1,
                      rowSpan: 1,
                      verticalAlign: '',
                      borderCollapse: 'collapse',
                      cellSpacing: 0,
                      cellPadding: 0,
                      linkColor: '',
                      buttonColor: '',
                      buttonTextColor: '',
                      listStyleType: 'disc',
                      listStylePosition: '',
                    };
                    setSettings(defaultSettings);

                    // Update the target if onUpdateTarget is provided
                    if (onUpdateTarget && selectedTarget) {
                      onUpdateTarget({
                        ...selectedTarget,
                        settings: defaultSettings,
                      });
                    }
                  }}
                >
                  Reset to Default
                </Button>
              </>
            )}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Box>
  );
};

export default SettingsPanel;
