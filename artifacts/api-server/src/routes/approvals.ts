import { Router } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db, approvalRequestsTable, approvalEventsTable, auditLogsTable, documentsTable } from "@workspace/db";
import { requireAuth, requireActionPermission } from "../lib/auth";

const router = Router();
router.use(requireAuth, requireActionPermission("approvals", "view", "read"));
const createSchema = z.object({ module:z.string().min(1), action:z.string().min(1), resourceType:z.string().min(1), resourceId:z.string().optional(), title:z.string().min(3), description:z.string().optional(), payload:z.record(z.unknown()).default({}), expiryHours:z.number().min(1).max(168).default(24) });

router.get("/", async (req,res) => {
  const status = String(req.query.status ?? "all");
  const rows = status === "all" ? await db.select().from(approvalRequestsTable).orderBy(desc(approvalRequestsTable.createdAt)).limit(250) : await db.select().from(approvalRequestsTable).where(eq(approvalRequestsTable.status,status)).orderBy(desc(approvalRequestsTable.createdAt)).limit(250);
  res.json(rows);
});
router.post("/", requireActionPermission("approvals","request"), async (req,res) => {
  const parsed=createSchema.safeParse(req.body); if(!parsed.success){res.status(400).json({error:parsed.error.issues[0]?.message});return;}
  const u=req.currentUser!; const token=randomBytes(18).toString("base64url"); const expiresAt=new Date(Date.now()+parsed.data.expiryHours*3600000);
  const [row]=await db.insert(approvalRequestsTable).values({...parsed.data, token, expiresAt, requestedById:u.id, requestedByEmail:u.email}).returning();
  await db.insert(approvalEventsTable).values({requestId:row.id,event:"requested",actorId:u.id,actorEmail:u.email});
  res.status(201).json(row);
});
async function review(req:any,res:any,status:"approved"|"rejected"|"returned") {
  const u=req.currentUser; const id=Number(req.params.id); const [current]=await db.select().from(approvalRequestsTable).where(eq(approvalRequestsTable.id,id)).limit(1);
  if(!current){res.status(404).json({error:"Not found"});return;} if(current.requestedById===u.id){res.status(403).json({error:"Self-approval is not allowed"});return;} if(current.status!=="pending"&&current.status!=="returned"){res.status(409).json({error:"Request is already closed"});return;} if(current.expiresAt<new Date()){res.status(410).json({error:"Approval token expired"});return;}
  const [updated]=await db.update(approvalRequestsTable).set({status,reviewedById:u.id,reviewedByEmail:u.email,reviewComment:req.body?.comment,reviewedAt:new Date(),updatedAt:new Date()}).where(eq(approvalRequestsTable.id,id)).returning();
  await db.insert(approvalEventsTable).values({requestId:id,event:status,actorId:u.id,actorEmail:u.email,comment:req.body?.comment});
  await db.insert(auditLogsTable).values({userEmail:u.email,userName:u.name,action:`Approval ${status}: ${current.title}`,module:"approvals",details:`Token ${current.token}`,severity:status==="rejected"?"warning":"info"});
  if (current.module === "documents" && current.action === "publish") {
    const documentStatus = status === "approved" ? "active" : status === "rejected" ? "rejected" : "pending_approval";
    await db.update(documentsTable).set({ status: documentStatus, updatedAt: new Date() }).where(eq(documentsTable.approvalRequestId, current.id));
  }
  res.json(updated);
}
router.post("/:id/approve",requireActionPermission("approvals","approve"),(req,res)=>review(req,res,"approved"));
router.post("/:id/reject",requireActionPermission("approvals","approve"),(req,res)=>review(req,res,"rejected"));
router.post("/:id/return",requireActionPermission("approvals","approve"),(req,res)=>review(req,res,"returned"));
router.get("/:id/events", async(req,res)=>res.json(await db.select().from(approvalEventsTable).where(eq(approvalEventsTable.requestId,Number(req.params.id))).orderBy(desc(approvalEventsTable.createdAt))));
export default router;
