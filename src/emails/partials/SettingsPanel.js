import React, { useState, useEffect } from 'react';
import { Box, Text, Input, Select, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Divider, Button } from '@chakra-ui/react';

const SettingsPanel = ({ selectedTarget, onUpdateTarget }) => {
  const [settings, setSettings] = useState({
    // Padding and margin
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    
    // Text styles
    fontSize: 'md',
    fontWeight: 'normal',
    textAlign: 'left',
    textColor: '#000000',
    
    // Background
    backgroundColor: '#ffffff',
    backgroundImage: '',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    
    // Dimensions
    width: '100%',
    height: 'auto',
    
    // Border
    border: 'none',
    borderColor: '#000000',
    borderWidth: 0,
    borderRadius: 0,

    // Typography
    letterSpacing: 'normal',
    lineHeight: 'normal',

    // Layout
    boxSizing: 'border-box',
    
    // Link specific
    linkColor: '#0066cc',
    
    // Button specific
    buttonColor: '#0066cc',
    buttonTextColor: '#ffffff',
  });

  // Update settings when selected component changes
  useEffect(() => {
    if (selectedTarget?.data?.settings) {
      setSettings({
        // Start with default settings
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        fontSize: 'md',
        fontWeight: 'normal',
        textAlign: 'left',
        textColor: '#000000',
        backgroundColor: '#ffffff',
        backgroundImage: '',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        width: '100%',
        height: 'auto',
        border: 'none',
        borderColor: '#000000',
        borderWidth: 0,
        borderRadius: 0,
        letterSpacing: 'normal',
        lineHeight: 'normal',
        boxSizing: 'border-box',
        linkColor: '#0066cc',
        buttonColor: '#0066cc',
        buttonTextColor: '#ffffff',
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

  if (!selectedTarget) {
    return (
      <Box w="100%" h="100%" p={4} display="flex" alignItems="center" justifyContent="center">
        <Text textAlign="center" color="gray.500">
          Select a row, column, or component to edit its settings
        </Text>
      </Box>
    );
  }

  const targetLabel = selectedTarget.kind === 'component'
    ? selectedTarget.data?.type
    : selectedTarget.kind;

  return (
    <Box w="100%" h="100%" p={4} overflowY="auto">
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        {targetLabel} Settings
      </Text>
      
      <Divider mb={4} />
      
      {/* Padding Settings */}
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
      
      {/* Margin Settings */}
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
      
      {/* Text Settings */}
      <Text fontSize="md" fontWeight="semibold" mb={2}>Text</Text>
      <Box mb={3}>
        <Text fontSize="xs" mb={1}>Font Size</Text>
        <Select 
          value={settings.fontSize} 
          onChange={(e) => handleSettingChange('fontSize', e.target.value)}
          size="sm"
        >
          <option value="xs">Extra Small</option>
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
          <option value="xl">Extra Large</option>
          <option value="2xl">2X Large</option>
          <option value="3xl">3X Large</option>
        </Select>
      </Box>
      
      <Box mb={3}>
        <Text fontSize="xs" mb={1}>Font Weight</Text>
        <Select 
          value={settings.fontWeight} 
          onChange={(e) => handleSettingChange('fontWeight', e.target.value)}
          size="sm"
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
          <option value="lighter">Lighter</option>
          <option value="bolder">Bolder</option>
        </Select>
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
          type="color" 
          value={settings.textColor} 
          onChange={(e) => handleSettingChange('textColor', e.target.value)}
          size="sm" 
        />
      </Box>
      
      <Divider my={4} />
      
      {/* Background Settings */}
      <Text fontSize="md" fontWeight="semibold" mb={2}>Background</Text>
      <Box mb={3}>
        <Text fontSize="xs" mb={1}>Background Color</Text>
        <Input 
          type="color" 
          value={settings.backgroundColor} 
          onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
          size="sm" 
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
        <Select
          value={settings.backgroundSize}
          onChange={(e) => handleSettingChange('backgroundSize', e.target.value)}
          size="sm"
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="auto">Auto</option>
        </Select>
      </Box>

      <Box mb={3}>
        <Text fontSize="xs" mb={1}>Background Position</Text>
        <Select
          value={settings.backgroundPosition}
          onChange={(e) => handleSettingChange('backgroundPosition', e.target.value)}
          size="sm"
        >
          <option value="center">Center</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </Select>
      </Box>

      <Box mb={3}>
        <Text fontSize="xs" mb={1}>Background Repeat</Text>
        <Select
          value={settings.backgroundRepeat}
          onChange={(e) => handleSettingChange('backgroundRepeat', e.target.value)}
          size="sm"
        >
          <option value="no-repeat">No Repeat</option>
          <option value="repeat">Repeat</option>
          <option value="repeat-x">Repeat X</option>
          <option value="repeat-y">Repeat Y</option>
        </Select>
      </Box>
      
      <Divider my={4} />
      
      {/* Dimensions */}
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
      
      {/* Border Settings */}
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
          type="color" 
          value={settings.borderColor} 
          onChange={(e) => handleSettingChange('borderColor', e.target.value)}
          size="sm" 
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
      
      {/* Typography */}
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

      {/* Layout */}
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

      {/* Component Specific Settings */}
      {selectedTarget.kind === 'component' && selectedTarget.data?.type === 'Button' && (
        <>
          <Text fontSize="md" fontWeight="semibold" mb={2}>Button Settings</Text>
          <Box mb={3}>
            <Text fontSize="xs" mb={1}>Button Color</Text>
            <Input 
              type="color" 
              value={settings.buttonColor} 
              onChange={(e) => handleSettingChange('buttonColor', e.target.value)}
              size="sm" 
            />
          </Box>
          <Box mb={3}>
            <Text fontSize="xs" mb={1}>Button Text Color</Text>
            <Input 
              type="color" 
              value={settings.buttonTextColor} 
              onChange={(e) => handleSettingChange('buttonTextColor', e.target.value)}
              size="sm" 
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
              type="color" 
              value={settings.linkColor} 
              onChange={(e) => handleSettingChange('linkColor', e.target.value)}
              size="sm" 
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
            fontSize: 'md',
            fontWeight: 'normal',
            textAlign: 'left',
            textColor: '#000000',
            backgroundColor: '#ffffff',
            backgroundImage: '',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            width: '100%',
            height: 'auto',
            border: 'none',
            borderColor: '#000000',
            borderWidth: 0,
            borderRadius: 0,
            letterSpacing: 'normal',
            lineHeight: 'normal',
            boxSizing: 'border-box',
            linkColor: '#0066cc',
            buttonColor: '#0066cc',
            buttonTextColor: '#ffffff',
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
    </Box>
  );
};

export default SettingsPanel;
