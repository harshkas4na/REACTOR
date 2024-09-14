import { z } from 'zod';

const contractSchema = z.object({
  eventFunctionPairs: z.array(
    z.object({
      event: z.string(),
      function: z.string(),
    })
  ),
});

export const validateContractInput = (input: any) => {
  return contractSchema.safeParse(input);
};