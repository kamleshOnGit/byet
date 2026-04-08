import React, { useState, useEffect } from 'react';
import { Box, Text, Input, Select, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Divider, Button, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon } from '@chakra-ui/react';

const SettingsPanel = ({ selectedTarget, onUpdateTarget, templateSettings, onTemplateSettingsChange }) => {
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

    // Background
    backgroundColor: 'transparent',
    backgroundImage: '',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',

    // Dimensions
    width: '',
    height: '',

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

    // Link specific
    linkColor: '',

    // Button specific
    buttonColor: '',
    buttonTextColor: '',

    // List specific
    listStyleType: 'disc',
  });

  const normalizeColorValue = (value, fallback = '#000000') => {
    const raw = `${value || ''}`.trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw) ? raw : fallback;
  };

  const renderColorField = (label, key, placeholder, fallback = '#000000') => (
    <Box mb={3}>
      <Text fontSize="xs" mb={1}>{label}</Text>
      <Box display="flex" gap={2} alignItems="center">
        <Input
          type="color"
          value={normalizeColorValue(settings[key], fallback)}
          onChange={(e) => handleSettingChange(key, e.target.value)}
          size="sm"
          width="56px"
          p={1}
          borderColor={settings[key] ? normalizeColorValue(settings[key], fallback) : 'gray.200'}
          bg="white"
        />
        <Input
          value={settings[key]}
          onChange={(e) => handleSettingChange(key, e.target.value)}
          size="sm"
          placeholder={placeholder}
        />
        <Box
          width="24px"
          height="24px"
          borderRadius="md"
          border="1px solid"
          borderColor="gray.200"
          bg={settings[key] && settings[key] !== 'transparent' ? normalizeColorValue(settings[key], fallback) : 'transparent'}
          backgroundImage={settings[key] === 'transparent' ? 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)' : 'none'}
          backgroundSize="8px 8px"
          backgroundPosition="0 0, 0 4px, 4px -4px, -4px 0px"
        />
      </Box>
    </Box>
  );

  const renderTemplateColorField = (label, key, placeholder, fallback = '#000000') => (
    <Box mb={3}>
      <Text fontSize="xs" mb={1}>{label}</Text>
      <Box display="flex" gap={2} alignItems="center">
        <Input
          type="color"
          value={normalizeColorValue(templateSettings?.[key], fallback)}
          onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, [key]: e.target.value })}
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
        <Box width="24px" height="24px" borderRadius="md" border="1px solid" borderColor="gray.200" bg={normalizeColorValue(templateSettings?.[key], fallback)} />
      </Box>
    </Box>
  );

  // Update settings when selected component changes
  useEffect(() => {
    if (selectedTarget?.data?.settings) {
      setSettings({
        // Start with default settings
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        fontSize: '',
        fontWeight: '',
        fontFamily: '',
        textAlign: '',
        textColor: '',
        backgroundColor: 'transparent',
        backgroundImage: '',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        width: '',
        height: '',
        border: 'none',
        borderColor: '#000000',
        borderWidth: 0,
        borderRadius: 0,
        letterSpacing: '',
        lineHeight: '',
        boxSizing: 'border-box',
        display: '',
        float: '',
        linkColor: '',
        buttonColor: '',
        buttonTextColor: '',
        listStyleType: 'disc',
        // Then override with target settings
        ...selectedTarget.data.settings
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
  const showDimensions = isRowOrColumn || (!isComponent ? true : componentType === 'Img');
  const showBorder = isRowOrColumn || (!isComponent ? true : componentTypesWithBoxStyles.includes(componentType));
  const showTypographyAdvanced = isRowOrColumn || (!isComponent ? true : componentTypesWithTextStyles.includes(componentType));
  const showLayout = isRowOrColumn || (!isComponent ? true : componentTypesWithBoxStyles.includes(componentType));
  const showListStyle = isComponent && (componentType === 'OrderedList' || componentType === 'UnorderedList');

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

                {/* Padding Settings */}
                {showPadding && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Padding</Text>
                    <Box display="flex" justifyContent="space-between" mb={3}>
                      <Box>
                        <Text fontSize="xs" mb={1}>Top</Text>
                        <Input
                          type="number"
                          value={settings.padding.top}
                          onChange={(e) => handlePaddingChange('top', parseInt(e.target.value) || 0)}
                          size="sm"
                          width="70px"
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xs" mb={1}>Right</Text>
                        <Input
                          type="number"
                          value={settings.padding.right}
                          onChange={(e) => handlePaddingChange('right', parseInt(e.target.value) || 0)}
                          size="sm"
                          width="70px"
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xs" mb={1}>Bottom</Text>
                        <Input
                          type="number"
                          value={settings.padding.bottom}
                          onChange={(e) => handlePaddingChange('bottom', parseInt(e.target.value) || 0)}
                          size="sm"
                          width="70px"
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xs" mb={1}>Left</Text>
                        <Input
                          type="number"
                          value={settings.padding.left}
                          onChange={(e) => handlePaddingChange('left', parseInt(e.target.value) || 0)}
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
                          value={settings.margin.top}
                          onChange={(e) => handleMarginChange('top', parseInt(e.target.value) || 0)}
                          size="sm"
                          width="70px"
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xs" mb={1}>Right</Text>
                        <Input
                          type="number"
                          value={settings.margin.right}
                          onChange={(e) => handleMarginChange('right', parseInt(e.target.value) || 0)}
                          size="sm"
                          width="70px"
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xs" mb={1}>Bottom</Text>
                        <Input
                          type="number"
                          value={settings.margin.bottom}
                          onChange={(e) => handleMarginChange('bottom', parseInt(e.target.value) || 0)}
                          size="sm"
                          width="70px"
                        />
                      </Box>
                      <Box>
                        <Text fontSize="xs" mb={1}>Left</Text>
                        <Input
                          type="number"
                          value={settings.margin.left}
                          onChange={(e) => handleMarginChange('left', parseInt(e.target.value) || 0)}
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

                    <Divider my={4} />
                  </>
                )}

                {/* Layout */}
                {showLayout && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Layout</Text>
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

                    <Divider my={4} />
                  </>
                )}

                {/* Component Specific Settings */}
                {selectedTarget.kind === 'component' && selectedTarget.data?.type === 'Button' && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Button Settings</Text>
                    {renderColorField('Button Color', 'buttonColor', '#0066cc / rgba(...)', '#0066cc')}
                    {renderColorField('Button Text Color', 'buttonTextColor', '#ffffff / inherit', '#ffffff')}
                  </>
                )}

                {selectedTarget.kind === 'component' && selectedTarget.data?.type === 'Link' && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Link Settings</Text>
                    {renderColorField('Link Color', 'linkColor', '#0066cc / inherit', '#0066cc')}
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
                      backgroundColor: 'transparent',
                      backgroundImage: '',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      width: '',
                      height: '',
                      border: 'none',
                      borderColor: '#000000',
                      borderWidth: 0,
                      borderRadius: 0,
                      letterSpacing: '',
                      lineHeight: '',
                      boxSizing: 'border-box',
                      display: '',
                      float: '',
                      linkColor: '',
                      buttonColor: '',
                      buttonTextColor: '',
                      listStyleType: 'disc',
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
