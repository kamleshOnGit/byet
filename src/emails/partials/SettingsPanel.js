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

    // Link specific
    linkColor: '',

    // Button specific
    buttonColor: '',
    buttonTextColor: '',

    // List specific
    listStyleType: 'disc',
  });

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

            <Box mb={3}>
              <Text fontSize="xs" mb={1}>Text Color</Text>
              <Input
                value={templateSettings?.textColor || '#000000'}
                onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, textColor: e.target.value })}
                size="sm"
                placeholder="#000000 / rgb(...) / inherit"
              />
            </Box>

            <Divider my={4} />

            <Text fontSize="md" fontWeight="semibold" mb={2}>Template</Text>
            <Box mb={3}>
              <Text fontSize="xs" mb={1}>Body Background Color</Text>
              <Input
                value={templateSettings?.bodyBackgroundColor || '#f5f5f5'}
                onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, bodyBackgroundColor: e.target.value })}
                size="sm"
                placeholder="transparent / #f5f5f5 / rgba(...)"
              />
            </Box>

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

            <Box mb={3}>
              <Text fontSize="xs" mb={1}>Container Background Color</Text>
              <Input
                value={templateSettings?.containerBackgroundColor || '#ffffff'}
                onChange={(e) => onTemplateSettingsChange?.({ ...templateSettings, containerBackgroundColor: e.target.value })}
                size="sm"
                placeholder="transparent / #ffffff / rgba(...)"
              />
            </Box>

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
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                        <option value="justify">Justify</option>
                      </Select>
                    </Box>

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Text Color</Text>
                      <Input
                        value={settings.textColor}
                        onChange={(e) => handleSettingChange('textColor', e.target.value)}
                        size="sm"
                        placeholder="#000000 / rgb(...) / inherit"
                      />
                    </Box>

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
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Background Color</Text>
                      <Input
                        value={settings.backgroundColor}
                        onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                        size="sm"
                        placeholder="transparent / #ffffff / rgba(...)"
                      />
                    </Box>

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

                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Border Color</Text>
                      <Input
                        value={settings.borderColor}
                        onChange={(e) => handleSettingChange('borderColor', e.target.value)}
                        size="sm"
                        placeholder="#000000 / rgba(...)"
                      />
                    </Box>

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

                    <Divider my={4} />
                  </>
                )}

                {/* Component Specific Settings */}
                {selectedTarget.kind === 'component' && selectedTarget.data?.type === 'Button' && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Button Settings</Text>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Button Color</Text>
                      <Input
                        value={settings.buttonColor}
                        onChange={(e) => handleSettingChange('buttonColor', e.target.value)}
                        size="sm"
                        placeholder="#0066cc / rgba(...)"
                      />
                    </Box>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Button Text Color</Text>
                      <Input
                        value={settings.buttonTextColor}
                        onChange={(e) => handleSettingChange('buttonTextColor', e.target.value)}
                        size="sm"
                        placeholder="#ffffff / inherit"
                      />
                    </Box>
                  </>
                )}

                {selectedTarget.kind === 'component' && selectedTarget.data?.type === 'Link' && (
                  <>
                    <Text fontSize="md" fontWeight="semibold" mb={2}>Link Settings</Text>
                    <Box mb={3}>
                      <Text fontSize="xs" mb={1}>Link Color</Text>
                      <Input
                        value={settings.linkColor}
                        onChange={(e) => handleSettingChange('linkColor', e.target.value)}
                        size="sm"
                        placeholder="#0066cc / inherit"
                      />
                    </Box>
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
