import React from 'react';
import { Box } from '@chakra-ui/react';
import { useDrop } from 'react-dnd';
import { COMPONENT_TYPES } from './componentTypes';
import { columnParentStyle } from './componentStyles';
import DraggableComponentInColumn from './DraggableComponentInColumn';

const DroppableColumn = ({ column, colSpan, parentId, rowId, updateSections, syncEditorToHtml, onSelect, selectedTarget }) => {
  console.log('DroppableColumn received syncEditorToHtml:', typeof syncEditorToHtml);

  const [, drop] = useDrop({
    accept: Object.values(COMPONENT_TYPES),
    drop: (item) => {
      const newComponent = {
        id: Date.now(),
        type: item.type,
        content: (() => {
          switch (item.type) {
            case COMPONENT_TYPES.TEXT:
              return 'Default Text';
            case COMPONENT_TYPES.HEADING:
              return 'Default Heading';
            case COMPONENT_TYPES.PARAGRAPH:
              return 'Default Paragraph';
            case COMPONENT_TYPES.HEADER_1:
              return 'Header 1';
            case COMPONENT_TYPES.HEADER_2:
              return 'Header 2';
            case COMPONENT_TYPES.HEADER_3:
              return 'Header 3';
            case COMPONENT_TYPES.ORDERED_LIST:
              return '1. Item 1\n2. Item 2';
            case COMPONENT_TYPES.UNORDERED_LIST:
              return '- Item 1\n- Item 2';
            case COMPONENT_TYPES.BUTTON:
              return 'Click Me';
            case COMPONENT_TYPES.LINK:
              return 'Default Link';
            case COMPONENT_TYPES.IMAGE:
              return 'Default Image';
            case COMPONENT_TYPES.SOCIAL_LINK:
              return 'Facebook';
            case COMPONENT_TYPES.SOCIAL_ICONS:
              return '';
            case COMPONENT_TYPES.HR:
              return '';
            case COMPONENT_TYPES.VIDEO:
              return 'Default Video';
            case COMPONENT_TYPES.TABLE:
              return 'Header 1,Header 2,Header 3\nRow 1 Col 1,Row 1 Col 2,Row 1 Col 3\nRow 2 Col 1,Row 2 Col 2,Row 2 Col 3';
            case COMPONENT_TYPES.SPACE:
              return '';
            case COMPONENT_TYPES.ICON:
              return 'star';
            case COMPONENT_TYPES.HTML:
              return '<div>Custom HTML content</div>';
            case COMPONENT_TYPES.MENU:
              return 'Home\nAbout\nServices\nContact';
            default:
              return '';
          }
        })(),
        imageUrl: item.type === COMPONENT_TYPES.IMAGE ? 'https://dummyimage.com/100x50/cccccc/000000.png' : '',
        linkUrl: [COMPONENT_TYPES.LINK, COMPONENT_TYPES.BUTTON, COMPONENT_TYPES.SOCIAL_LINK].includes(item.type) ? 'https://example.com' : '',
        socialUrls: item.type === COMPONENT_TYPES.SOCIAL_ICONS ? 'https://facebook.com\nhttps://twitter.com\nhttps://instagram.com' : '',
        font: { size: 'md', weight: 'normal', family: 'Arial' },
        videoUrl: item.type === COMPONENT_TYPES.VIDEO ? 'https://example.com/video.mp4' : '',
        tableData: item.type === COMPONENT_TYPES.TABLE ? 'Header 1,Header 2,Header 3\nRow 1 Col 1,Row 1 Col 2,Row 1 Col 3\nRow 2 Col 1,Row 2 Col 2,Row 2 Col 3' : '',
        height: item.type === COMPONENT_TYPES.SPACE ? 20 : 0,
        iconName: item.type === COMPONENT_TYPES.ICON ? 'star' : '',
        htmlContent: item.type === COMPONENT_TYPES.HTML ? '<div>Custom HTML content</div>' : '',
        menuItems: item.type === COMPONENT_TYPES.MENU ? 'Home\nAbout\nServices\nContact' : '',
        // Add default styling properties
        settings: {
          padding: { top: 10, right: 10, bottom: 10, left: 10 },
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
          boxSizing: 'border-box',
          letterSpacing: 'normal',
          lineHeight: 'normal',
        }
      };
      updateSections((prevSections) => {
        const updated = [...prevSections];
        const sectionIndex = updated.findIndex((s) => s.id === parentId);
        const rowIndex = updated[sectionIndex].rows.findIndex((r) => r.id === rowId);
        const columnIndex = updated[sectionIndex].rows[rowIndex].columns.findIndex((c) => c.id === column.id);

        if (!updated[sectionIndex].rows[rowIndex].columns[columnIndex].components) {
          updated[sectionIndex].rows[rowIndex].columns[columnIndex].components = [];
        }

        updated[sectionIndex].rows[rowIndex].columns[columnIndex].components.push(newComponent);
        return updated;
      });

      // Ensure HTML is synchronized after the drop event
      if (typeof syncEditorToHtml === 'function') {
        syncEditorToHtml();
      } else {
        console.error('syncEditorToHtml is not a function');
      }

      return { droppedInColumn: true };
    },
  });

  // Check if this column is selected (when no component is selected but column itself might be)
  // For now, we'll just focus on component selection visualization
  const isSelected = selectedTarget?.kind === 'column' && selectedTarget?.id === column.id;

  const handleSelectColumn = (e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect({
        kind: 'column',
        id: column.id,
        data: column,
      });
    }
  };
  
  // Merge column.settings into editor display
  const colSettingsStyle = (() => {
    const s = column?.settings || {};
    const out = {};
    // Always apply background color
    if (s.backgroundColor && s.backgroundColor !== 'transparent') {
      out.backgroundColor = s.backgroundColor;
    }
    if (s.backgroundImage) {
      out.backgroundImage = `url('${s.backgroundImage}')`;
      out.backgroundSize = s.backgroundSize || 'cover';
      out.backgroundPosition = s.backgroundPosition || 'center';
      out.backgroundRepeat = s.backgroundRepeat || 'no-repeat';
    }
    if (s.padding && typeof s.padding === 'object') {
      const { top = 0, right = 0, bottom = 0, left = 0 } = s.padding;
      if (top || right || bottom || left) {
        out.padding = `${top}px ${right}px ${bottom}px ${left}px`;
      }
    }
    if (s.borderRadius) {
      out.borderRadius = `${s.borderRadius}px`;
    }
    if (s.textAlign) {
      out.textAlign = s.textAlign;
    }
    return out;
  })();

  return (
    <Box
      ref={drop}
      onClick={handleSelectColumn}
      style={{
        ...columnParentStyle(colSpan),
        ...colSettingsStyle,
        border: isSelected ? '2px solid #3182ce' : columnParentStyle(colSpan).border,
        borderRadius: '6px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
      }}
    >
      <Box fontSize="xs" color="gray.500" mb={1}>{column.label}</Box>
      {column.components &&
        column.components.map((comp, compIndex) => (
          <DraggableComponentInColumn
            key={comp.id}
            component={comp}
            index={compIndex}
            columnId={column.id}
            parentId={parentId}
            rowId={rowId}
            updateSections={updateSections}
            onSelect={onSelect}
            selectedTarget={selectedTarget}
          />
        ))}
    </Box>
  );
};

export default DroppableColumn;
