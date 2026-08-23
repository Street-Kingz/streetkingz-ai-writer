import { writePackage } from "../validation/v1-01/cataloguewide.js";
const p=writePackage();console.log(JSON.stringify({status:p.coverage.decision_gate,products:p.matrix.length,clusters:p.clusters.length,comparable_external:p.coverage.comparable_external_clusters}));
