import { assetUrl } from '../utils/assets';

const BASE = 'assets/eventually/images';

export const EVENTUALLY_BG_IMAGES = [
  assetUrl(`${BASE}/bg01.jpg`),
  assetUrl(`${BASE}/bg02.jpg`),
  assetUrl(`${BASE}/bg03.jpg`),
] as const;
