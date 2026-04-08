import { scanIrToStructureMap } from './scanIrStructure';
import { createId } from './structureShared';

export { scanIrToStructureMap } from './scanIrStructure';

export const irToSections = (irDoc) => {
  const { sections } = scanIrToStructureMap(irDoc);

  if (sections.length === 0) {
    const fallbackSection = { id: createId(), rows: [{ id: createId(), columns: [{ id: createId(), size: 12, components: [] }] }] };
    return [fallbackSection];
  }

  return sections;
};
