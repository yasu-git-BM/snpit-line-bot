const { z } = require('zod');

const nftSchema = z.object({
  tokenId: z.union([z.string(), z.coerce.number()]).optional(),
  name: z.string().optional(),
  lastTotalShots: z.coerce.number().optional()
});

const walletSchema = z.object({
  'wallet name': z.string(),
  'wallet address': z.string(),
  maxShots: z.coerce.number().optional(),
  enableShots: z.coerce.number().optional(),
  lastChecked: z.string().optional(),
  manualOverride: z.boolean().optional(), // ✅ GUI補正フラグを追加
  nfts: z.array(nftSchema).optional()
});

const StatusSchema = z.object({
  wallets: z.array(walletSchema)
});

module.exports = { StatusSchema };
