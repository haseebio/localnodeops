// "If this is your card" lines. Only cards whose own text states a limit get an
// action, and only that limit is repeated here. Affiliate links come from
// lib/affiliate.ts. Totals are passed in from the shared model table so no
// number is typed by hand.
import { RUNPOD_URL, amazonSearchUrl } from './affiliate';

export interface HardwareAction {
  text: string;
  href: string;
  affiliate: boolean;
  label: string;
}

export function getHardwareAction(
  slug: string,
  total70Gb: number | null
): { limit: string; links: HardwareAction[] } | null {
  switch (slug) {
    case 'rtx-4090-24gb-inference':
      return {
        limit: total70Gb
          ? `A 70B at Q4 needs ${total70Gb.toFixed(1)} GB at 8K, more than 24 GB.`
          : 'A 70B at Q4 does not fit in 24 GB.',
        links: [
          { text: 'See a dual-GPU build', href: '/builds#power', affiliate: false, label: '' },
          { text: 'Rent it by the hour on RunPod', href: RUNPOD_URL, affiliate: true, label: 'rent' },
        ],
      };
    case 'mac-mini-m4-16gb':
      return {
        limit: 'Only about 12 GB of the 16 GB is usable by the GPU.',
        links: [
          { text: 'Look at a 24 GB or 32 GB model', href: amazonSearchUrl('Mac mini M4 24GB'), affiliate: true, label: 'amazon' },
        ],
      };
    case 'ryzen-9-7950x-cpu-inference':
      return {
        limit: 'Memory bandwidth, not core count, sets the speed.',
        links: [
          { text: 'DDR5-6000 memory kits', href: amazonSearchUrl('DDR5-6000 kit'), affiliate: true, label: 'amazon' },
        ],
      };
    default:
      return null;
  }
}
