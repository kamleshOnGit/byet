// Updated default styling for sections, rows, and columns
export const sectionStyle = {
  border: '2px dashed transparent',
  borderRadius: '0px',
  padding: '0px',
  marginBottom: '0px',
  backgroundColor: 'transparent',
  minHeight: '0px',
};

export const rowStyle = {
  border: '1px solid transparent',
  borderRadius: '0px',
  padding: '0px', // Added padding to create space for icons
  marginBottom: '0px',
  backgroundColor: 'transparent',
  display: 'flex',
  flexWrap: 'nowrap', // Prevent wrapping
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  minHeight: '0px',
  position: 'relative',
  boxSizing: 'border-box',
};

export const columnParentStyle = (colSpan) => ({
  flex: `0 0 ${(colSpan / 12) * 100}%`,
  maxWidth: `${(colSpan / 12) * 100}%`,
  position: 'relative',
  border: '1px solid transparent',
  margin: '0px',
  padding: '0px',
  minHeight: '0px',
  backgroundColor: 'transparent',
  boxSizing: 'border-box',
  overflow: 'visible',
});
