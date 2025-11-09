// Updated default styling for sections, rows, and columns
export const sectionStyle = {
  border: '2px dashed #ccc',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
  backgroundColor: '#f9f9f9',
  minHeight: '100px',
};

export const rowStyle = {
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

export const columnParentStyle = (colSpan) => ({
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
