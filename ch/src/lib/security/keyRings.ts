import { keyRingFromEnvironment } from "./aead";
const ring=(prefix:string,purpose:string)=>keyRingFromEnvironment({activeId:process.env[`${prefix}_KEY_ID`]||"dev-1",activeKey:process.env[`${prefix}_KEY_ACTIVE`],previousId:process.env[`${prefix}_KEY_PREVIOUS_ID`],previousKey:process.env[`${prefix}_KEY_PREVIOUS`],purpose});
export const getStoreKeyRing=()=>ring("CHITTERHAVEN_STORE","Haven encrypted stores");
export const getAuditKeyRing=()=>ring("CHITTERHAVEN_AUDIT","Haven audit storage");
export const getSessionKeyRing=()=>ring("CHITTERHAVEN_SESSION","Haven session cookies");
