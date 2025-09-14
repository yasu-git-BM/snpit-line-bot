const { z } = require('zod');

const NFTSchema = z.object({
  tokenId: z.union([z.string(), z.number()]),
  name: z.string().optional(),
  lastTotalShots: z.number().optional()
});

const WalletSchema = z.object({
  'wallet name': z.string(),
  'wallet address': z.string(),
  maxShots: z.number().nullable().optional(),
  enableShots: z.number().nullable().optional(),
  lastChecked: z.string().optional(),
  nfts: z.array(NFTSchema).optional()
});

const StatusSchema = z.object({
  wallets: z.array(WalletSchema)
});

module.exports = { StatusSchema };
