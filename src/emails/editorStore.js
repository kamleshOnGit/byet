import { create } from 'zustand';
import { COMPONENT_TYPES } from './partials/componentTypes';

const HISTORY_LIMIT = 100;

const createId = () => Date.now() + Math.floor(Math.random() * 100000);

const createDefaultTemplateSettings = () => ({
  fontFamily: 'Arial, sans-serif',
  fontSize: '14px',
  fontWeight: 'normal',
  lineHeight: '1.5',
  textColor: '#000000',
  bodyBackgroundColor: '#f5f5f5',
  bodyBackgroundImage: '',
  bodyBackgroundSize: 'cover',
  bodyBackgroundPosition: 'center',
  bodyBackgroundRepeat: 'no-repeat',
  containerBackgroundColor: '#ffffff',
  containerWidth: '600px',
  containerMinHeight: 'auto',
  containerPadding: '20px',
});

const createDefaultRowSettings = () => ({
  padding: { top: 10, right: 10, bottom: 10, left: 10 },
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  backgroundColor: 'transparent',
  backgroundImage: '',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  border: 'none',
  borderColor: '#dddddd',
  borderWidth: 0,
  borderRadius: 0,
  boxSizing: 'border-box',
  letterSpacing: 'normal',
  lineHeight: 'normal',
});

const createDefaultColumnSettings = () => ({
  padding: { top: 10, right: 10, bottom: 10, left: 10 },
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  backgroundColor: 'transparent',
  backgroundImage: '',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  border: 'none',
  borderColor: '#cccccc',
  borderWidth: 0,
  borderRadius: 0,
  boxSizing: 'border-box',
  letterSpacing: 'normal',
  lineHeight: 'normal',
});

const createDefaultSections = () => {
  const sectionId = createId();
  const rowId = createId();
  const col1Id = createId();
  const col2Id = createId();
  return [
    {
      id: sectionId,
      rows: [
        {
          id: rowId,
          settings: {
            ...createDefaultRowSettings(),
            backgroundColor: '#ffffff',
            borderColor: '#dddddd',
          },
          columns: [
            {
              id: col1Id,
              label: 'Column 1',
              size: 6,
              settings: {
                ...createDefaultColumnSettings(),
                backgroundColor: '#ffffff',
              },
              components: [
                {
                  id: createId(),
                  type: COMPONENT_TYPES.TEXT,
                  content: 'Welcome to the Email Editor!',
                  settings: {
                    padding: { top: 10, right: 10, bottom: 10, left: 10 },
                    margin: { top: 0, right: 0, bottom: 0, left: 0 },
                    fontSize: 'md',
                    fontWeight: 'normal',
                    textAlign: 'left',
                    textColor: '#000000',
                    backgroundColor: '#ffffff',
                    border: 'none',
                  },
                },
              ],
            },
            {
              id: col2Id,
              label: 'Column 2',
              size: 6,
              settings: {
                ...createDefaultColumnSettings(),
                backgroundColor: '#ffffff',
              },
              components: [
                {
                  id: createId(),
                  type: COMPONENT_TYPES.BUTTON,
                  content: 'Click Me',
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
                    borderRadius: 4,
                    buttonColor: '#0066cc',
                    buttonTextColor: '#ffffff',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ];
};

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const buildInitialTarget = (sections) => {
  const section = sections?.[0];
  const row = section?.rows?.[0];
  const column = row?.columns?.[0];
  const component = column?.components?.[0];
  if (!component) return null;
  return {
    kind: 'component',
    id: component.id,
    sectionId: section.id,
    rowId: row.id,
    columnId: column.id,
    data: component,
  };
};

const locateTarget = (sections, target) => {
  if (!target) return null;
  const { kind, id } = target;
  for (const section of sections || []) {
    for (const row of section.rows || []) {
      if (kind === 'row' && row.id === id) return { ...target, sectionId: section.id, data: row };
      for (const column of row.columns || []) {
        if (kind === 'column' && column.id === id) return { ...target, sectionId: section.id, rowId: row.id, data: column };
        if (kind === 'component') {
          const found = (column.components || []).find((comp) => comp.id === id);
          if (found) {
            return { ...target, sectionId: section.id, rowId: row.id, columnId: column.id, data: found };
          }
        }
      }
    }
  }
  return buildInitialTarget(sections);
};

const cloneSnapshot = (state) => ({
  mode: state.mode,
  sections: deepClone(state.sections),
  templateSettings: deepClone(state.templateSettings),
  selectedTarget: deepClone(state.selectedTarget),
  isEditorView: state.isEditorView,
  isBrowserView: state.isBrowserView,
});

const applySnapshot = (snapshot) => ({
  mode: snapshot.mode,
  sections: deepClone(snapshot.sections),
  templateSettings: deepClone(snapshot.templateSettings),
  selectedTarget: deepClone(snapshot.selectedTarget),
  isEditorView: snapshot.isEditorView,
  isBrowserView: snapshot.isBrowserView,
});

const mutateSections = (sections, updater) => {
  const draft = deepClone(sections);
  const result = updater(draft);
  return Array.isArray(result) ? result : draft;
};

const findRowLocation = (sections, parentId, rowId) => {
  const sectionIndex = sections.findIndex((s) => s.id === parentId);
  if (sectionIndex === -1) return null;
  const rowIndex = (sections[sectionIndex].rows || []).findIndex((r) => r.id === rowId);
  if (rowIndex === -1) return null;
  return { sectionIndex, rowIndex };
};

const findColumnLocation = (sections, parentId, rowId, columnId) => {
  const rowLocation = findRowLocation(sections, parentId, rowId);
  if (!rowLocation) return null;
  const { sectionIndex, rowIndex } = rowLocation;
  const columnIndex = (sections[sectionIndex].rows[rowIndex].columns || []).findIndex((c) => c.id === columnId);
  if (columnIndex === -1) return null;
  return { sectionIndex, rowIndex, columnIndex };
};

const pushHistory = (state, nextSnapshot) => {
  const current = cloneSnapshot(state);
  const past = [...state.history.past, current].slice(-HISTORY_LIMIT);
  return {
    ...nextSnapshot,
    history: {
      past,
      future: [],
    },
  };
};

export const useEditorStore = create((set, get) => ({
  mode: 'create',
  sections: createDefaultSections(),
  templateSettings: createDefaultTemplateSettings(),
  selectedTarget: null,
  isEditorView: true,
  isBrowserView: false,
  history: { past: [], future: [] },

  initializeEditor: ({ importedSections, importedTemplateSettings } = {}) => {
    const sections = Array.isArray(importedSections) && importedSections.length > 0 ? deepClone(importedSections) : createDefaultSections();
    const templateSettings = {
      ...createDefaultTemplateSettings(),
      ...(importedTemplateSettings ? deepClone(importedTemplateSettings) : {}),
    };
    set(() => ({
      mode: Array.isArray(importedSections) && importedSections.length > 0 ? 'edit' : 'create',
      sections,
      templateSettings,
      selectedTarget: buildInitialTarget(sections),
      isEditorView: true,
      isBrowserView: false,
      history: { past: [], future: [] },
    }));
  },

  setSelectedTarget: (target) => set((state) => ({
    selectedTarget: locateTarget(state.sections, target),
  })),

  setEditorViewMode: (mode) => set(() => ({
    isEditorView: mode === 'editor',
    isBrowserView: mode === 'browser',
  })),

  updateTemplateSettings: (nextTemplateSettings) => set((state) => {
    const snapshot = {
      ...cloneSnapshot(state),
      templateSettings: deepClone(nextTemplateSettings),
    };
    return pushHistory(state, snapshot);
  }),

  updateSections: (updater) => set((state) => {
    const nextSections = mutateSections(state.sections, updater);
    const nextSelectedTarget = locateTarget(nextSections, state.selectedTarget);
    const snapshot = {
      ...cloneSnapshot(state),
      sections: nextSections,
      selectedTarget: nextSelectedTarget,
    };
    return pushHistory(state, snapshot);
  }),

  addSection: () => get().updateSections((sections) => {
    sections.push({
      id: createId(),
      rows: [
        {
          id: createId(),
          settings: createDefaultRowSettings(),
          columns: [
            { id: createId(), label: 'Column 1', size: 4, components: [], settings: createDefaultColumnSettings() },
            { id: createId(), label: 'Column 2', size: 4, components: [], settings: createDefaultColumnSettings() },
          ],
        },
      ],
    });
  }),

  removeSection: (sectionId) => get().updateSections((sections) => sections.filter((section) => section.id !== sectionId)),

  addRowToSection: (sectionId, rowOverride = null) => get().updateSections((sections) => {
    const sectionIndex = sections.findIndex((section) => section.id === sectionId);
    if (sectionIndex === -1) return sections;
    const newRow = rowOverride || {
      id: createId(),
      settings: createDefaultRowSettings(),
      columns: [
        { id: createId(), label: 'Column 1', size: 6, components: [], settings: createDefaultColumnSettings() },
        { id: createId(), label: 'Column 2', size: 6, components: [], settings: createDefaultColumnSettings() },
      ],
    };
    sections[sectionIndex].rows.push(newRow);
  }),

  duplicateRow: (parentId, row) => get().updateSections((sections) => {
    const location = findRowLocation(sections, parentId, row.id);
    if (!location) return sections;
    const newRow = {
      ...deepClone(row),
      id: createId(),
      columns: (row.columns || []).map((col) => ({
        ...deepClone(col),
        id: createId(),
        components: (col.components || []).map((comp) => ({ ...deepClone(comp), id: createId() })),
      })),
    };
    sections[location.sectionIndex].rows.splice(location.rowIndex + 1, 0, newRow);
  }),

  removeRow: (parentId, rowId) => get().updateSections((sections) => {
    const sectionIndex = sections.findIndex((section) => section.id === parentId);
    if (sectionIndex === -1) return sections;
    sections[sectionIndex].rows = (sections[sectionIndex].rows || []).filter((row) => row.id !== rowId);
  }),

  moveRow: (dragIndex, hoverIndex) => get().updateSections((sections) => {
    sections.forEach((section) => {
      const rows = section.rows || [];
      if (dragIndex < 0 || hoverIndex < 0 || dragIndex >= rows.length || hoverIndex >= rows.length) return;
      const [draggedRow] = rows.splice(dragIndex, 1);
      rows.splice(hoverIndex, 0, draggedRow);
    });
  }),

  addComponentToColumn: (parentId, rowId, columnId, component) => get().updateSections((sections) => {
    const location = findColumnLocation(sections, parentId, rowId, columnId);
    if (!location) return sections;
    const column = sections[location.sectionIndex].rows[location.rowIndex].columns[location.columnIndex];
    column.components = column.components || [];
    column.components.push(deepClone(component));
  }),

  reorderComponentsInColumn: (parentId, rowId, columnId, dragIndex, hoverIndex) => get().updateSections((sections) => {
    const location = findColumnLocation(sections, parentId, rowId, columnId);
    if (!location) return sections;
    const components = sections[location.sectionIndex].rows[location.rowIndex].columns[location.columnIndex].components || [];
    if (dragIndex < 0 || hoverIndex < 0 || dragIndex >= components.length || hoverIndex >= components.length) return sections;
    const [draggedComponent] = components.splice(dragIndex, 1);
    components.splice(hoverIndex, 0, draggedComponent);
  }),

  updateComponent: (parentId, rowId, columnId, updatedComponent) => get().updateSections((sections) => {
    const location = findColumnLocation(sections, parentId, rowId, columnId);
    if (!location) return sections;
    const components = sections[location.sectionIndex].rows[location.rowIndex].columns[location.columnIndex].components || [];
    const componentIndex = components.findIndex((component) => component.id === updatedComponent.id);
    if (componentIndex === -1) return sections;
    components[componentIndex] = deepClone(updatedComponent);
  }),

  updateTargetSettings: (updatedTarget) => get().updateSections((sections) => {
    if (!updatedTarget) return sections;
    if (updatedTarget.kind === 'component') {
      for (const section of sections) {
        for (const row of section.rows || []) {
          for (const column of row.columns || []) {
            const componentIndex = (column.components || []).findIndex((component) => component.id === updatedTarget.id);
            if (componentIndex !== -1) {
              column.components[componentIndex] = {
                ...column.components[componentIndex],
                settings: deepClone(updatedTarget.settings),
              };
              return sections;
            }
          }
        }
      }
    }
    if (updatedTarget.kind === 'column') {
      for (const section of sections) {
        for (const row of section.rows || []) {
          const columnIndex = (row.columns || []).findIndex((column) => column.id === updatedTarget.id);
          if (columnIndex !== -1) {
            row.columns[columnIndex] = {
              ...row.columns[columnIndex],
              settings: deepClone(updatedTarget.settings),
            };
            return sections;
          }
        }
      }
    }
    if (updatedTarget.kind === 'row') {
      for (const section of sections) {
        const rowIndex = (section.rows || []).findIndex((row) => row.id === updatedTarget.id);
        if (rowIndex !== -1) {
          section.rows[rowIndex] = {
            ...section.rows[rowIndex],
            settings: deepClone(updatedTarget.settings),
          };
          return sections;
        }
      }
    }
    return sections;
  }),

  undo: () => set((state) => {
    if ((state.history.past || []).length === 0) return state;
    const previous = state.history.past[state.history.past.length - 1];
    const future = [cloneSnapshot(state), ...(state.history.future || [])].slice(0, HISTORY_LIMIT);
    return {
      ...applySnapshot(previous),
      history: {
        past: state.history.past.slice(0, -1),
        future,
      },
    };
  }),

  redo: () => set((state) => {
    if ((state.history.future || []).length === 0) return state;
    const next = state.history.future[0];
    const past = [...state.history.past, cloneSnapshot(state)].slice(-HISTORY_LIMIT);
    return {
      ...applySnapshot(next),
      history: {
        past,
        future: state.history.future.slice(1),
      },
    };
  }),
}));
