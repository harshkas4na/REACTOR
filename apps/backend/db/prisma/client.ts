import { PrismaClient } from '@prisma/client';
import { generateFoundryDeployScript, generateReactiveSmartContractTemplate } from '../../controller/handleGenerate';

const prisma = new PrismaClient();

export const createContract = async (input: any) => {
  const contract = await prisma.contract.create({
    data: {
      originContractAddress: input.originContractAddress,
      destinationContractAddress: input.destinationContractAddress,
      eventFunctionPairs: input.eventFunctionPairs,
      reactiveSmartContractTemplate: generateReactiveSmartContractTemplate(input),
      foundryDeployScript: generateFoundryDeployScript(input),
    },
  });

  return contract;
};
