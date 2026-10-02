import { networkInterfaces } from "node:os";
import { loadConfig } from "./config.js";

const config = await loadConfig();
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((address) => address?.family === "IPv4" && !address.internal)
  .map((address) => `http://${address.address}:${config.port}`);

console.log("iPhone -> Windows Pano Koprusu");
console.log(`Dinleme adresi : ${config.host}:${config.port}`);
console.log(`Anahtar         : ${config.token}`);
console.log(`Yapilandirma    : ${config.configPath}`);
console.log("LAN adaylari:");
for (const address of lanAddresses) {
  console.log(`  ${address}`);
}
