import React, { useState } from 'react';
import { Button, Text, Hr, Img, Link } from '@react-email/components';
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
};

// Draggable Component
const DraggableComponent = ({ type, label }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type,
    item: { type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`p-2 mb-2 bg-gray-100 rounded cursor-pointer ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {label}
    </div>
  );
};

// Non-Draggable Component
const NonDraggableComponent = ({ label, style }) => (
  <div className={`border rounded p-2 mb-2 ${style}`}>{label}</div>
);

// Droppable Column Component
const DroppableColumn = ({ column, setComponents, index, parentId }) => {
  const [{ isOver }, drop] = useDrop({
    accept: Object.values(COMPONENT_TYPES),
    drop: (item) => addComponent(item.type),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const addComponent = (type) => {
    const newComponent = {
      id: Date.now(),
      type,
      content: '',
      imageUrl: '',
      linkUrl: '',
      font: { size: 'text-base', weight: 'normal', family: 'Arial' },
    };
    setComponents((prevComponents) => {
      const updated = [...prevComponents];
      const parentIndex = updated.findIndex((c) => c.id === parentId);
      const columnIndex = updated[parentIndex].rows[0].columns.findIndex(
        (c) => c.id === column.id
      );
      updated[parentIndex].rows[0].columns[columnIndex].components.push(
        newComponent
      );
      return updated;
    });
  };

  return (
    <div
      ref={drop}
      className={`border rounded p-2 mb-2 ${
        isOver ? 'border-dashed border-2 border-blue-500' : ''
      }`}
      style={{ width: `${(column.size / 12) * 100}%` }}
    >
      {column.label}
      {column.components.map((comp) => (
        <EmailComponent
          key={comp.id}
          component={comp}
          setComponents={setComponents}
        />
      ))}
    </div>
  );
};

// Droppable Row Component
const DroppableRow = ({ row, setComponents, parentId }) => {
  const addColumn = () => {
    const newColumn = {
      id: Date.now(),
      label: `Column ${row.columns.length + 1}`,
      size: 6,
      components: [],
    };
    setComponents((prevSections) => {
      const updated = [...prevSections];
      const sectionIndex = updated.findIndex((s) => s.id === parentId);
      updated[sectionIndex].rows[0].columns.push(newColumn);
      return updated;
    });
  };

  const removeColumn = (columnId) => {
    setComponents((prevSections) => {
      const updated = [...prevSections];
      const sectionIndex = updated.findIndex((s) => s.id === parentId);
      updated[sectionIndex].rows[0].columns = updated[
        sectionIndex
      ].rows[0].columns.filter((col) => col.id !== columnId);
      return updated;
    });
  };

  return (
    <div className='flex mb-2'>
      {row.columns.map((col, index) => (
        <div key={col.id} className='relative'>
          <DroppableColumn
            column={col}
            setComponents={setComponents}
            index={index}
            parentId={parentId}
          />
          <Button
            onClick={() => removeColumn(col.id)}
            className='absolute right-0 top-0 text-red-500'
          >
            Remove
          </Button>
        </div>
      ))}
      <Button onClick={addColumn} className='bg-blue-500 text-white ml-2'>
        Add Column
      </Button>
    </div>
  );
};

// Droppable Section Component
const DroppableSection = ({ section, setComponents }) => {
  const addRow = () => {
    const newRow = {
      id: Date.now(),
      columns: [
        { id: Date.now() + 1, label: 'Column 1', size: 6, components: [] },
        { id: Date.now() + 2, label: 'Column 2', size: 6, components: [] },
      ],
    };
    setComponents((prevSections) => {
      const updated = [...prevSections];
      const sectionIndex = updated.findIndex((s) => s.id === section.id);
      updated[sectionIndex].rows.push(newRow);
      return updated;
    });
  };

  return (
    <div className='border rounded p-4 mb-4'>
      <h2 className='font-bold'>Section</h2>
      {section.rows.map((row) => (
        <DroppableRow
          key={row.id}
          row={row}
          setComponents={setComponents}
          parentId={section.id}
        />
      ))}
      <div className='flex mt-4'>
        <Button onClick={addRow} className='bg-yellow-500 text-white'>
          Add Row
        </Button>
      </div>
    </div>
  );
};

// Email Components Renderer with Editable Fields
const EmailComponent = ({ component, setComponents }) => {
  const { type, content, imageUrl, linkUrl } = component;

  const handleChange = (e) => {
    const updatedComponent = { ...component, content: e.target.value };
    setComponents((prev) =>
      prev.map((comp) => (comp.id === component.id ? updatedComponent : comp))
    );
  };

  const handleImageUrlChange = (e) => {
    const updatedComponent = { ...component, imageUrl: e.target.value };
    setComponents((prev) =>
      prev.map((comp) => (comp.id === component.id ? updatedComponent : comp))
    );
  };

  const handleLinkUrlChange = (e) => {
    const updatedComponent = { ...component, linkUrl: e.target.value };
    setComponents((prev) =>
      prev.map((comp) => (comp.id === component.id ? updatedComponent : comp))
    );
  };

  const renderContent = () => {
    switch (type) {
      case COMPONENT_TYPES.BUTTON:
        return (
          <Button href='https://example.com'>
            <input
              type='text'
              value={content || 'Click Me'}
              onChange={handleChange}
              className='bg-transparent border-none text-blue-500'
            />
          </Button>
        );
      case COMPONENT_TYPES.TEXT:
        return (
          <Text>
            <input
              type='text'
              value={content || 'This is a text block'}
              onChange={handleChange}
              className='bg-transparent border-none'
            />
          </Text>
        );
      case COMPONENT_TYPES.IMAGE:
        return (
          <div>
            <Img
              src={imageUrl || 'https://via.placeholder.com/150'}
              alt='Placeholder Image'
            />
            <input
              type='text'
              placeholder='Image URL'
              value={imageUrl}
              onChange={handleImageUrlChange}
              className='border border-gray-400 rounded p-1 mt-1'
            />
          </div>
        );
      case COMPONENT_TYPES.LINK:
        return (
          <Link href={linkUrl || 'https://example.com'}>
            <input
              type='text'
              value={content || 'Visit our site'}
              onChange={handleChange}
              className='bg-transparent border-none text-blue-500'
            />
            <input
              type='text'
              placeholder='Link URL'
              value={linkUrl}
              onChange={handleLinkUrlChange}
              className='border border-gray-400 rounded p-1 mt-1'
            />
          </Link>
        );
      case COMPONENT_TYPES.HEADING:
        return (
          <Text as='h2'>
            <input
              type='text'
              value={content || 'This is a heading'}
              onChange={handleChange}
              className='bg-transparent border-none font-bold'
            />
          </Text>
        );
      case COMPONENT_TYPES.HR:
        return <Hr />;
      default:
        return null;
    }
  };

  return <div className='mb-4'>{renderContent()}</div>;
};

// Main CreateTemplate Component
const CreateTemplate = () => {
  const [sections, setSections] = useState([]);

  const addSection = () => {
    const newSection = {
      id: Date.now(),
      rows: [
        {
          id: Date.now() + 1,
          columns: [
            { id: Date.now() + 2, label: 'Column 1', size: 6, components: [] },
            { id: Date.now() + 3, label: 'Column 2', size: 6, components: [] },
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
      <div className='flex flex-col h-screen'>
        <div className='flex-grow flex'>
          {/* Left: Email Preview Area */}
          <div className='flex-1 p-4 bg-gray-50'>
            <h3 className='text-lg font-bold mb-4'>Email Preview</h3>
            {sections.map((section) => (
              <DroppableSection
                key={section.id}
                section={section}
                setComponents={setSections}
              />
            ))}
            <Button onClick={addSection} className='bg-green-500 text-white'>
              Add Section
            </Button>
          </div>

          {/* Right: Components List */}
          <div className='w-1/4 p-4 bg-gray-100 border-l'>
            <h3 className='text-lg font-bold mb-4'>Draggable Components</h3>
            <DraggableComponent type={COMPONENT_TYPES.BUTTON} label='Button' />
            <DraggableComponent
              type={COMPONENT_TYPES.TEXT}
              label='Text Block'
            />
            <DraggableComponent type={COMPONENT_TYPES.IMAGE} label='Image' />
            <DraggableComponent type={COMPONENT_TYPES.LINK} label='Link' />
            <DraggableComponent
              type={COMPONENT_TYPES.HEADING}
              label='Heading'
            />
            <DraggableComponent
              type={COMPONENT_TYPES.HR}
              label='Horizontal Rule (HR)'
            />
          </div>
        </div>

        {/* Bottom: Save Button */}
        <div className='p-4 bg-gray-200 border-t text-center'>
          <Button
            onClick={handleSaveTemplate}
            className='bg-blue-500 text-white py-2 px-4 rounded ml-4'
          >
            Save Template
          </Button>
        </div>
      </div>
    </DndProvider>
  );
};

export default CreateTemplate;
