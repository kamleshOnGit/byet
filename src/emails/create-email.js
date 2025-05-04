import React, { useState } from 'react';
import { Box, Button, Text, Divider, Image, Link, Heading, IconButton, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { AddIcon, DeleteIcon, DragHandleIcon } from '@chakra-ui/icons';
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

const moveComponent = (dragIndex, hoverIndex, columnId, setComponents, parentId, rowId) => {
  setComponents((prevSections) => {
    const updated = [...prevSections];
    const sectionIndex = updated.findIndex((s) => s.id === parentId);
    const rowIndex = updated[sectionIndex].rows.findIndex((r) => r.id === rowId);
    const columnIndex = updated[sectionIndex].rows[rowIndex].columns.findIndex((c) => c.id === columnId);

    const components = updated[sectionIndex].rows[rowIndex].columns[columnIndex].components;
    const [draggedComponent] = components.splice(dragIndex, 1);
    components.splice(hoverIndex, 0, draggedComponent);

    return updated;
  });
};

const DraggableComponentInColumn = ({ component, index, columnId, setComponents, parentId, rowId }) => {
  const [, drag] = useDrag({
    type: 'COMPONENT',
    item: { index },
  });

  const [, drop] = useDrop({
    accept: 'COMPONENT',
    hover: (item) => {
      if (item.index !== index) {
        moveComponent(item.index, index, columnId, setComponents, parentId, rowId);
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
      <EmailComponent component={component} setSections={setComponents} parentId={parentId} rowId={rowId} columnId={columnId} />
    </Box>
  );
};

// Droppable Column Component
const DroppableColumn = ({ column, setComponents, colSpan, parentId, rowId }) => {
  const [, drop] = useDrop({
    accept: Object.values(COMPONENT_TYPES),
    drop: (item) => addComponent(item.type),
  });

  const addComponent = (type) => {
    const newComponent = {
      id: Date.now(),
      type,
      content: '',
      imageUrl: 'https://dummyimage.com/100x50/cccccc/000000.png',
      linkUrl: '',
      font: { size: 'md', weight: 'normal', family: 'Arial' },
    };
    setComponents((prevSections) => {
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
  };

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
      {column.components && column.components.map((comp, compIndex) => (
        <DraggableComponentInColumn
          key={comp.id}
          component={comp}
          index={compIndex}
          columnId={column.id}
          setComponents={setComponents}
          parentId={parentId}
          rowId={rowId}
        />
      ))}
    </Box>
  );
};

// Droppable Row Component
const DroppableRow = ({ row, setComponents, parentId, index, moveRow }) => {
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
const DroppableSection = ({ section, setComponents }) => {
  const addRow = () => {
    const newRow = {
      id: Date.now(),
      columns: [
        { id: Date.now() + 1, label: 'Column 1', size: 4, components: [] },
        { id: Date.now() + 2, label: 'Column 2', size: 4, components: [] },
      ],
    };
    setComponents((prevSections) => {
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
    const updatedComponent = { ...component, content: e.target.value };
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
            { id: Date.now() + 2, label: 'Column 1', size: 4, components: [] },
            { id: Date.now() + 3, label: 'Column 2', size: 4, components: [] },
          ],
        },
      ],
    },
  ]);

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
    setSections((prev) => [...prev, newSection]);
  };

  const handleSaveTemplate = () => {
    console.log(sections); // Handle saving logic here
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Box display="flex" flexDirection="column" h="100vh">
        <Box flex="1" display="flex">
          {/* Left: Email Preview Area */}
          <Box flex="3" p={4} bg="gray.50"> {/* Increased flex value to make the email preview area wider */}
            <Heading size="lg" mb={4}>
              Email Preview
            </Heading>
            {sections.map((section) => (
              <DroppableSection
                key={section.id}
                section={section}
                setComponents={setSections} // Pass 'setSections' as 'setComponents'
              />
            ))}
            <IconButton
              onClick={addSection}
              colorScheme="green"
              size="xs" // Made icon smaller
              icon={<AddIcon />}
            />
          </Box>

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
      </Box>
    </DndProvider>
  );
};

export default CreateTemplate;
