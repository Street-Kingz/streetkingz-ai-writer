import app from "./app.js";
import { PORT } from "./config/index.js";
import { startWooMaintenance } from "./product-kernel/woocommerceMaintenance.js";

startWooMaintenance();
app.listen(PORT, () => {
  console.log(`Street Kingz AI writer service listening on port ${PORT}`);
});
