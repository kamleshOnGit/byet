import React from 'react';
import { Box, Text, Button, IconButton } from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { useDrop } from 'react-dnd';
import { COMPONENT_TYPES } from './componentTypes';
import { createComponentInstance, DUMMY_IMAGE_URL, DUMMY_LINK_URL } from './componentRegistry';
import { useEditorStore } from '../editorStore';

const TableCellDropZone = ({ tableId, tableRowId, cell, parentId, rowId, columnId, onSelect, selectedTarget, cellStyle }) => {
  const addComponentToTableCell = useEditorStore((state) => state.addComponentToTableCell);
  const updateSections = useEditorStore((state) => state.updateSections);
  const cellSettings = cell?.settings || {};

  const [{ isOver }, drop] = useDrop(() => ({
    accept: Object.values(COMPONENT_TYPES),
    drop: (item, monitor) => {
      if (monitor.didDrop()) {
        return undefined;
      }
      const newComponent = createComponentInstance(item.type);
      addComponentToTableCell(tableId, tableRowId, cell.id, newComponent);
      return { droppedInTableCell: true };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [addComponentToTableCell, tableId, tableRowId, cell.id]);

  return (
    <Box
      ref={drop}
      style={{
        ...cellStyle,
        outline: isOver ? '2px dashed #805ad5' : '1px dashed rgba(128,90,213,0.25)',
        minHeight: '48px',
        verticalAlign: 'top',
        backgroundColor: cellSettings.backgroundColor && cellSettings.backgroundColor !== 'transparent' ? cellSettings.backgroundColor : undefined,
        textAlign: cellSettings.textAlign || undefined,
        color: cellSettings.textColor || undefined,
        fontSize: cellSettings.fontSize || undefined,
        fontWeight: cellSettings.fontWeight || undefined,
        fontFamily: cellSettings.fontFamily || undefined,
        lineHeight: cellSettings.lineHeight || undefined,
      }}
    >
      {(cell.components || []).map((nestedComponent) => (
        <EmailComponent
          key={nestedComponent.id}
          component={nestedComponent}
          setSections={updateSections}
          parentId={parentId}
          rowId={rowId}
          columnId={columnId}
          onSelect={onSelect}
          selectedTarget={selectedTarget}
        />
      ))}
      {(!cell.components || cell.components.length === 0) && (
        <Text fontSize="xs" color="gray.400">Drop component here</Text>
      )}
    </Box>
  );
};

const EmailComponent = ({ component, setSections, parentId, rowId, columnId, onSelect, selectedTarget }) => {
  const { type, content } = component;
  const addTableRow = useEditorStore((state) => state.addTableRow);
  const addTableCell = useEditorStore((state) => state.addTableCell);
  const removeTableRow = useEditorStore((state) => state.removeTableRow);
  const removeTableCell = useEditorStore((state) => state.removeTableCell);
  const removeComponent = useEditorStore((state) => state.removeComponent);
  const updateComponentData = useEditorStore((state) => state.updateComponentData);

  const handleChange = (nextValue) => {
    const updatedComponent = (nextValue && typeof nextValue === 'object' && nextValue.target)
      ? { ...component, content: nextValue.target.value || '' }
      : (nextValue && typeof nextValue === 'object' ? nextValue : { ...component, content: nextValue || '' });
    updateComponentData(component.id, updatedComponent);
  };

  const handleSelect = (e) => {
    if (e?.stopPropagation) {
      e.stopPropagation();
    }
    if (e?.preventDefault) {
      e.preventDefault();
    }
    if (onSelect) {
      onSelect({
        kind: 'component',
        id: component.id,
        data: component,
      });
    }
  };

  const isSelected = selectedTarget?.kind === 'component' && selectedTarget?.id === component.id;
  const importedTableWrapperStyle = component.importedDomTree && type === COMPONENT_TYPES.TABLE
    ? {
        width: component.settings?.width || undefined,
        maxWidth: component.settings?.maxWidth || undefined,
        display: component.settings?.display || (component.settings?.float ? 'block' : undefined),
        float: component.settings?.float || undefined,
        marginLeft: component.settings?.marginLeft || undefined,
        marginRight: component.settings?.marginRight || undefined,
      }
    : {};

  const handleRemove = (e) => {
    if (e?.stopPropagation) {
      e.stopPropagation();
    }
    if (e?.preventDefault) {
      e.preventDefault();
    }
    removeComponent(component.id);
  };

  // Apply styles from component settings
  const applyComponentStyles = () => {
    const s = component?.settings || {};
    const styles = {};

    // Background - always apply
    if (s.backgroundColor && s.backgroundColor !== 'transparent') {
      styles.backgroundColor = s.backgroundColor;
    }
    if (s.backgroundImage) {
      styles.backgroundImage = `url('${s.backgroundImage}')`;
      styles.backgroundSize = s.backgroundSize || 'cover';
      styles.backgroundPosition = s.backgroundPosition || 'center';
      styles.backgroundRepeat = s.backgroundRepeat || 'no-repeat';
    }

    // Padding
    if (s.padding && typeof s.padding === 'object') {
      const { top = 0, right = 0, bottom = 0, left = 0 } = s.padding;
      if (top || right || bottom || left) {
        styles.padding = `${top}px ${right}px ${bottom}px ${left}px`;
      }
    }

    // Margin
    if (s.margin && typeof s.margin === 'object') {
      const { top = 0, right = 0, bottom = 0, left = 0 } = s.margin;
      if (top || right || bottom || left) {
        styles.margin = `${top}px ${right}px ${bottom}px ${left}px`;
      }
    }

    // Border
    if (s.border && s.border !== 'none' && s.borderWidth) {
      styles.border = `${s.borderWidth}px ${s.border} ${s.borderColor || '#000'}`;
    }
    if (s.borderRadius || s.borderRadius === 0) {
      styles.borderRadius = `${s.borderRadius}px`;
    }
    if (s.textAlign) {
      styles.textAlign = s.textAlign;
    }
    if (s.textColor) {
      styles.color = s.textColor;
    }
    if (s.fontFamily) {
      styles.fontFamily = s.fontFamily;
    }
    if (s.fontSize) {
      styles.fontSize = s.fontSize;
    }
    if (s.fontWeight) {
      styles.fontWeight = s.fontWeight;
    }
    if (s.fontStyle) {
      styles.fontStyle = s.fontStyle;
    }
    if (s.textDecoration) {
      styles.textDecoration = s.textDecoration;
    }
    if (s.textTransform) {
      styles.textTransform = s.textTransform;
    }
    if (s.lineHeight) {
      styles.lineHeight = s.lineHeight;
    }
    if (s.letterSpacing) {
      styles.letterSpacing = s.letterSpacing;
    }
    if (s.whiteSpace) {
      styles.whiteSpace = s.whiteSpace;
    }
    if (s.wordBreak) {
      styles.wordBreak = s.wordBreak;
    }
    if (s.width) {
      styles.width = s.width;
    }
    if (s.height) {
      styles.height = s.height;
    }
    if (s.minWidth) {
      styles.minWidth = s.minWidth;
    }
    if (s.maxWidth) {
      styles.maxWidth = s.maxWidth;
    }
    if (s.minHeight) {
      styles.minHeight = s.minHeight;
    }
    if (s.maxHeight) {
      styles.maxHeight = s.maxHeight;
    }
    if (s.boxSizing) {
      styles.boxSizing = s.boxSizing;
    }
    if (s.display) {
      styles.display = s.display;
    }
    if (s.float) {
      styles.float = s.float;
    }
    if (s.alignSelf) {
      styles.alignSelf = s.alignSelf;
    }
    if (s.justifyContent) {
      styles.justifyContent = s.justifyContent;
    }
    if (s.alignItems) {
      styles.alignItems = s.alignItems;
    }
    if (s.flexDirection) {
      styles.flexDirection = s.flexDirection;
    }
    if (s.flexWrap) {
      styles.flexWrap = s.flexWrap;
    }
    if (s.overflow) {
      styles.overflow = s.overflow;
    }
    if (s.opacity) {
      styles.opacity = s.opacity;
    }
    if (s.listStyleType) {
      styles.listStyleType = s.listStyleType;
    }
    if (s.listStylePosition) {
      styles.listStylePosition = s.listStylePosition;
    }

    return styles;
  };

  const renderContent = () => {
    // Apply styles
    const componentStyles = applyComponentStyles();
    const textEditorStyle = {
      width: '100%',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      padding: 0,
      margin: 0,
      resize: 'none',
      fontFamily: component.settings?.fontFamily || 'inherit',
      fontSize: component.settings?.fontSize || 'inherit',
      fontWeight: component.settings?.fontWeight || 'inherit',
      fontStyle: component.settings?.fontStyle || 'inherit',
      textAlign: component.settings?.textAlign || 'inherit',
      color: component.settings?.textColor || 'inherit',
      textDecoration: component.settings?.textDecoration || 'inherit',
      textTransform: component.settings?.textTransform || 'inherit',
      lineHeight: component.settings?.lineHeight || 'inherit',
      letterSpacing: component.settings?.letterSpacing || 'inherit',
      whiteSpace: component.settings?.whiteSpace || 'inherit',
      wordBreak: component.settings?.wordBreak || 'inherit',
      opacity: component.settings?.opacity || undefined,
      height: component.settings?.height || undefined,
      minHeight: component.settings?.minHeight || undefined,
      maxHeight: component.settings?.maxHeight || undefined,
      boxSizing: component.settings?.boxSizing || 'border-box',
    };

    const blockFillStyle = {
      width: component.settings?.width || componentStyles.width || '100%',
      minWidth: component.settings?.minWidth || componentStyles.minWidth || undefined,
      maxWidth: component.settings?.maxWidth || componentStyles.maxWidth || undefined,
      height: component.settings?.height || '100%',
      minHeight: component.settings?.minHeight || undefined,
      maxHeight: component.settings?.maxHeight || undefined,
      boxSizing: component.settings?.boxSizing || 'border-box',
    };

    switch (type) {
      case COMPONENT_TYPES.BUTTON:
        return (
          <Box
            as="a"
            onClick={handleSelect}
            style={{
              ...componentStyles,
              display: component.settings?.display || componentStyles.display || 'inline-block',
              cursor: 'pointer',
              backgroundColor: component.settings?.buttonColor || '#0066cc',
              color: component.settings?.buttonTextColor || '#ffffff',
              border: 'none',
              padding: componentStyles.padding || '10px 20px',
              borderRadius: componentStyles.borderRadius || '4px',
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            {isSelected ? (
              <input
                type="text"
                value={content || 'Click Me'}
                onChange={handleChange}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  ...textEditorStyle,
                  width: 'auto',
                  color: component.settings?.buttonTextColor || '#ffffff',
                }}
              />
            ) : (content || 'Click Me')}
          </Box>
        );
      case COMPONENT_TYPES.TEXT:
        return (
          <Box as="div" onClick={handleSelect} style={componentStyles}>
            {isSelected ? (
              <input
                type="text"
                value={content || 'This is a text block'}
                onChange={handleChange}
                style={textEditorStyle}
              />
            ) : (
              <Box
                as="span"
                whiteSpace="pre-wrap"
                onClick={handleSelect}
              >
                {content || 'This is a text block'}
              </Box>
            )}
          </Box>
        );
      case COMPONENT_TYPES.PARAGRAPH:
        return (
          <Box as="p" onClick={handleSelect} style={{ margin: 0, ...componentStyles }}>
            {isSelected ? (
              <textarea
                value={content || 'This is a paragraph'}
                onChange={handleChange}
                style={textEditorStyle}
              />
            ) : (
              <Box as="span" whiteSpace="pre-wrap">{content || 'This is a paragraph'}</Box>
            )}
          </Box>
        );
      case COMPONENT_TYPES.ORDERED_LIST:
        return (
          <ol onClick={handleSelect} style={{ paddingLeft: componentStyles.paddingLeft ? componentStyles.paddingLeft : undefined, ...componentStyles }}>
            {isSelected ? (
              <textarea
                value={content || '1. Item 1\n2. Item 2'}
                onChange={handleChange}
                style={textEditorStyle}
              />
            ) : (
              (content || '1. Item 1\n2. Item 2').split('\n').filter(Boolean).map((item, index) => (
                <li key={`${component.id}-ol-${index}`}>{item}</li>
              ))
            )}
          </ol>
        );
      case COMPONENT_TYPES.UNORDERED_LIST:
        return (
          <ul onClick={handleSelect} style={{ paddingLeft: componentStyles.paddingLeft ? componentStyles.paddingLeft : undefined, ...componentStyles }}>
            {isSelected ? (
              <textarea
                value={content || '- Item 1\n- Item 2'}
                onChange={handleChange}
                style={textEditorStyle}
              />
            ) : (
              (content || '- Item 1\n- Item 2').split('\n').filter(Boolean).map((item, index) => (
                <li key={`${component.id}-ul-${index}`}>{item}</li>
              ))
            )}
          </ul>
        );
      case COMPONENT_TYPES.HEADER_1:
        return (
          <Box as="h1" onClick={handleSelect} style={{ margin: 0, fontWeight: 'bold', ...componentStyles }}>
            {isSelected ? (
              <input
                type="text"
                value={content || 'Header 1'}
                onChange={handleChange}
                style={{
                  ...textEditorStyle,
                  fontWeight: component.settings?.fontWeight || 'bold',
                }}
              />
            ) : (content || 'Header 1')}
          </Box>
        );
      case COMPONENT_TYPES.HEADER_2:
        return (
          <Box as="h2" onClick={handleSelect} style={{ margin: 0, fontWeight: 'bold', ...componentStyles }}>
            {isSelected ? (
              <input
                type="text"
                value={content || 'Header 2'}
                onChange={handleChange}
                style={{
                  ...textEditorStyle,
                  fontWeight: component.settings?.fontWeight || 'bold',
                }}
              />
            ) : (content || 'Header 2')}
          </Box>
        );
      case COMPONENT_TYPES.HEADER_3:
        return (
          <Box as="h3" onClick={handleSelect} style={{ margin: 0, fontWeight: 'bold', ...componentStyles }}>
            {isSelected ? (
              <input
                type="text"
                value={content || 'Header 3'}
                onChange={handleChange}
                style={{
                  ...textEditorStyle,
                  fontWeight: component.settings?.fontWeight || 'bold',
                }}
              />
            ) : (content || 'Header 3')}
          </Box>
        );
      case COMPONENT_TYPES.IMAGE:
        // For images, don't apply padding that would reduce the image size
        const imageStyles = {
          textAlign: component.settings?.textAlign || componentStyles.textAlign || 'center',
          backgroundColor: componentStyles.backgroundColor,
          backgroundImage: componentStyles.backgroundImage,
          backgroundSize: componentStyles.backgroundSize,
          backgroundPosition: componentStyles.backgroundPosition,
          backgroundRepeat: componentStyles.backgroundRepeat,
          border: componentStyles.border,
          borderRadius: componentStyles.borderRadius,
          boxSizing: componentStyles.boxSizing,
          width: componentStyles.width || '100%',
          minWidth: componentStyles.minWidth,
          maxWidth: componentStyles.maxWidth,
          minHeight: componentStyles.minHeight,
          maxHeight: componentStyles.maxHeight,
          height: componentStyles.height,
          margin: componentStyles.margin || 0,
          padding: 0,
          display: component.settings?.display || componentStyles.display,
          float: component.settings?.float || componentStyles.float,
          alignSelf: component.settings?.alignSelf || componentStyles.alignSelf,
          overflow: componentStyles.overflow,
        };
        return (
          <Box onClick={handleSelect} style={imageStyles}>
            <img
              src={component.imageUrl || DUMMY_IMAGE_URL}
              alt={component.content || ''}
              style={{
                width: component.settings?.width || componentStyles.width || 'auto',
                height: component.settings?.height || componentStyles.height || 'auto',
                maxWidth: component.settings?.maxWidth || '100%',
                minWidth: component.settings?.minWidth || undefined,
                minHeight: component.settings?.minHeight || undefined,
                maxHeight: component.settings?.maxHeight || undefined,
                display: component.settings?.display || 'inline-block',
                border: componentStyles.border || 'none',
                borderRadius: componentStyles.borderRadius || undefined,
                backgroundColor: componentStyles.backgroundColor || undefined,
                margin: 0,
                padding: 0,
                boxSizing: 'border-box',
                objectFit: component.settings?.height || component.settings?.minHeight || component.settings?.maxHeight ? 'cover' : undefined,
              }}
            />
            {isSelected && (
              <input
                type="text"
                placeholder="Image URL"
                value={component.imageUrl || ''}
                onChange={(e) => handleChange({ ...component, imageUrl: e.target.value })}
                style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
              />
            )}
          </Box>
        );
      case COMPONENT_TYPES.LINK:
        return (
          <Box
            as="a"
            href={component.linkUrl || DUMMY_LINK_URL}
            onClick={handleSelect}
            style={{
              ...componentStyles,
              color: component.settings?.linkColor || component.settings?.textColor || '#0066cc',
              textDecoration: component.settings?.textDecoration || componentStyles.textDecoration || 'underline',
              cursor: 'pointer'
            }}
          >
            {isSelected ? (
              <input
                type="text"
                value={content || 'Visit our placeholder'}
                onChange={handleChange}
                style={{
                  ...textEditorStyle,
                  color: component.settings?.linkColor || '#0066cc',
                }}
              />
            ) : (content || 'Visit our placeholder')}
          </Box>
        );
      case COMPONENT_TYPES.HEADING:
        return (
          <Box as="h2" onClick={handleSelect} style={{ margin: 0, fontWeight: 'bold', ...componentStyles }}>
            {isSelected ? (
              <input
                type="text"
                value={content || 'This is a heading'}
                onChange={handleChange}
                style={{
                  ...textEditorStyle,
                  fontWeight: component.settings?.fontWeight || 'bold',
                }}
              />
            ) : (content || 'This is a heading')}
          </Box>
        );
      case COMPONENT_TYPES.HR:
        return <Box as="hr" onClick={handleSelect} style={{ border: 'none', borderTop: `${component.settings?.borderWidth || 1}px ${component.settings?.border || 'solid'} ${component.settings?.borderColor || '#cccccc'}`, margin: 0, ...componentStyles }} />;
      case COMPONENT_TYPES.VIDEO:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="red.300" borderRadius="md" style={componentStyles}>
            <Box as="span" style={{ color: '#E53E3E', fontWeight: 'bold' }}>▶ Video Placeholder</Box>
            {isSelected && (
              <input
                type="text"
                placeholder="Video URL"
                value={component.videoUrl || ''}
                onChange={(e) => handleChange({ ...component, videoUrl: e.target.value })}
                style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
              />
            )}
          </Box>
        );
      case COMPONENT_TYPES.TABLE:
        return (
          <Box
            onClick={handleSelect}
            p={component.importedDomTree ? 0 : 4}
            border={component.importedDomTree ? 'none' : '1px dashed'}
            borderColor={component.importedDomTree ? undefined : 'purple.300'}
            borderRadius={component.importedDomTree ? 0 : 'md'}
            style={componentStyles}
          >
            {!component.importedDomTree && (
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box as="span" style={{ color: '#805AD5', fontWeight: 'bold' }}>▦ Table</Box>
              {isSelected && (
                <IconButton aria-label="Add table row" size="xs" colorScheme="purple" icon={<AddIcon />} onClick={(e) => { e.stopPropagation(); addTableRow(component.id); }} />
              )}
            </Box>
            )}
            <Box
              as="table"
              width={component.settings?.width || '100%'}
              borderCollapse={component.settings?.borderCollapse || 'collapse'}
              style={{
                backgroundColor: component.settings?.backgroundColor && component.settings.backgroundColor !== 'transparent' ? component.settings.backgroundColor : undefined,
                backgroundImage: component.settings?.backgroundImage ? `url('${component.settings.backgroundImage}')` : undefined,
                backgroundSize: component.settings?.backgroundSize || undefined,
                backgroundPosition: component.settings?.backgroundPosition || undefined,
                backgroundRepeat: component.settings?.backgroundRepeat || undefined,
                maxWidth: component.settings?.maxWidth || undefined,
                display: component.settings?.display || undefined,
                float: component.settings?.float || undefined,
                marginLeft: component.settings?.marginLeft || undefined,
                marginRight: component.settings?.marginRight || undefined,
              }}
            >
              <Box as="tbody">
                {(component.tableRows || []).map((tableRow) => (
                  <Box
                    as="tr"
                    key={tableRow.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect?.({ kind: 'tableRow', id: tableRow.id, tableComponentId: component.id, data: tableRow });
                    }}
                    style={{
                      outline: selectedTarget?.kind === 'tableRow' && selectedTarget?.id === tableRow.id ? '2px solid #9f7aea' : 'none',
                      height: tableRow.settings?.height || undefined,
                      backgroundColor: tableRow.settings?.backgroundColor && tableRow.settings?.backgroundColor !== 'transparent' ? tableRow.settings.backgroundColor : undefined,
                      backgroundImage: tableRow.settings?.backgroundImage ? `url('${tableRow.settings.backgroundImage}')` : undefined,
                      backgroundSize: tableRow.settings?.backgroundSize || undefined,
                      backgroundPosition: tableRow.settings?.backgroundPosition || undefined,
                      backgroundRepeat: tableRow.settings?.backgroundRepeat || undefined,
                    }}
                  >
                    {(tableRow.cells || []).map((cell) => (
                      <Box
                        as="td"
                        key={cell.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect?.({ kind: 'tableCell', id: cell.id, tableComponentId: component.id, tableRowId: tableRow.id, data: cell });
                        }}
                        width={cell.settings?.width || cell.width || `${Math.floor(100 / ((tableRow.cells || []).length || 1))}%`}
                        p={component.importedDomTree ? 0 : 2}
                        border={component.importedDomTree ? 'none' : (cell.settings?.border && cell.settings?.border !== 'none' && cell.settings?.borderWidth ? `${cell.settings.borderWidth}px ${cell.settings.border} ${cell.settings.borderColor || '#000000'}` : '1px solid')}
                        borderColor={component.importedDomTree ? undefined : (cell.settings?.border && cell.settings?.border !== 'none' && cell.settings?.borderWidth ? undefined : 'purple.100')}
                        verticalAlign={cell.settings?.verticalAlign || 'top'}
                        colSpan={cell.colSpan || 1}
                        rowSpan={cell.rowSpan || 1}
                        outline={selectedTarget?.kind === 'tableCell' && selectedTarget?.id === cell.id ? '2px solid #805ad5' : undefined}
                        backgroundColor={cell.settings?.backgroundColor && cell.settings?.backgroundColor !== 'transparent' ? cell.settings.backgroundColor : undefined}
                        backgroundImage={cell.settings?.backgroundImage ? `url('${cell.settings.backgroundImage}')` : undefined}
                        backgroundSize={cell.settings?.backgroundSize || undefined}
                        backgroundPosition={cell.settings?.backgroundPosition || undefined}
                        backgroundRepeat={cell.settings?.backgroundRepeat || undefined}
                        textAlign={cell.settings?.textAlign || undefined}
                        color={cell.settings?.textColor || undefined}
                        fontSize={cell.settings?.fontSize || undefined}
                        fontWeight={cell.settings?.fontWeight || undefined}
                        fontFamily={cell.settings?.fontFamily || undefined}
                        height={cell.settings?.height || undefined}
                        minHeight={cell.settings?.minHeight || undefined}
                        padding={cell.settings?.padding ? `${cell.settings.padding.top || 0}px ${cell.settings.padding.right || 0}px ${cell.settings.padding.bottom || 0}px ${cell.settings.padding.left || 0}px` : undefined}
                      >
                        {selectedTarget?.kind === 'tableCell' && selectedTarget?.id === cell.id && (tableRow.cells || []).length > 1 && (
                          <IconButton
                            aria-label="Remove table cell"
                            size="xs"
                            colorScheme="red"
                            icon={<DeleteIcon />}
                            mb={2}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTableCell(component.id, tableRow.id, cell.id);
                            }}
                          />
                        )}
                        <TableCellDropZone
                          tableId={component.id}
                          tableRowId={tableRow.id}
                          cell={cell}
                          parentId={parentId}
                          rowId={rowId}
                          columnId={columnId}
                          onSelect={onSelect}
                          selectedTarget={selectedTarget}
                          cellStyle={{ width: '100%' }}
                        />
                      </Box>
                    ))}
                    {isSelected && (
                      <Box as="td" width="1%" p={2} verticalAlign="top">
                        <Box display="flex" flexDirection="column" gap={2}>
                          <IconButton aria-label="Add table cell" size="xs" variant="ghost" colorScheme="purple" icon={<AddIcon />} onClick={(e) => { e.stopPropagation(); addTableCell(component.id, tableRow.id); }} />
                          {(component.tableRows || []).length > 1 && (
                            <IconButton aria-label="Remove table row" size="xs" variant="ghost" colorScheme="red" icon={<DeleteIcon />} onClick={(e) => { e.stopPropagation(); removeTableRow(component.id, tableRow.id); }} />
                          )}
                        </Box>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        );
      case COMPONENT_TYPES.SPACE:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="gray.300" borderRadius="md" style={componentStyles}>
            {!isSelected && <Box h={`${component.height || 20}px`} />}
            {isSelected && (
              <input
                type="number"
                placeholder="Height (px)"
                value={component.height || 20}
                onChange={(e) => handleChange({ ...component, height: parseInt(e.target.value) || 0 })}
                style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
              />
            )}
          </Box>
        );
      case COMPONENT_TYPES.ICON:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="yellow.300" borderRadius="md" style={componentStyles}>
            <Box as="span" style={{ color: '#D69E2E', fontWeight: 'bold' }}>★ Icon Placeholder</Box>
            {isSelected && (
              <input
                type="text"
                placeholder="Icon class or name"
                value={component.iconName || 'star'}
                onChange={(e) => handleChange({ ...component, iconName: e.target.value })}
                style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
              />
            )}
          </Box>
        );
      case COMPONENT_TYPES.HTML:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="orange.300" borderRadius="md" style={componentStyles}>
            <Box dangerouslySetInnerHTML={{ __html: component.htmlContent || '<div>Custom HTML content</div>' }} />
            {isSelected && !component.readOnly && (
              <textarea
                placeholder="HTML content"
                value={component.htmlContent || '<div>Custom HTML content</div>'}
                onChange={(e) => handleChange({ ...component, htmlContent: e.target.value })}
                style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px', minHeight: '80px', fontFamily: 'monospace' }}
              />
            )}
          </Box>
        );
      case COMPONENT_TYPES.MENU:
        return (
          <Box onClick={handleSelect} p={4} border="1px dashed" borderColor="teal.300" borderRadius="md" style={componentStyles}>
            <Box
              mb={3}
              display="flex"
              flexWrap="wrap"
              justifyContent={component.settings?.textAlign || 'center'}
              gap="8px"
            >
              {(component.menuItems || component.content || 'Home\nAbout\nServices\nContact')
                .split('\n')
                .filter(Boolean)
                .map((item, index) => (
                  <Box
                    as="span"
                    key={`${component.id}-menu-${index}`}
                    style={{
                      color: component.settings?.textColor || '#333333',
                      fontSize: component.settings?.fontSize || '16px',
                      fontWeight: component.settings?.fontWeight || 'normal',
                    }}
                  >
                    {item}
                  </Box>
                ))}
            </Box>
            {isSelected && (
              <textarea
                placeholder="Menu items (one per line)"
                value={component.menuItems || 'Home\nAbout\nServices\nContact'}
                onChange={(e) => handleChange({ ...component, menuItems: e.target.value })}
                style={{ width: '100%', background: 'transparent', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px', minHeight: '80px', color: component.settings?.textColor || '#333333', textAlign: component.settings?.textAlign || 'center' }}
              />
            )}
          </Box>
        );
      case COMPONENT_TYPES.SOCIAL_LINK:
        return (
          <Box onClick={handleSelect} p={3} border="1px dashed" borderColor="blue.300" borderRadius="md" style={componentStyles}>
            <Box as="span" style={{ color: '#3182CE', fontWeight: 'bold', fontSize: '14px' }}>@ Social Link</Box>
            {isSelected && (
              <>
                <input
                  type="text"
                  placeholder="Social profile URL"
                  value={component.linkUrl || 'https://facebook.com'}
                  onChange={(e) => handleChange({ ...component, linkUrl: e.target.value })}
                  style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
                />
                <input
                  type="text"
                  placeholder="Label"
                  value={content || 'Facebook'}
                  onChange={handleChange}
                  style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
                />
              </>
            )}
          </Box>
        );
      case COMPONENT_TYPES.SOCIAL_ICONS:
        return (
          <Box onClick={handleSelect} p={3} border="1px dashed" borderColor="blue.200" borderRadius="md" style={componentStyles} display="flex" flexWrap="wrap" gap="8px" justifyContent="center">
            <Box as="span" style={{ width: '100%', color: '#3182CE', fontWeight: 'bold', fontSize: '14px', textAlign: 'center', display: 'block' }}>Social Icons</Box>
            {isSelected && (
              <textarea
                placeholder="Social URLs (one per line)"
                value={component.socialUrls || 'https://facebook.com\nhttps://twitter.com\nhttps://instagram.com'}
                onChange={(e) => handleChange({ ...component, socialUrls: e.target.value })}
                style={{ width: '100%', border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px', minHeight: '60px' }}
              />
            )}
          </Box>
        );
      case COMPONENT_TYPES.DIV:
        return (
          <Box
            as="div"
            onClick={handleSelect}
            style={{
              border: isSelected ? '1px dashed #3182ce' : '1px solid transparent',
              outline: 'none',
              transition: 'border 0.2s ease',
              ...componentStyles
            }}
            _hover={{ border: isSelected ? '1px dashed #3182ce' : '1px solid rgba(0,0,0,0.1)' }}
          >
            {isSelected ? (
              <textarea
                value={content || 'Empty Div Content'}
                onChange={handleChange}
                style={{ ...textEditorStyle, ...blockFillStyle }}
              />
            ) : (
              <Box as="div" whiteSpace="pre-wrap" style={blockFillStyle}>{content || 'Empty Div Content'}</Box>
            )}
          </Box>
        );
      case COMPONENT_TYPES.NAV:
      case COMPONENT_TYPES.HEADER:
      case COMPONENT_TYPES.FOOTER:
      case COMPONENT_TYPES.SIDEBAR:
      case COMPONENT_TYPES.BANNER:
        const label = type.toUpperCase();
        return (
          <Box
            as="div"
            onClick={handleSelect}
            style={{
              border: isSelected ? '1px dashed #3182ce' : '1px solid rgba(0,0,0,0.05)',
              position: 'relative',
              ...componentStyles
            }}
          >
            <Text
              position="absolute"
              top="-10px"
              left="10px"
              fontSize="10px"
              bg="white"
              px={1}
              color="gray.400"
              zIndex={1}
            >
              {label}
            </Text>
            {isSelected ? (
              <textarea
                value={content || `Empty ${label} Content`}
                onChange={handleChange}
                style={{ ...textEditorStyle, ...blockFillStyle }}
              />
            ) : (
              <Box as="div" p={2} whiteSpace="pre-wrap" style={blockFillStyle}>{content || `Empty ${label} Content`}</Box>
            )}
          </Box>
        );
      case COMPONENT_TYPES.SPAN:
        return (
          <Box
            as="span"
            onClick={handleSelect}
            style={{
              border: isSelected ? '1px dotted #3182ce' : '1px dotted transparent',
              display: 'inline-block',
              ...(component.settings?.display ? { display: component.settings.display } : {}),
              transition: 'border 0.2s ease',
              ...componentStyles
            }}
            _hover={{ border: isSelected ? '1px dotted #3182ce' : '1px dotted rgba(0,0,0,0.2)' }}
          >
            {isSelected ? (
              <input
                type="text"
                value={content || 'Span content'}
                onChange={handleChange}
                style={{ ...textEditorStyle, display: 'inline-block', width: 'auto' }}
              />
            ) : (content || 'Span content')}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box
      mb={0}
      borderRadius="md"
      position="relative"
      style={{
        ...importedTableWrapperStyle,
        outline: isSelected ? '2px solid #3182ce' : 'none',
      }}
    >
      {isSelected && (
        <IconButton
          aria-label="Remove component"
          size="xs"
          colorScheme="red"
          icon={<DeleteIcon />}
          position="absolute"
          top="4px"
          right="4px"
          zIndex={10}
          onClick={handleRemove}
        />
      )}
      {renderContent()}
    </Box>
  );
};

export default EmailComponent;
