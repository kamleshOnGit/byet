// Updated default styling for sections, rows, and columns
export const sectionStyle = {
  border: '2px dashed #e2e8f0',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
  backgroundColor: 'rgba(250, 250, 250, 0.3)',
  minHeight: '60px',
};

export const rowStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '4px',
  padding: '12px',
  marginBottom: '12px',
  backgroundColor: 'rgba(255, 255, 255, 0.5)',
  display: 'flex',
  flexWrap: 'nowrap',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  minHeight: '50px',
  position: 'relative',
  boxSizing: 'border-box',
};

export const columnParentStyle = (colSpan) => ({
  flex: `0 0 ${(colSpan / 12) * 100}%`,
  maxWidth: `${(colSpan / 12) * 100}%`,
  position: 'relative',
  border: '1px dashed #e2e8f0',
  margin: '4px',
  padding: '8px',
  minHeight: '40px',
  backgroundColor: 'rgba(247, 250, 252, 0.4)',
  boxSizing: 'border-box',
  overflow: 'visible',
});
