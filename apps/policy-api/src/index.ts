import { createPolicyChainGateway } from "./chain.ts";
import { parsePolicyApiConfig } from "./config.ts";
import { PolicyRepository } from "./repository.ts";
import { buildPolicyApi } from "./server.ts";
import { PolicyService } from "./service.ts";

const config = parsePolicyApiConfig(process.env);
const chain = await createPolicyChainGateway(config.rpcUrl);
const repository = new PolicyRepository(config.dbPath);
const app = buildPolicyApi(new PolicyService(repository, chain, config.encryptionKey));

app.addHook("onClose", async () => repository.close());
await app.listen({ host: config.host, port: config.port });
