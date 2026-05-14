// Updated default styling for sections, rows, and columns
export const sectionStyle = {
  border: '1px solid transparent',
  borderRadius: '0px',
  padding: '0px',
  marginBottom: '0px',
  backgroundColor: 'transparent', // Let template backgrounds show through
  minHeight: '10px',
};

export const rowStyle = {
  border: '1px solid transparent',
  borderRadius: '4px',
  padding: '2px',
  marginBottom: '4px',
  backgroundColor: 'transparent', // Let template backgrounds show through
  display: 'flex',
  flexWrap: 'nowrap',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  minHeight: '20px',
  position: 'relative',
  boxSizing: 'border-box',
};

export const columnParentStyle = (colSpan) => ({
  flex: `0 0 ${(colSpan / 12) * 100}%`,
  maxWidth: `${(colSpan / 12) * 100}%`,
  position: 'relative',
  border: '1px solid transparent',
  margin: '0px',
  padding: '2px',
  minHeight: '10px',
  backgroundColor: 'transparent', // Let template backgrounds show through
  boxSizing: 'border-box',
  overflow: 'visible',
});
