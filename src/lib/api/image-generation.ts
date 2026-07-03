import { NSFW_CATEGORIES } from '../constants';

export interface GenerateImageResult {
  id: string;
  url: string;
  category: string;
  timestamp: number;
}

const API_BASE = 'https://felix-rdx-unlimited-free-apis.vercel.app';

export async function generateImage(category: string): Promise<GenerateImageResult> {
  if (!NSFW_CATEGORIES.some((c) => c.value === category)) {
    throw new Error('Invalid category');
  }

  const imageUrl = `${API_BASE}/api/v1/api/nsfw/${category}`;
  const id = `img_${Date.now()}`;

  return {
    id,
    url: imageUrl,
    category,
    timestamp: Date.now(),
  };
}
