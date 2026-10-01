import { z } from "zod";

const schemaEnv = z.object({
  // URL pública da API (Render), chamada direto pelo navegador no cardápio e no checkout
  NEXT_PUBLIC_API_URL: z.string().url(),
});

export const env = schemaEnv.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
