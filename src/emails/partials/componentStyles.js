// Updated default styling for sections, rows, and columns
export const sectionStyle = {
  border: '1px dashed transparent',
  borderRadius: '4px',
  padding: '8px',
  marginBottom: '8px',
  backgroundColor: 'transparent',
  minHeight: '60px', // Increased for better drop target
  position: 'relative',
};

export const rowStyle = {
  border: '1px dashed #d9d9d9', // Editor-only dashed border (not included in HTML export)
  borderRadius: '4px',
  padding: '4px',
  marginBottom: '4px',
  backgroundColor: 'transparent',
  display: 'flex',
  flexWrap: 'nowrap',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  minHeight: '30px',
  position: 'relative',
  boxSizing: 'border-box',
  width: '100%',
};

export const columnParentStyle = (colSpan) => ({
  flex: `0 0 ${(colSpan / 12) * 100}%`,
  width: `${(colSpan / 12) * 100}%`,
  maxWidth: `${(colSpan / 12) * 100}%`,
  minWidth: '0',
  position: 'relative',
  border: '1px dashed #d0d0d0', // Editor-only dashed border (not included in HTML export)
  margin: '0',
  padding: '4px',
  minHeight: '20px',
  backgroundColor: 'transparent',
  boxSizing: 'border-box',
  overflow: 'hidden',
});
