import { z } from 'zod';

const nftSchema = z.object({
  name: z.string().optional(),
  tokenId: z.union([z.string(), z.coerce.number()]).optional(),
  lastTotalShots: z.coerce.number().optional()
});

const walletSchema = z.object({
  'wallet name': z.string(),
  'wallet address': z.string(),
  maxShots: z.coerce.number().optional(),
  enableShots: z.coerce.number().optional(),
  lastChecked: z.string().optional(),
  nfts: z.array(nftSchema).optional()
});

export const statusSchema = z.object({
  wallets: z.array(walletSchema)
});
