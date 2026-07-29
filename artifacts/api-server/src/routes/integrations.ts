import { Router } from "express";
import { requireAuth, requireActionPermission } from "../lib/auth";
const router=Router(); router.use(requireAuth,requireActionPermission("integrations","view","read"));
const providers=[
 ["database","DATABASE_URL"],["openai","AI_INTEGRATIONS_OPENAI_API_KEY"],["sms","SMS_API_KEY"],["email","SMTP_HOST"],["meta","META_ACCESS_TOKEN"],["x","X_BEARER_TOKEN"],["whatsapp","WHATSAPP_ACCESS_TOKEN"],["mpesa","MPESA_CONSUMER_KEY"]
] as const;
router.get("/status",(_req,res)=>res.json(providers.map(([provider,key])=>({provider,configured:Boolean(process.env[key]),environmentKey:key,status:process.env[key]?"configured":"action_required"}))));
router.post("/test/:provider",requireActionPermission("integrations","test"),async(req,res)=>{const pair=providers.find(([p])=>p===req.params.provider);if(!pair){res.status(404).json({error:"Unknown provider"});return;} if(!process.env[pair[1]]){res.status(400).json({provider:pair[0],ok:false,error:`${pair[1]} is not configured`});return;} res.json({provider:pair[0],ok:true,message:"Configuration detected. Provider-specific live test should be enabled only with approved production credentials."});});
export default router;
