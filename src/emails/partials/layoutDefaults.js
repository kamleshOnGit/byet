export const baseLayoutSettings = {
  padding: { top: 10, right: 10, bottom: 10, left: 10 },
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  backgroundColor: '#ffffff',
  width: '100%',
  height: 'auto',
  border: 'none',
  borderColor: '#000000',
  borderWidth: 0,
  borderRadius: 0,
};

export const cloneLayoutSettings = () => ({
  padding: { ...baseLayoutSettings.padding },
  margin: { ...baseLayoutSettings.margin },
  backgroundColor: baseLayoutSettings.backgroundColor,
  width: baseLayoutSettings.width,
  height: baseLayoutSettings.height,
  border: baseLayoutSettings.border,
  borderColor: baseLayoutSettings.borderColor,
  borderWidth: baseLayoutSettings.borderWidth,
  borderRadius: baseLayoutSettings.borderRadius,
});

export const createColumn = ({ label = 'Column', size = 6, components = [] } = {}) => ({
  id: Date.now() + Math.random(),
  label,
  size,
  components,
  settings: cloneLayoutSettings(),
});

export const createRow = ({ columns = [] } = {}) => ({
  id: Date.now() + Math.random(),
  settings: cloneLayoutSettings(),
  columns,
});
