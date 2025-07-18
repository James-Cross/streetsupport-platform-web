import rawCategories from '@/data/service-categories.json';
import { formatCategory, type RawCategory } from './formatCategories';

const categories = (rawCategories as RawCategory[]).map(formatCategory);

export const categoryKeyToName: Record<string, string> = {};
export const subCategoryKeyToName: Record<string, string> = {};

categories.forEach(cat => {
  categoryKeyToName[cat.key] = cat.name;
  cat.subCategories.forEach(sub => {
    subCategoryKeyToName[sub.key] = sub.name;
  });
});
