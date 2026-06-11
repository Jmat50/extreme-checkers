import { assetUrl } from '../utils/assets';

export const EXPLOSION_VIDEO = assetUrl('vfx/explosion.mp4');

/** World-space size of the explosion billboard (roughly one checker square). */
export const EXPLOSION_SIZE = 1.05;

/** Matches converted Xplosion.avi (720×486). */
export const EXPLOSION_ASPECT = 720 / 486;

/** Height above board surface to center the effect on a piece. */
export const EXPLOSION_HEIGHT = 0.08;
