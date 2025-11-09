import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Heading, IconButton } from '@chakra-ui/react';
import { AddIcon, EditIcon, SettingsIcon, ViewIcon } from '@chakra-ui/icons';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import EditorTabs from './EditorTabs';
import DroppableSection from './DroppableSection';
import { COMPONENT_TYPES } from './componentTypes';

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
                { 
                  id: Date.now() + 4, 
                  type: COMPONENT_TYPES.TEXT, 
                  content: 'Welcome to the Email Editor!',
                  // Add default styling properties
                  settings: {
                    padding: { top: 10, right: 10, bottom: 10, left: 10 },
                    margin: { top: 0, right: 0, bottom: 0, left: 0 },
                    fontSize: 'md',
                    fontWeight: 'normal',
                    textAlign: 'left',
                    textColor: '#000000',
                    backgroundColor: '#ffffff',
                    width: '100%',
                    height: 'auto',
                    border: 'none',
                    borderColor: '#000000',
                    borderWidth: 0,
                    borderRadius: 0,
                  }
                },
              ],
            },
            {
              id: Date.now() + 3,
              label: 'Column 2',
              size: 6,
              components: [
                { 
                  id: Date.now() + 5, 
                  type: COMPONENT_TYPES.BUTTON, 
                  content: 'Click Me',
                  // Add default styling properties
                  settings: {
                    padding: { top: 10, right: 20, bottom: 10, left: 20 },
                    margin: { top: 0, right: 0, bottom: 0, left: 0 },
                    fontSize: 'md',
                    fontWeight: 'normal',
                    textAlign: 'center',
                    textColor: '#ffffff',
                    backgroundColor: '#0066cc',
                    width: 'auto',
                    height: 'auto',
                    border: 'none',
                    borderColor: '#0066cc',
                    borderWidth: 0,
                    borderRadius: 4,
                    buttonColor: '#0066cc',
                    buttonTextColor: '#ffffff',
                  }
                },
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
  // Add state to track selected component
  const [selectedComponent, setSelectedComponent] = useState(() => {
    // Set the first component as selected by default
    if (sections && sections.length > 0 && 
        sections[0].rows && sections[0].rows.length > 0 &&
        sections[0].rows[0].columns && sections[0].rows[0].columns.length > 0 &&
        sections[0].rows[0].columns[0].components && sections[0].rows[0].columns[0].components.length > 0) {
      return sections[0].rows[0].columns[0].components[0];
    }
    return null;
  });

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

    // Create a complete HTML document with proper styling
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Preview</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            border-radius: 4px;
            overflow: hidden;
          }
          .section {
            padding: 20px;
            border-bottom: 1px solid #eee;
          }
          .row {
            display: flex;
            flex-wrap: wrap;
            margin: 0 -10px;
          }
          .column {
            padding: 0 10px;
            box-sizing: border-box;
          }
          .component {
            margin-bottom: 15px;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          a {
            color: #0066cc;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          button {
            background-color: #0066cc;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
          }
          button:hover {
            background-color: #0052a3;
          }
          ol, ul {
            margin: 0 0 15px 0;
            padding-left: 20px;
          }
          h1, h2, h3, h4, h5, h6 {
            margin: 0 0 15px 0;
          }
          p {
            margin: 0 0 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          ${sections
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
                          // Apply component-specific styles
                          const styles = component.settings ? `style="
                            padding: ${component.settings.padding?.top || 0}px ${component.settings.padding?.right || 0}px ${component.settings.padding?.bottom || 0}px ${component.settings.padding?.left || 0}px;
                            margin: ${component.settings.margin?.top || 0}px ${component.settings.margin?.right || 0}px ${component.settings.margin?.bottom || 0}px ${component.settings.margin?.left || 0}px;
                            background-color: ${component.settings.backgroundColor || 'transparent'};
                            text-align: ${component.settings.textAlign || 'left'};
                            color: ${component.settings.textColor || '#000000'};
                            font-size: ${component.settings.fontSize || '14px'};
                            font-weight: ${component.settings.fontWeight || 'normal'};
                            border: ${component.settings.border !== 'none' ? `${component.settings.borderWidth || 0}px ${component.settings.border || 'solid'} ${component.settings.borderColor || '#000000'}` : 'none'};
                            border-radius: ${component.settings.borderRadius || 0}px;
                          "` : '';
                          
                          // Escape HTML content to prevent injection
                          const escapeHtml = (text) => {
                            if (!text) return '';
                            return text
                              .replace(/&/g, '&amp;')
                              .replace(/</g, '&lt;')
                              .replace(/>/g, '&gt;')
                              .replace(/"/g, '&quot;')
                              .replace(/'/g, '&#039;');
                          };
                          
                          switch (component.type) {
                            case COMPONENT_TYPES.TEXT:
                              return `<div class='component' ${styles}>${escapeHtml(component.content) || ''}</div>`;
                            case COMPONENT_TYPES.HEADING:
                            case COMPONENT_TYPES.HEADER_1:
                              return `<h1 class='component' ${styles}>${escapeHtml(component.content) || ''}</h1>`;
                            case COMPONENT_TYPES.HEADER_2:
                              return `<h2 class='component' ${styles}>${escapeHtml(component.content) || ''}</h2>`;
                            case COMPONENT_TYPES.HEADER_3:
                              return `<h3 class='component' ${styles}>${escapeHtml(component.content) || ''}</h3>`;
                            case COMPONENT_TYPES.PARAGRAPH:
                              return `<p class='component' ${styles}>${escapeHtml(component.content) || ''}</p>`;
                            case COMPONENT_TYPES.ORDERED_LIST:
                              return `<ol class='component' ${styles}>${(component.content || '').split('\n').map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;
                            case COMPONENT_TYPES.UNORDERED_LIST:
                              return `<ul class='component' ${styles}>${(component.content || '').split('\n').map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
                            case COMPONENT_TYPES.IMAGE:
                              return `<div class='component' ${styles}><img src='${escapeHtml(component.imageUrl) || ''}' alt='Image' style='max-width: 100%; height: auto;' /></div>`;
                            case COMPONENT_TYPES.LINK:
                              return `<div class='component' ${styles}><a href='${escapeHtml(component.linkUrl) || '#'}'>${escapeHtml(component.content) || ''}</a></div>`;
                            case COMPONENT_TYPES.BUTTON:
                              return `<div class='component' ${styles}><button style="background-color: ${escapeHtml(component.settings?.buttonColor) || '#0066cc'}; color: ${escapeHtml(component.settings?.buttonTextColor) || '#ffffff'}; border: none; padding: 10px 20px; border-radius: 4px;">${escapeHtml(component.content) || 'Click Me'}</button></div>`;
                            default:
                              return `<div class='component' ${styles}>${escapeHtml(component.content) || ''}</div>`;
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
            .join('')}
        </div>
      </body>
      </html>
    `;

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
  }

  // Handle component updates from settings panel
  const handleComponentUpdate = (updatedComponent) => {
    if (!selectedComponent) return;
    
    updateSections((prevSections) => {
      const updated = [...prevSections];
      
      // Find the section, row, and column containing the component
      for (let s = 0; s < updated.length; s++) {
        const section = updated[s];
        for (let r = 0; r < section.rows.length; r++) {
          const row = section.rows[r];
          for (let c = 0; c < row.columns.length; c++) {
            const column = row.columns[c];
            const componentIndex = column.components.findIndex(comp => comp.id === updatedComponent.id);
            if (componentIndex !== -1) {
              // Update the component
              updated[s].rows[r].columns[c].components[componentIndex] = updatedComponent;
              // Also update the selected component if it's the same one
              if (selectedComponent.id === updatedComponent.id) {
                setSelectedComponent(updatedComponent);
              }
              return updated;
            }
          }
        }
      }
      
      return updated;
    });
  };;

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
                  onSelect={setSelectedComponent} // Pass setSelectedComponent as onSelect
                  selectedComponent={selectedComponent} // Pass selectedComponent
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
                style={{ padding: '16px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', height: 'calc(100% - 60px)' }}
              >
                <iframe
                  title="email-preview"
                  srcDoc={htmlContent}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  sandbox="allow-same-origin"
                />
              </Box>
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

          {/* Right: Editor Tabs */}
          <Box w="20%" p={0} bg="white" borderLeftWidth="1px" minHeight="400px" boxShadow="md">
            <EditorTabs 
              selectedComponent={selectedComponent} 
              onComponentUpdate={handleComponentUpdate} 
            />
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
            icon={<SettingsIcon />} // Icon for code preview
            colorScheme={!isEditorView && !isBrowserView ? "green" : "gray"}
            onClick={() => { setIsEditorView(false); setIsBrowserView(false); }} // Toggle to code preview
            aria-label="Code Preview"
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
