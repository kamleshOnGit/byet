import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Text, Divider, Image, Link, Heading, IconButton, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { AddIcon, DeleteIcon, DragHandleIcon, EditIcon, ViewIcon } from '@chakra-ui/icons';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Component Types for Drag-and-Drop
const COMPONENT_TYPES = {
  BUTTON: 'Button',
  TEXT: 'Text',
  IMAGE: 'Img',
  LINK: 'Link',
  HEADING: 'Heading',
  HR: 'HR',
  ROW: 'Row', // Non-draggable
  COLUMN: 'Column', // Non-draggable
  SECTION: 'Section', // Non-draggable
  PARAGRAPH: 'Paragraph',
  ORDERED_LIST: 'OrderedList',
  UNORDERED_LIST: 'UnorderedList',
  HEADER_1: 'Header1',
  HEADER_2: 'Header2',
  HEADER_3: 'Header3',
};

// Updated default styling for sections, rows, and columns
const sectionStyle = {
  border: '2px dashed #ccc',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
  backgroundColor: '#f9f9f9',
  minHeight: '100px',
};

const rowStyle = {
  border: '1px solid #ddd',
  borderRadius: '4px',
  padding: '30px', // Added padding to create space for icons
  marginBottom: '8px',
  backgroundColor: '#ffffff',
  display: 'flex',
  flexWrap: 'nowrap', // Prevent wrapping
  justifyContent: 'space-around',
  alignItems: 'center',
  minHeight: '50px',
  position: 'relative',
  boxSizing: 'content-box',
};

const columnParentStyle = (colSpan) => ({
  flex: `0 0 ${(colSpan / 12) * 100}%`,
  maxWidth: `${(colSpan / 12) * 100}%`,
  position: 'relative',
  border: '1px dashed #aaa',
  margin: '4px',
  padding: '8px',
  minHeight: '50px',
  backgroundColor: '#fefefe',
  boxSizing: 'border-box',
  overflow: 'hidden',
});

// Draggable Component
const DraggableComponent = ({ type }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type,
    item: { type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const getIcon = () => {
    switch (type) {
      case COMPONENT_TYPES.BUTTON:
        return <AddIcon boxSize={6} color="teal.500" />; // Icon for Button
      case COMPONENT_TYPES.TEXT:
        return <Text fontSize="lg" fontWeight="bold" color="blue.500">T</Text>; // Icon for Text
      case COMPONENT_TYPES.IMAGE:
        return <Image src="https://dummyimage.com/40x40/cccccc/000000.png" alt="Image Icon" boxSize={8} />; // Icon for Image
      case COMPONENT_TYPES.LINK:
        return <Link fontSize="lg" color="purple.500">🔗</Link>; // Icon for Link
      case COMPONENT_TYPES.HEADING:
        return <Heading size="sm" color="orange.500">H</Heading>; // Icon for Heading
      case COMPONENT_TYPES.HR:
        return <Divider borderColor="gray.500" borderWidth={2} />; // Icon for Horizontal Rule
      case COMPONENT_TYPES.PARAGRAPH:
        return <Text fontSize="lg" fontWeight="bold" color="green.500">P</Text>; // Icon for Paragraph
      case COMPONENT_TYPES.ORDERED_LIST:
        return <Text fontSize="lg" fontWeight="bold" color="brown.500">1.</Text>; // Icon for Ordered List
      case COMPONENT_TYPES.UNORDERED_LIST:
        return <Text fontSize="lg" fontWeight="bold" color="gray.500">•</Text>; // Icon for Unordered List
      case COMPONENT_TYPES.HEADER_1:
        return <Heading size="lg" color="blue.500">H1</Heading>; // Icon for H1
      case COMPONENT_TYPES.HEADER_2:
        return <Heading size="md" color="green.500">H2</Heading>; // Icon for H2
      case COMPONENT_TYPES.HEADER_3:
        return <Heading size="sm" color="orange.500">H3</Heading>; // Icon for H3
      default:
        return null; // Remove unknown elements
    }
  };

  const getTitle = () => {
    switch (type) {
      case COMPONENT_TYPES.BUTTON:
        return "Button";
      case COMPONENT_TYPES.TEXT:
        return "Text Block";
      case COMPONENT_TYPES.IMAGE:
        return "Image";
      case COMPONENT_TYPES.LINK:
        return "Link";
      case COMPONENT_TYPES.HEADING:
        return "Heading";
      case COMPONENT_TYPES.HR:
        return "Horizontal Rule";
      case COMPONENT_TYPES.PARAGRAPH:
        return "Paragraph";
      case COMPONENT_TYPES.ORDERED_LIST:
        return "Ordered List";
      case COMPONENT_TYPES.UNORDERED_LIST:
        return "Unordered List";
      case COMPONENT_TYPES.HEADER_1:
        return "Header 1";
      case COMPONENT_TYPES.HEADER_2:
        return "Header 2";
      case COMPONENT_TYPES.HEADER_3:
        return "Header 3";
      default:
        return ""; // No title for unknown elements
    }
  };

  const icon = getIcon();
  if (!icon) return null; // Skip rendering unknown elements

  return (
    <Button
      ref={drag}
      p={4}
      mb={2}
      bg="white"
      rounded="md"
      boxShadow="md"
      cursor="pointer"
      opacity={isDragging ? 0.5 : 1}
      _hover={{ boxShadow: "lg" }}
      title={getTitle()} // Added title for hover text
      w="60px" // Set fixed width
      h="60px" // Set fixed height
      display="flex"
      justifyContent="center"
      alignItems="center"
    >
      {icon}
    </Button>
  );
};

const DroppableColumn = ({ column, colSpan, parentId, rowId, updateSections, syncEditorToHtml }) => {
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
            case COMPONENT_TYPES.ORDERED_LIST:
              return '1. Item 1\n2. Item 2';
            case COMPONENT_TYPES.UNORDERED_LIST:
              return '- Item 1\n- Item 2';
            case COMPONENT_TYPES.LINK:
              return 'Default Link';
            case COMPONENT_TYPES.IMAGE:
              return 'Default Image';
            default:
              return '';
          }
        })(),
        imageUrl: item.type === COMPONENT_TYPES.IMAGE ? 'https://dummyimage.com/100x50/cccccc/000000.png' : '',
        linkUrl: item.type === COMPONENT_TYPES.LINK ? 'https://example.com' : '',
        font: { size: 'md', weight: 'normal', family: 'Arial' },
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
    },
  });

  return (
    <Box
      ref={drop}
      style={{
        ...columnParentStyle(colSpan),
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
      }}
    >
      {column.label}
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
          />
        ))}
    </Box>
  );
};

const DraggableComponentInColumn = ({ component, index, columnId, parentId, rowId, updateSections }) => {
  const [, drag] = useDrag({
    type: 'COMPONENT',
    item: { index },
  });

  const [, drop] = useDrop({
    accept: 'COMPONENT',
    hover: (item) => {
      if (item.index !== index) {
        updateSections((prevSections) => {
          const updated = [...prevSections];
          const sectionIndex = updated.findIndex((s) => s.id === parentId);
          const rowIndex = updated[sectionIndex].rows.findIndex((r) => r.id === rowId);
          const columnIndex = updated[sectionIndex].rows[rowIndex].columns.findIndex((c) => c.id === columnId);

          const components = updated[sectionIndex].rows[rowIndex].columns[columnIndex].components;
          const [draggedComponent] = components.splice(item.index, 1);
          components.splice(index, 0, draggedComponent);

          return updated;
        });
        item.index = index;
      }
    },
  });

  return (
    <Box
      ref={(node) => drag(drop(node))}
      style={{
        border: '1px solid #ddd',
        margin: '4px 0',
        padding: '8px',
        backgroundColor: '#fff',
        cursor: 'grab',
      }}
    >
      <EmailComponent
        component={component}
        parentId={parentId}
        rowId={rowId}
        columnId={columnId}
        setSections={updateSections} // Pass updateSections instead of setSections
      />
    </Box>
  );
};

// Droppable Row Component
const DroppableRow = ({ row, setComponents, parentId, index, moveRow, updateSections, syncEditorToHtml }) => {
  console.log('DroppableRow received syncEditorToHtml:', typeof syncEditorToHtml);

  const [, drag] = useDrag({
    type: 'ROW',
    item: { index },
  });

  const [, drop] = useDrop({
    accept: 'ROW',
    hover: (item) => {
      if (item.index !== index) {
        moveRow(item.index, index, setComponents);
        item.index = index;
      }
    },
  });

  return (
    <Box
      ref={(node) => drag(drop(node))}
      style={{
        ...rowStyle,
      }}
    >
      <Box position="absolute" top="2px" left="2px">
        <DragHandleIcon cursor="grab" />
      </Box>
      {row.columns.map((col) => (
        <DroppableColumn
          key={col.id}
          column={col}
          setComponents={setComponents}
          colSpan={col.size}
          parentId={parentId}
          rowId={row.id}
          updateSections={updateSections}
          syncEditorToHtml={syncEditorToHtml} // Pass syncEditorToHtml explicitly
        />
      ))}
      <Box position="absolute" top="2px" right="2px">
        {row.columns.reduce((sum, col) => sum + col.size, 0) < 12 && (
          <Menu>
            <MenuButton as={IconButton} icon={<AddIcon />} size="xs" colorScheme="blue" />
            <MenuList>
              {[3, 4, 6].map((size) => (
                <MenuItem key={size} onClick={() => addColumn(size, row, setComponents, parentId)}>
                  col-{size}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        )}
        <IconButton
          onClick={() => removeRow(row, setComponents, parentId)}
          colorScheme="red"
          size="xs"
          icon={<DeleteIcon />}
          ml={2}
        />
      </Box>
    </Box>
  );
};

// Droppable Section Component
const DroppableSection = ({ section, setComponents, updateSections, syncEditorToHtml }) => {
  const addRow = () => {
    const newRow = {
      id: Date.now(),
      columns: [
        { id: Date.now() + 1, label: 'Column 1', size: 4, components: [] },
        { id: Date.now() + 2, label: 'Column 2', size: 4, components: [] },
      ],
    };
    updateSections((prevSections) => {
      const updated = [...prevSections];
      const sectionIndex = updated.findIndex((s) => s.id === section.id);
      updated[sectionIndex].rows.push(newRow);
      return updated;
    });
  };

  const removeSection = () => {
    setComponents((prevSections) => prevSections.filter((s) => s.id !== section.id));
  };

  return (
    <Box style={sectionStyle} position="relative">
      <Heading size="md" mb={4}>
        Section
      </Heading>
      {section.rows.map((row, index) => (
        <DroppableRow
          key={row.id}
          row={row}
          setComponents={setComponents}
          parentId={section.id}
          index={index}
          moveRow={moveRow}
          updateSections={updateSections}
          syncEditorToHtml={syncEditorToHtml} // Pass syncEditorToHtml explicitly
        />
      ))}
      <Box position="absolute" top="4px" right="4px">
        <IconButton
          onClick={addRow}
          colorScheme="yellow"
          size="xs" // Made icon smaller
          icon={<AddIcon />}
          mr={2}
        />
        <IconButton
          onClick={removeSection}
          colorScheme="red"
          size="xs" // Made icon smaller
          icon={<DeleteIcon />}
        />
      </Box>
    </Box>
  );
};

// Email Components Renderer with Editable Fields
const updateComponent = (updatedComponent, parentId, rowId, columnId, setSections) => {
  setSections((prevSections) => {
    const updated = [...prevSections];
    const sectionIndex = updated.findIndex((s) => s.id === parentId);
    const rowIndex = updated[sectionIndex].rows.findIndex((r) => r.id === rowId);
    const columnIndex = updated[sectionIndex].rows[rowIndex].columns.findIndex((c) => c.id === columnId);

    const components = updated[sectionIndex].rows[rowIndex].columns[columnIndex].components;
    const componentIndex = components.findIndex((comp) => comp.id === updatedComponent.id);
    components[componentIndex] = updatedComponent;

    return updated;
  });
};

const EmailComponent = ({ component, setSections, parentId, rowId, columnId }) => {
  const { type, content } = component;

  const handleChange = (e) => {
    const value = e?.target?.value || ''; // Safely access e.target.value
    const updatedComponent = { ...component, content: value };
    updateComponent(updatedComponent, parentId, rowId, columnId, setSections);
  };

  const renderContent = () => {
    switch (type) {
      case COMPONENT_TYPES.BUTTON:
        return (
          <Button colorScheme="teal">
            <input
              type="text"
              value={content || 'Click Me'}
              onChange={handleChange}
              style={{ background: 'transparent', border: 'none', color: 'teal' }}
            />
          </Button>
        );
      case COMPONENT_TYPES.TEXT:
        return (
          <Text>
            <input
              type="text"
              value={content || 'This is a text block'}
              onChange={handleChange}
              style={{ background: 'transparent', border: 'none' }}
            />
          </Text>
        );
      case COMPONENT_TYPES.PARAGRAPH:
        return (
          <Text>
            <textarea
              value={content || 'This is a paragraph'}
              onChange={handleChange}
              style={{ width: '100%', background: 'transparent', border: '1px solid gray', borderRadius: '4px' }}
            />
          </Text>
        );
      case COMPONENT_TYPES.ORDERED_LIST:
        return (
          <ol>
            <textarea
              value={content || '1. Item 1\n2. Item 2'}
              onChange={handleChange}
              style={{ width: '100%', background: 'transparent', border: '1px solid gray', borderRadius: '4px' }}
            />
          </ol>
        );
      case COMPONENT_TYPES.UNORDERED_LIST:
        return (
          <ul>
            <textarea
              value={content || '- Item 1\n- Item 2'}
              onChange={handleChange}
              style={{ width: '100%', background: 'transparent', border: '1px solid gray', borderRadius: '4px' }}
            />
          </ul>
        );
      case COMPONENT_TYPES.HEADER_1:
        return (
          <Heading size="lg">
            <input
              type="text"
              value={content || 'Header 1'}
              onChange={handleChange}
              style={{ background: 'transparent', border: 'none', fontWeight: 'bold' }}
            />
          </Heading>
        );
      case COMPONENT_TYPES.HEADER_2:
        return (
          <Heading size="md">
            <input
              type="text"
              value={content || 'Header 2'}
              onChange={handleChange}
              style={{ background: 'transparent', border: 'none', fontWeight: 'bold' }}
            />
          </Heading>
        );
      case COMPONENT_TYPES.HEADER_3:
        return (
          <Heading size="sm">
            <input
              type="text"
              value={content || 'Header 3'}
              onChange={handleChange}
              style={{ background: 'transparent', border: 'none', fontWeight: 'bold' }}
            />
          </Heading>
        );
      case COMPONENT_TYPES.IMAGE:
        return (
          <Box>
            <Image
              src={component.imageUrl || 'https://dummyimage.com/100x50/cccccc/000000.png'}
              alt="Placeholder Image"
            />
            <input
              type="text"
              placeholder="Image URL"
              value={component.imageUrl}
              onChange={(e) => handleChange({ ...component, imageUrl: e.target.value })}
              style={{ border: '1px solid gray', borderRadius: '4px', padding: '4px', marginTop: '4px' }}
            />
          </Box>
        );
      case COMPONENT_TYPES.LINK:
        return (
          <Link href={component.linkUrl || 'https://example.com'} color="teal.500">
            <input
              type="text"
              value={content || 'Visit our site'}
              onChange={handleChange}
              style={{ background: 'transparent', border: 'none', color: 'teal' }}
            />
          </Link>
        );
      case COMPONENT_TYPES.HEADING:
        return (
          <Heading size="md">
            <input
              type="text"
              value={content || 'This is a heading'}
              onChange={handleChange}
              style={{ background: 'transparent', border: 'none', fontWeight: 'bold' }}
            />
          </Heading>
        );
      case COMPONENT_TYPES.HR:
        return <Divider />;
      default:
        return null;
    }
  };

  return <Box mb={4}>{renderContent()}</Box>;
};

// Utility Functions
const addColumn = (size, row, setComponents, parentId) => {
  if (row.columns.reduce((sum, col) => sum + col.size, 0) + size <= 12) {
    const newColumn = {
      id: Date.now(),
      label: `Column ${row.columns.length + 1}`,
      size,
      components: [],
    };
    setComponents((prevSections) => {
      const updated = [...prevSections];
      const sectionIndex = updated.findIndex((s) => s.id === parentId);
      const rowIndex = updated[sectionIndex].rows.findIndex((r) => r.id === row.id);
      updated[sectionIndex].rows[rowIndex].columns.push(newColumn);
      return updated;
    });
  }
};

const removeRow = (row, setComponents, parentId) => {
  setComponents((prevSections) => {
    const updated = [...prevSections];
    const sectionIndex = updated.findIndex((s) => s.id === parentId);
    updated[sectionIndex].rows = updated[sectionIndex].rows.filter((r) => r.id !== row.id);
    return updated;
  });
};

const moveRow = (dragIndex, hoverIndex, setComponents) => {
  setComponents((prevSections) => {
    const updated = [...prevSections];

    updated.forEach((section) => {
      const rows = section.rows;
      const [draggedRow] = rows.splice(dragIndex, 1);
      rows.splice(hoverIndex, 0, draggedRow);
    });

    return updated;
  });
};

// Main CreateTemplate Component
const CreateTemplate = () => {
  const [sections, setSections] = useState([
    {
      id: Date.now(),
      rows: [
        {
          id: Date.now() + 1,
          columns: [
            {
              id: Date.now() + 2,
              label: 'Column 1',
              size: 6,
              components: [
                { id: Date.now() + 4, type: 'TEXT', content: 'Welcome to the Email Editor!' },
              ],
            },
            {
              id: Date.now() + 3,
              label: 'Column 2',
              size: 6,
              components: [
                { id: Date.now() + 5, type: 'BUTTON', content: 'Click Me' },
              ],
            },
          ],
        },
      ],
    },
  ]);

  // Add state to toggle between Editor View and Code Preview
  const [isEditorView, setIsEditorView] = useState(true);
  // Add state for HTML content and browser view toggle
  const [htmlContent, setHtmlContent] = useState('<div>Write your HTML here</div>');
  const [isBrowserView, setIsBrowserView] = useState(false);

  // Ensure updateSections is defined in the correct scope
  const updateSections = (updater) => {
    setSections((prevSections) => {
      const updatedSections = updater(prevSections);
      syncEditorToHtml(); // Generate HTML after updating sections
      return updatedSections;
    });
  };

  const addSection = () => {
    const newSection = {
      id: Date.now(),
      rows: [
        {
          id: Date.now() + 1,
          columns: [
            { id: Date.now() + 2, label: 'Column 1', size: 4, components: [] },
            { id: Date.now() + 3, label: 'Column 2', size: 4, components: [] },
          ],
        },
      ],
    };
    updateSections((prev) => [...prev, newSection]);
  };

  // Wrap syncEditorToHtml in useCallback to prevent it from changing on every render
  const syncEditorToHtml = useCallback(() => {
    console.log('syncEditorToHtml invoked');
    console.log('Current sections state:', JSON.stringify(sections, null, 2)); // Log sections for debugging

    const html = sections
      .map((section) =>
        `<div class='section'>` +
        (section.rows || [])
          .map((row) =>
            `<div class='row'>` +
            (row.columns || [])
              .map((column) =>
                `<div class='column' style='flex: ${column.size / 12};'>` +
                (column.components || [])
                  .map((component) => {
                    switch (component.type) {
                      case COMPONENT_TYPES.TEXT:
                      case COMPONENT_TYPES.HEADING:
                      case COMPONENT_TYPES.PARAGRAPH:
                      case COMPONENT_TYPES.ORDERED_LIST:
                      case COMPONENT_TYPES.UNORDERED_LIST:
                        return `<div>${component.content || ''}</div>`;
                      case COMPONENT_TYPES.IMAGE:
                        return `<img src='${component.imageUrl || ''}' alt='Image' />`;
                      case COMPONENT_TYPES.LINK:
                        return `<a href='${component.linkUrl || '#'}'>${component.content || ''}</a>`;
                      default:
                        return '';
                    }
                  })
                  .join('') +
                `</div>`
              )
              .join('') +
            `</div>`
          )
          .join('') +
        `</div>`
      )
      .join('');

    console.log('Generated HTML:', html); // Log generated HTML for debugging
    setHtmlContent(html);
  }, [sections]);

  useEffect(() => {
    console.log('Sections updated, syncing HTML...'); // Log when sections are updated
    syncEditorToHtml();
  }, [sections, syncEditorToHtml]);

  // Ensure proper synchronization and rendering in browser view
  useEffect(() => {
    // Only sync when sections change or when switching to browser view
    if (isBrowserView) {
      syncEditorToHtml();
    }
  }, [sections, isBrowserView, syncEditorToHtml]);

  useEffect(() => {
    // Ensure editor view syncs only when toggled
    if (isEditorView) {
      syncEditorToHtml();
    }
  }, [isEditorView, syncEditorToHtml]);

  // Generate initial HTML content immediately after initializing sections
  useEffect(() => {
    syncEditorToHtml();
  }, [syncEditorToHtml]);

  // Debugging: Log the generated HTML content
  useEffect(() => {
    console.log("Generated HTML Content:", htmlContent);
  }, [htmlContent]);

  // Define handleSaveTemplate to log the current sections
  const handleSaveTemplate = () => {
    console.log('Saved Template:', sections);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Box display="flex" flexDirection="column" h="100vh">
        <Box flex="1" display="flex">
          {/* Left: Email Preview Area */}
          {isEditorView ? (
            <Box flex="3" p={4} bg="gray.50"> {/* Increased flex value to make the email preview area wider */}
              <Heading size="lg" mb={4}>
                Editor View
              </Heading>
              {sections.map((section) => (
                <DroppableSection
                  key={section.id}
                  section={section}
                  setComponents={setSections} // Pass 'setSections' as 'setComponents'
                  updateSections={updateSections} // Pass updateSections explicitly
                  syncEditorToHtml={syncEditorToHtml} // Pass syncEditorToHtml explicitly
                />
              ))}
              <IconButton
                onClick={addSection}
                colorScheme="green"
                size="xs" // Made icon smaller
                icon={<AddIcon />}
              />
            </Box>
          ) : isBrowserView ? (
            <Box flex="3" p={4} bg="gray.200" borderLeftWidth="1px">
              <Heading size="lg" mb={4}>
                Browser View
              </Heading>
              <Box
                dangerouslySetInnerHTML={{ __html: htmlContent }}
                style={{ padding: '16px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'auto', maxHeight: '400px' }}
              />
            </Box>
          ) : (
            <Box flex="3" p={4} bg="gray.200" borderLeftWidth="1px">
              <Heading size="lg" mb={4}>
                Code Preview
              </Heading>
              <Box
                as="pre"
                p={4}
                bg="white"
                border="1px solid #ddd"
                borderRadius="8px"
                overflow="auto"
                maxHeight="400px"
              >
                {JSON.stringify(sections, null, 2)}
              </Box>
            </Box>
          )}

          {/* Right: Components List */}
          <Box w="20%" p={4} bg="gray.100" borderLeftWidth="1px" display="flex" flexDirection="column" alignItems="center"> {/* Adjusted layout to vertical alignment and removed header */}
            {Object.values(COMPONENT_TYPES).map((type) => (
              <DraggableComponent key={type} type={type} />
            ))}
          </Box>
        </Box>

        {/* Bottom: Save Button */}
        <Box p={4} bg="gray.200" borderTopWidth="1px" textAlign="center">
          <Button onClick={handleSaveTemplate} colorScheme="blue" p={3} rounded="md" ml={4}>
            Save Template
          </Button>
        </Box>

        {/* Top Center: Editor and Preview Buttons */}
        <Box position="absolute" top="4" left="50%" transform="translateX(-50%)" display="flex" gap="4">
          <IconButton
            icon={<EditIcon />} // Icon for editor
            colorScheme={isEditorView ? "blue" : "gray"}
            onClick={() => { setIsEditorView(true); setIsBrowserView(false); }} // Toggle to editor view
            aria-label="Editor"
          />
          <IconButton
            icon={<ViewIcon />} // Icon for preview
            colorScheme={!isEditorView && !isBrowserView ? "green" : "gray"}
            onClick={() => { setIsEditorView(false); setIsBrowserView(false); }} // Toggle to code preview
            aria-label="Preview"
          />
          <IconButton
            icon={<ViewIcon />} // Icon for browser view
            colorScheme={isBrowserView ? "purple" : "gray"}
            onClick={() => { setIsEditorView(false); setIsBrowserView(true); }} // Toggle to browser view
            aria-label="Browser View"
          />
        </Box>
      </Box>
    </DndProvider>
  );
};

export default CreateTemplate;
