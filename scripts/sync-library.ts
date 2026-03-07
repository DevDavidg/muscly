import { main } from "./sync-temas-to-neon";

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
