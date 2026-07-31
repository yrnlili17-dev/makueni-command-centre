# Makueni Command Centre Audit
Generated: 2026-07-30T17:52:08.535Z
## Summary
- Frontend files scanned: 103
- Backend files scanned: 47
- Pages found: 38
- Frontend routes found: 39
- Navigation paths found: 1
- Frontend API calls found: 30
- Backend route definitions found: 181
- Total findings: 223
- High priority: 15
- Medium priority: 208
- Low priority: 0
## Findings
### 1. [HIGH] non-clickable-button
- File: `artifacts/commandcentre/src/components/layout.tsx:199`
- Issue: Button has no onClick handler and is not a submit button.
- Evidence: `<button className="touch-target grid place-items-center" aria-label="Notifications">`
### 2. [HIGH] non-clickable-button-component
- File: `artifacts/commandcentre/src/components/ui/calendar.tsx:189`
- Issue: Button component has no onClick, asChild, submit behavior, or disabled state.
- Evidence: `<Button ref={ref} variant="ghost" size="icon" data-day={day.date.toLocaleDateString()} data-selected-single={ modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle } data-range-s`
### 3. [HIGH] non-clickable-button-component
- File: `artifacts/commandcentre/src/components/ui/input-group.tsx:107`
- Issue: Button component has no onClick, asChild, submit behavior, or disabled state.
- Evidence: `<Button type={type} data-size={size} variant={variant} className={cn(inputGroupButtonVariants({ size }), className)} {...props} />`
### 4. [HIGH] non-clickable-button
- File: `artifacts/commandcentre/src/pages/communications-hub.tsx:4`
- Issue: Button has no onClick handler and is not a submit button.
- Evidence: `<button className="bg-primary text-primary-foreground px-4 py-2 flex gap-2 text-xs font-mono">`
### 5. [HIGH] non-clickable-button
- File: `artifacts/commandcentre/src/pages/election-day.tsx:690`
- Issue: Button has no onClick handler and is not a submit button.
- Evidence: `<button className="w-full border border-primary text-primary font-mono text-xs tracking-widest py-3 hover:bg-primary hover:text-white transition-colors">`
### 6. [HIGH] non-clickable-button-component
- File: `artifacts/commandcentre/src/pages/election-war-room.tsx:196`
- Issue: Button component has no onClick, asChild, submit behavior, or disabled state.
- Evidence: `<Button>`
### 7. [HIGH] non-clickable-button
- File: `artifacts/commandcentre/src/pages/gis-centre.tsx:3`
- Issue: Button has no onClick handler and is not a submit button.
- Evidence: `<button key={w} className="text-left border border-border p-3 hover:border-primary hover:bg-primary/5">`
### 8. [HIGH] non-clickable-button
- File: `artifacts/commandcentre/src/pages/gis-intelligence.tsx:161`
- Issue: Button has no onClick handler and is not a submit button.
- Evidence: `<button type="button" key={\`${row.constituency}-${row.ward}\`} className="group relative overflow-hidden rounded-md border p-4 text-left transition hover:border-primary/50 hover:bg-primary/5" >`
### 9. [HIGH] non-clickable-button
- File: `artifacts/commandcentre/src/pages/governance.tsx:137`
- Issue: Button has no onClick handler and is not a submit button.
- Evidence: `<button className="bg-primary px-4 font-mono text-xs text-primary-foreground">`
### 10. [HIGH] non-clickable-button
- File: `artifacts/commandcentre/src/pages/operations-hub.tsx:10`
- Issue: Button has no onClick handler and is not a submit button.
- Evidence: `<button className="bg-primary text-primary-foreground px-4 flex items-center gap-2 text-xs font-mono">`
### 11. [HIGH] non-clickable-button-component
- File: `artifacts/commandcentre/src/pages/public-campaign.tsx:50`
- Issue: Button component has no onClick, asChild, submit behavior, or disabled state.
- Evidence: `<Button size="lg">`
### 12. [HIGH] non-clickable-button-component
- File: `artifacts/commandcentre/src/pages/public-campaign.tsx:51`
- Issue: Button component has no onClick, asChild, submit behavior, or disabled state.
- Evidence: `<Button size="lg" variant="outline">`
### 13. [HIGH] non-clickable-button-component
- File: `artifacts/commandcentre/src/pages/public-campaign.tsx:85`
- Issue: Button component has no onClick, asChild, submit behavior, or disabled state.
- Evidence: `<Button className="mt-7" size="lg">`
### 14. [HIGH] non-clickable-button
- File: `artifacts/commandcentre/src/pages/reports-hub.tsx:4`
- Issue: Button has no onClick handler and is not a submit button.
- Evidence: `<button className="bg-primary text-primary-foreground px-4 flex gap-2 items-center text-xs font-mono">`
### 15. [HIGH] non-clickable-button
- File: `artifacts/commandcentre/src/pages/reports-hub.tsx:4`
- Issue: Button has no onClick handler and is not a submit button.
- Evidence: `<button className="border border-border p-2" title="Export when report is ready">`
### 16. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/components/ai-assist-panel.tsx:370`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="Ask Smart Assist…"`
### 17. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/components/ai-assist-panel.tsx:371`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `className="max-h-28 min-h-11 flex-1 resize-none overflow-y-auto border border-border bg-secondary px-3 py-3 font-mono text-[12px] outline-none placeholder:text-muted-foreground/60 focus:border-primary disabled:opacity-50`
### 18. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/components/ui/command.tsx:47`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `"flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",`
### 19. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/components/ui/input.tsx:11`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `"flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-f`
### 20. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/components/ui/select.tsx:22`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `"flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none`
### 21. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/components/ui/textarea.tsx:12`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `"flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cur`
### 22. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/admin.tsx:341`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={inviteForm.name ?? ""} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. John Mutua Kioko" className="w-full bg-secondary border border-border px-3 py-2 font-mono text-x`
### 23. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/admin.tsx:345`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input type="email" value={inviteForm.email ?? ""} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="e.g. john@kaloki2027.ke" className="w-full bg-secondary border border-border px-3 py-2`
### 24. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/admin.tsx:349`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={inviteForm.phone ?? ""} onChange={e => setInviteForm(p => ({ ...p, phone: e.target.value }))} placeholder="+254 7XX XXX XXX" className="w-full bg-secondary border border-border px-3 py-2 font-mono text-xs f`
### 25. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/admin.tsx:360`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={inviteForm.notes ?? ""} onChange={e => setInviteForm(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Wote Ward Field Coordinator" className="w-full bg-secondary border border-border px-3 py-2 fon`
### 26. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/admin.tsx:408`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users by name, email or role…" className="bg-transparent font-mono text-xs focus:outline-none flex-1" />`
### 27. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/admin.tsx:432`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={editUserForm.name ?? ""} onChange={e => setEditUserForm(p => ({ ...p, name: e.target.value }))} placeholder="Name" className="col-span-2 bg-secondary border border-border px-2 py-1.5 font-mono text-xs focus`
### 28. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/admin.tsx:433`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={editUserForm.phone ?? ""} onChange={e => setEditUserForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="bg-secondary border border-border px-2 py-1.5 font-mono text-xs focus:outline`
### 29. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/admin.tsx:440`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={editUserForm.notes ?? ""} onChange={e => setEditUserForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes / department…" className="col-span-3 bg-secondary border border-border px-2 py-1.5 font-m`
### 30. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/admin.tsx:535`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={roleForm.name ?? ""} onChange={e => setRoleForm((p: any) => ({ ...p, name: e.target.value }))} placeholder="e.g. ward-coordinator" className="w-full bg-secondary border border-border px-3 py-2 font-mono tex`
### 31. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/admin.tsx:539`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={roleForm.description ?? ""} onChange={e => setRoleForm((p: any) => ({ ...p, description: e.target.value }))} placeholder="Who this role is for…" className="w-full bg-secondary border border-border px-3 py-2`
### 32. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/campaign-plan.tsx:865`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={editForm.owner ?? ""} onChange={e => setEditForm(p => ({ ...p, owner: e.target.value }))} placeholder="Owner" className="bg-card border border-border px-2 py-1.5 font-mono text-xs focus:outline-none focus:b`
### 33. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/campaign-plan.tsx:867`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={editForm.description ?? ""} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" className="w-full bg-card border border-border px-2 py-1.5 font-mono text-xs f`
### 34. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/campaign-plan.tsx:869`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={editForm.notes ?? ""} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes" className="bg-card border border-border px-2 py-1.5 font-mono text-xs focus:outline-none focus:b`
### 35. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/campaign-plan.tsx:1059`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={readinessForm.item} onChange={e => setReadinessForm(p => ({ ...p, item: e.target.value }))} placeholder="Checklist item description…" className="w-full bg-secondary border border-border px-3 py-2 font-mono `
### 36. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/campaign-plan.tsx:1115`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="Add note…"`
### 37. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/campaign-plan.tsx:1117`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `className="mt-0.5 w-full bg-transparent font-mono text-[9px] text-transparent placeholder:text-muted-foreground/30 group-hover:placeholder:text-muted-foreground/60 italic focus:outline-none focus:text-foreground border-b`
### 38. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/campaign-plan.tsx:1117`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `className="mt-0.5 w-full bg-transparent font-mono text-[9px] text-transparent placeholder:text-muted-foreground/30 group-hover:placeholder:text-muted-foreground/60 italic focus:outline-none focus:text-foreground border-b`
### 39. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/communications-hub.tsx:4`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `export default function CommunicationsHub(){const [briefs,setBriefs]=useState<any[]>([]),[title,setTitle]=useState(''),[summary,setSummary]=useState('');const load=()=>api('/briefs').then(setBriefs);useEffect(()=>{load()`
### 40. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/communications-hub.tsx:4`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `export default function CommunicationsHub(){const [briefs,setBriefs]=useState<any[]>([]),[title,setTitle]=useState(''),[summary,setSummary]=useState('');const load=()=>api('/briefs').then(setBriefs);useEffect(()=>{load()`
### 41. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:543`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={recordForm.title ?? ""} onChange={e => setRecordForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. National Cohesion and Integration (Amendment) Bill, 2024" className="w-full bg-secondary borde`
### 42. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:569`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<textarea rows={2} value={recordForm.description ?? ""} onChange={e => setRecordForm(p => ({ ...p, description: e.target.value }))} placeholder="What the bill/motion/petition covers…" className="w-full bg-secondary borde`
### 43. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:573`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={recordForm.impact ?? ""} onChange={e => setRecordForm(p => ({ ...p, impact: e.target.value }))} placeholder="What change this achieves for constituents…" className="w-full bg-secondary border border-border `
### 44. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:577`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={recordForm.beneficiaries ?? ""} onChange={e => setRecordForm(p => ({ ...p, beneficiaries: e.target.value }))} placeholder="e.g. 50,000 farmers in Makueni" className="w-full bg-secondary border border-border`
### 45. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:581`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={recordForm.session ?? ""} onChange={e => setRecordForm(p => ({ ...p, session: e.target.value }))} placeholder="e.g. 13th Parliament, 1st Session" className="w-full bg-secondary border border-border px-3 py-`
### 46. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:585`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={(recordForm.evidenceLinks ?? []).join(", ")} onChange={e => setRecordForm(p => ({ ...p, evidenceLinks: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) }))} placeholder="Hansard URL, G`
### 47. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:640`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<div className="col-span-2"><input value={editRecordForm.impact ?? ""} onChange={e => setEditRecordForm(p => ({ ...p, impact: e.target.value }))} placeholder="Impact…" className="w-full bg-secondary border border-border `
### 48. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:641`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={editRecordForm.beneficiaries ?? ""} onChange={e => setEditRecordForm(p => ({ ...p, beneficiaries: e.target.value }))} placeholder="Beneficiaries…" className="bg-secondary border border-border px-2 py-1.5 fo`
### 49. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:727`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={achForm.title ?? ""} onChange={e => setAchForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Wote–Mavindini Road Tarmacking, Phase 1" className="w-full bg-secondary border border-border px-3 py`
### 50. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:731`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={achForm.year ?? ""} onChange={e => setAchForm(p => ({ ...p, year: e.target.value }))} placeholder="2024" className="w-full bg-secondary border border-border px-3 py-2 font-mono text-xs focus:outline-none fo`
### 51. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:754`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<textarea rows={2} value={achForm.description ?? ""} onChange={e => setAchForm(p => ({ ...p, description: e.target.value }))} placeholder="Detailed description of the project or achievement…" className="w-full bg-seconda`
### 52. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:758`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={achForm.impactMetric ?? ""} onChange={e => setAchForm(p => ({ ...p, impactMetric: e.target.value }))} placeholder="e.g. households connected" className="w-full bg-secondary border border-border px-3 py-2 fo`
### 53. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:762`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={achForm.impactValue ?? ""} onChange={e => setAchForm(p => ({ ...p, impactValue: e.target.value }))} placeholder="e.g. 1,200" className="w-full bg-secondary border border-border px-3 py-2 font-mono text-xs f`
### 54. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:766`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={achForm.budget ?? ""} onChange={e => setAchForm(p => ({ ...p, budget: e.target.value }))} placeholder="e.g. 45,000,000" className="w-full bg-secondary border border-border px-3 py-2 font-mono text-xs focus:`
### 55. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:770`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={achForm.fundingSource ?? ""} onChange={e => setAchForm(p => ({ ...p, fundingSource: e.target.value }))} placeholder="e.g. NG-CDF, National Government, County" className="w-full bg-secondary border border-bo`
### 56. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:774`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={(achForm.partnerAgencies ?? []).join(", ")} onChange={e => setAchForm(p => ({ ...p, partnerAgencies: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) }))} placeholder="e.g. KeNHA, Mini`
### 57. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:823`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={editAchForm.impactValue ?? ""} onChange={e => setEditAchForm(p => ({ ...p, impactValue: e.target.value }))} placeholder="Impact value…" className="bg-secondary border border-border px-2 py-1.5 font-mono tex`
### 58. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:824`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={editAchForm.impactMetric ?? ""} onChange={e => setEditAchForm(p => ({ ...p, impactMetric: e.target.value }))} placeholder="Impact metric…" className="bg-secondary border border-border px-2 py-1.5 font-mono `
### 59. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/credentials.tsx:909`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="e.g. What legislation can improve water access in rural Makueni?"`
### 60. [MEDIUM] static-dashboard-card
- File: `artifacts/commandcentre/src/pages/dashboard.tsx:78`
- Issue: StatCard is display-only and has no navigation destination.
- Evidence: `<StatCard label="TOTAL MEMBERS" value={summary.totalMembers.toLocaleString()} icon={Users} sub="IDENTITY GRAPH" />`
### 61. [MEDIUM] static-dashboard-card
- File: `artifacts/commandcentre/src/pages/dashboard.tsx:79`
- Issue: StatCard is display-only and has no navigation destination.
- Evidence: `<StatCard label="ACTIVE VOLUNTEERS" value={summary.activeVolunteers} icon={Activity} sub="DEPLOYED" />`
### 62. [MEDIUM] static-dashboard-card
- File: `artifacts/commandcentre/src/pages/dashboard.tsx:80`
- Issue: StatCard is display-only and has no navigation destination.
- Evidence: `<StatCard label="MESSAGES SENT" value={summary.messagesSent.toLocaleString()} icon={MessageSquare} sub="ALL CHANNELS" />`
### 63. [MEDIUM] static-dashboard-card
- File: `artifacts/commandcentre/src/pages/dashboard.tsx:81`
- Issue: StatCard is display-only and has no navigation destination.
- Evidence: `<StatCard label="DOORS KNOCKED" value={summary.doorsKnocked.toLocaleString()} icon={Map} sub="FIELD OPS" />`
### 64. [MEDIUM] static-dashboard-card
- File: `artifacts/commandcentre/src/pages/dashboard.tsx:82`
- Issue: StatCard is display-only and has no navigation destination.
- Evidence: `<StatCard label="WARDS COVERED" value={summary.wardsCovered} icon={TrendingUp} sub="ACTIVE ZONES" />`
### 65. [MEDIUM] static-dashboard-card
- File: `artifacts/commandcentre/src/pages/dashboard.tsx:83`
- Issue: StatCard is display-only and has no navigation destination.
- Evidence: `<StatCard label="OPEN THREATS" value={summary.openThreats} icon={ShieldAlert} sub="NARRATIVE" />`
### 66. [MEDIUM] static-dashboard-card
- File: `artifacts/commandcentre/src/pages/dashboard.tsx:84`
- Issue: StatCard is display-only and has no navigation destination.
- Evidence: `<StatCard label="READINESS SCORE" value={\`${summary.campaignReadiness}%\`} icon={Target} sub="OVERALL" />`
### 67. [MEDIUM] static-dashboard-card
- File: `artifacts/commandcentre/src/pages/dashboard.tsx:85`
- Issue: StatCard is display-only and has no navigation destination.
- Evidence: `<StatCard label="UPCOMING EVENTS" value={summary.upcomingEvents} icon={Calendar} sub="SCHEDULED" />`
### 68. [MEDIUM] hard-coded-status
- File: `artifacts/commandcentre/src/pages/dashboard.tsx:245`
- Issue: Operational system status appears hard-coded rather than health-check driven.
- Evidence: `{ label: "IDENTITY_GRAPH", status: "OPERATIONAL" },`
### 69. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/election-day.tsx:256`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="0"`
### 70. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/election-day.tsx:284`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="Agent name"`
### 71. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/election-day.tsx:427`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input required placeholder="Event title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full bg-secondary border border-border px-3 py-2 font-mono text-xs focus:outline-n`
### 72. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/election-day.tsx:428`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<textarea required rows={2} placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="w-full bg-secondary border border-border px-3 py-2 font-mono`
### 73. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/election-war-room.tsx:274`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="Search polling station, ward or constituency"`
### 74. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/field-ops.tsx:269`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input required value={sessionForm.name ?? ""} onChange={e => setSessionForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Wote Market Friday Baraza" className="w-full bg-secondary border border-border px-3 p`
### 75. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/field-ops.tsx:281`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={sessionForm.notes ?? ""} onChange={e => setSessionForm(p => ({ ...p, notes: e.target.value }))} placeholder="Objectives, location, intelligence notes…" className="w-full bg-secondary border border-border px`
### 76. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/field-ops.tsx:435`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={visitForm.notes ?? ""} onChange={e => setVisitForm(p => ({ ...p, notes: e.target.value }))} placeholder="Concerns raised, commitments made, follow-up needed…" className="w-full bg-card border border-border `
### 77. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:161`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="Search donors…"`
### 78. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:184`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="FULL NAME" required placeholder="Hon. James Mutua" value={form.name ?? ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />`
### 79. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:186`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="PHONE" placeholder="0712 345 678" value={form.phone ?? ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />`
### 80. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:187`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="EMAIL" type="email" placeholder="donor@email.com" value={form.email ?? ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />`
### 81. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:206`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="NOTES" placeholder="Key relationship notes" value={form.notes ?? ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />`
### 82. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:207`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="TAGS" placeholder="elder, businessman, diaspora-nairobi" value={form.tags ?? ""} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />`
### 83. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:330`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={donorSearch} onChange={e => setDonorSearch(e.target.value)} placeholder="Search donor…" className="bg-secondary border border-border pl-8 pr-3 py-1.5 font-mono text-xs focus:outline-none focus:border-primar`
### 84. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:352`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="DONOR NAME" required placeholder="Hon. James Mutua" value={form.donorName ?? ""} onChange={e => setForm(p => ({ ...p, donorName: e.target.value }))} />`
### 85. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:353`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="AMOUNT (KES)" required type="number" min={1} placeholder="50000" value={form.amount ?? ""} onChange={e => setForm(p => ({ ...p, amount: parseInt(e.target.value) }))} />`
### 86. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:369`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="REFERENCE / M-PESA CODE" placeholder="QGT7X3KP0N" value={form.reference ?? ""} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} />`
### 87. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:371`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="NOTES" placeholder="Diaspora fundraiser dinner pledge" value={form.notes ?? ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />`
### 88. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:457`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<div className="col-span-2"><Input label="CAMPAIGN NAME" required placeholder="Nairobi Diaspora Fundraiser" value={form.name ?? ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>`
### 89. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:458`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="TARGET (KES)" type="number" min={0} placeholder="500000" value={form.goalAmount ?? ""} onChange={e => setForm(p => ({ ...p, goalAmount: parseInt(e.target.value) }))} />`
### 90. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:459`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="DESCRIPTION" placeholder="Brief objective" value={form.description ?? ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />`
### 91. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:564`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="DONOR NAME" required placeholder="Hon. James Mutua" value={form.donorName ?? ""} onChange={e => setForm(p => ({ ...p, donorName: e.target.value }))} />`
### 92. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:565`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="AMOUNT (KES)" required type="number" min={1} placeholder="100000" value={form.amount ?? ""} onChange={e => setForm(p => ({ ...p, amount: parseInt(e.target.value) }))} />`
### 93. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:575`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="NOTES" placeholder="Commitment details" value={form.notes ?? ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />`
### 94. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:930`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="PAYBILL NUMBER" value={mpesa.paybill} onChange={e => setMpesa(p => ({ ...p, paybill: e.target.value }))} placeholder="123456" />`
### 95. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:931`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="ACCOUNT NUMBER" value={mpesa.account} onChange={e => setMpesa(p => ({ ...p, account: e.target.value }))} placeholder="KALOKI2027" />`
### 96. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:932`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="SHORTCODE (TILL)" value={mpesa.shortcode} onChange={e => setMpesa(p => ({ ...p, shortcode: e.target.value }))} placeholder="400200" />`
### 97. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:933`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="TILL NUMBER (OPTIONAL)" value={mpesa.tillNumber} onChange={e => setMpesa(p => ({ ...p, tillNumber: e.target.value }))} placeholder="—" />`
### 98. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:946`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="BANK NAME" value={bank.bank} onChange={e => setBank(p => ({ ...p, bank: e.target.value }))} placeholder="Kenya Commercial Bank" />`
### 99. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:947`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="BRANCH" value={bank.branch} onChange={e => setBank(p => ({ ...p, branch: e.target.value }))} placeholder="Wote Branch" />`
### 100. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:948`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="ACCOUNT NUMBER" value={bank.account} onChange={e => setBank(p => ({ ...p, account: e.target.value }))} placeholder="1234567890" />`
### 101. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:949`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="SWIFT CODE" value={bank.swift} onChange={e => setBank(p => ({ ...p, swift: e.target.value }))} placeholder="KCBLKENX" />`
### 102. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:959`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="PAYPAL EMAIL" placeholder="fundraising@kaloki2027.ke" />`
### 103. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:960`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="WESTERN UNION REFERENCE" placeholder="KALOKI2027 KE" />`
### 104. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:1093`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="PHONE NUMBER" required placeholder="07XXXXXXXX" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />`
### 105. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:1094`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="AMOUNT (KES)" required type="number" min={1} placeholder="1000" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />`
### 106. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/fundraising.tsx:1095`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="DONOR NAME (OPTIONAL)" placeholder="Jane Mwikali" value={form.donorName} onChange={e => setForm(p => ({ ...p, donorName: e.target.value }))} />`
### 107. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/gis-intelligence.tsx:147`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="Search ward or constituency"`
### 108. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/governance.tsx:136`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<div className="flex flex-wrap gap-2"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} `
### 109. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/governance.tsx:137`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `{showFolder && <form onSubmit={createFolder} className="flex gap-2 border border-border bg-card p-3"><input autoFocus value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Folder name" className`
### 110. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/governance.tsx:138`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `{showUpload && <form onSubmit={uploadDocument} className="grid gap-3 border border-primary/30 bg-card p-4 md:grid-cols-2"><input type="file" required onChange={(e) => setFile(e.target.files?.[0] || null)} className="md:c`
### 111. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/governance.tsx:138`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `{showUpload && <form onSubmit={uploadDocument} className="grid gap-3 border border-primary/30 bg-card p-4 md:grid-cols-2"><input type="file" required onChange={(e) => setFile(e.target.files?.[0] || null)} className="md:c`
### 112. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/governance.tsx:138`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `{showUpload && <form onSubmit={uploadDocument} className="grid gap-3 border border-primary/30 bg-card p-4 md:grid-cols-2"><input type="file" required onChange={(e) => setFile(e.target.files?.[0] || null)} className="md:c`
### 113. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:633`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="REJECTION REASON…"`
### 114. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:741`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="@handle · Twitter/X · WhatsApp group · etc."`
### 115. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:752`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="Paste the attack, claim, or negative social media post here…"`
### 116. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:957`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `{ key: "bearerToken", label: "BEARER TOKEN", placeholder: "AAAA…" },`
### 117. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:958`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `{ key: "apiKey", label: "API KEY (v2)", placeholder: "Your API key" },`
### 118. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:959`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `{ key: "apiSecret", label: "API SECRET", placeholder: "Your API secret" },`
### 119. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:966`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `{ key: "accessToken", label: "PAGE ACCESS TOKEN", placeholder: "EAA…" },`
### 120. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:967`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `{ key: "pageId", label: "PAGE ID", placeholder: "Your Facebook Page ID" },`
### 121. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:968`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `{ key: "apiKey", label: "APP ID", placeholder: "Meta App ID" },`
### 122. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:969`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `{ key: "apiSecret", label: "APP SECRET", placeholder: "Meta App Secret" },`
### 123. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:976`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `{ key: "rssUrl", label: "GOOGLE ALERTS RSS URL", placeholder: "https://www.google.com/alerts/feeds/…" },`
### 124. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:983`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `{ key: "rssUrl", label: "RSS FEED URL", placeholder: "https://www.nation.co.ke/rss or custom feed" },`
### 125. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:990`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `{ key: "accessToken", label: "ACCESS TOKEN", placeholder: "TikTok Developer Access Token" },`
### 126. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:991`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `{ key: "apiKey", label: "CLIENT KEY", placeholder: "TikTok Client Key" },`
### 127. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:1019`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder={f.placeholder}`
### 128. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:1019`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder={f.placeholder}`
### 129. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/intelligence.tsx:1160`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<div className="space-y-1"><label className="text-[10px] font-mono text-muted-foreground">CATEGORY *</label><input required value={briefForm.category ?? ""} onChange={e => setBriefForm(p => ({ ...p, category: e.target.va`
### 130. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/kol.tsx:93`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={form.handle ?? ""} onChange={e => setForm(p => ({ ...p, handle: e.target.value }))} placeholder="@handle" className="w-full bg-secondary border border-border px-3 py-2 font-mono text-xs focus:outline-none f`
### 131. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/login.tsx:67`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="username or id@campaign.org"`
### 132. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/login.tsx:80`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="••••••••••••"`
### 133. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/members.tsx:99`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={search} onChange={e => setSearch(e.target.value)} placeholder="SEARCH CONTACTS..." className="w-full bg-card border border-border pl-8 pr-3 py-2 font-mono text-xs focus:outline-none focus:border-primary" />`
### 134. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:150`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="API KEY" required type="password" placeholder="AT_API_KEY_..." value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />`
### 135. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:151`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="USERNAME" required placeholder="sandbox or your username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />`
### 136. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:153`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="SENDER ID (SHORTCODE / ALPHANUMERIC)" placeholder="e.g. KALOKI or 40100" value={form.senderId} onChange={e => setForm(p => ({ ...p, senderId: e.target.value }))} />`
### 137. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:161`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="ACCOUNT SID" required type="password" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />`
### 138. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:162`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="AUTH TOKEN" required type="password" placeholder="your_auth_token" value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />`
### 139. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:164`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="FROM PHONE NUMBER" placeholder="+12065550100" value={form.senderId} onChange={e => setForm(p => ({ ...p, senderId: e.target.value }))} />`
### 140. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:171`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="API KEY" required type="password" placeholder="App xxxxxxxxxxxx" value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />`
### 141. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:172`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="BASE URL" placeholder="xxxxx.api.infobip.com" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />`
### 142. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:174`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="SENDER NAME / NUMBER" placeholder="KALOKI2027" value={form.senderId} onChange={e => setForm(p => ({ ...p, senderId: e.target.value }))} />`
### 143. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:268`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="PERMANENT ACCESS TOKEN" required type="password" placeholder="EAAxxxxxxxxxxxxxxxx..." value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />`
### 144. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:271`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="PHONE NUMBER ID" required placeholder="123456789012345" value={form.phoneNumberId} onChange={e => setForm(p => ({ ...p, phoneNumberId: e.target.value }))} />`
### 145. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:272`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="WHATSAPP BUSINESS ACCOUNT ID" required placeholder="123456789012345" value={form.businessAccountId} onChange={e => setForm(p => ({ ...p, businessAccountId: e.target.value }))} />`
### 146. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:274`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="DISPLAY PHONE NUMBER" placeholder="+254712345678" value={form.phoneNumber} onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))} />`
### 147. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:281`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="API KEY" required type="password" placeholder="AT_API_KEY_..." value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />`
### 148. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:282`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="USERNAME" required placeholder="your_at_username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />`
### 149. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:284`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="SENDER ID / PHONE" placeholder="+254712345678" value={form.senderId} onChange={e => setForm(p => ({ ...p, senderId: e.target.value }))} />`
### 150. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:291`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="ACCOUNT SID" required type="password" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />`
### 151. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:292`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="AUTH TOKEN" required type="password" placeholder="your_auth_token" value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />`
### 152. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:294`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="WHATSAPP FROM NUMBER (with whatsapp: prefix)" placeholder="whatsapp:+14155238886" value={form.phoneNumber} onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))} />`
### 153. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:390`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="API KEY" required type="password" placeholder={providerVal === "sendgrid" ? "SG.xxxxxxxx..." : "AKIA..."} value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />`
### 154. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:393`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="AWS SECRET KEY" required type="password" placeholder="aws_secret_access_key" value={form.apiSecret} onChange={e => setForm(p => ({ ...p, apiSecret: e.target.value }))} />`
### 155. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:395`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="FROM EMAIL" required type="email" placeholder="campaign@kaloki2027.ke" value={form.fromEmail} onChange={e => setForm(p => ({ ...p, fromEmail: e.target.value }))} />`
### 156. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:396`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="FROM NAME" placeholder="Prof. Philip Kaloki Campaign" value={form.fromName} onChange={e => setForm(p => ({ ...p, fromName: e.target.value }))} />`
### 157. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:403`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="MANDRILL / MAILCHIMP API KEY" required type="password" placeholder="md-xxxxxxxxxxxxxxxxxxxxxxxx" value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />`
### 158. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:405`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="FROM EMAIL" required type="email" placeholder="campaign@kaloki2027.ke" value={form.fromEmail} onChange={e => setForm(p => ({ ...p, fromEmail: e.target.value }))} />`
### 159. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:406`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="FROM NAME" placeholder="Prof. Philip Kaloki Campaign" value={form.fromName} onChange={e => setForm(p => ({ ...p, fromName: e.target.value }))} />`
### 160. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:412`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="SMTP HOST" required placeholder="smtp.gmail.com" value={form.smtpHost} onChange={e => setForm(p => ({ ...p, smtpHost: e.target.value }))} />`
### 161. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:413`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="PORT" required placeholder="587" value={form.smtpPort} onChange={e => setForm(p => ({ ...p, smtpPort: e.target.value }))} />`
### 162. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:414`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="SMTP USERNAME" required placeholder="campaign@kaloki2027.ke" value={form.smtpUser} onChange={e => setForm(p => ({ ...p, smtpUser: e.target.value }))} />`
### 163. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:415`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="SMTP PASSWORD" required type="password" placeholder="app_password_here" value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} />`
### 164. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:416`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="FROM EMAIL" required type="email" placeholder="campaign@kaloki2027.ke" value={form.fromEmail} onChange={e => setForm(p => ({ ...p, fromEmail: e.target.value }))} />`
### 165. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:417`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<FieldInput label="FROM NAME" placeholder="Prof. Philip Kaloki Campaign" value={form.fromName} onChange={e => setForm(p => ({ ...p, fromName: e.target.value }))} />`
### 166. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/messaging.tsx:509`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder={channel === "email" ? "Email body (HTML supported)..." : channel === "whatsapp" ? "WhatsApp message (supports *bold*, _italic_, ~strikethrough~)..." : "SMS message (max 160 chars for 1 part)..."}`
### 167. [MEDIUM] possibly-unregistered-page
- File: `artifacts/commandcentre/src/pages/not-found.tsx:1`
- Issue: Page may not have a matching registered route: /not-found, /not-found
### 168. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/operations-hub.tsx:10`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<form onSubmit={add} className="bg-card border border-border p-4 flex gap-2"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Create a field task..." className="flex-1 bg-background border border-`
### 169. [MEDIUM] possibly-unregistered-page
- File: `artifacts/commandcentre/src/pages/public-campaign.tsx:1`
- Issue: Page may not have a matching registered route: /public-campaign, /public-campaign
### 170. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/reports-hub.tsx:4`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `export default function ReportsHub(){const [rows,setRows]=useState<any[]>([]),[title,setTitle]=useState('');const load=()=>api('/reports').then(setRows);useEffect(()=>{load()},[]);const add=async(e:FormEvent)=>{e.prevent`
### 171. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/segments.tsx:272`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input type="number" value={form._manualSize ?? ""} onChange={e => setForm(p => ({ ...p, _manualSize: e.target.value }))} placeholder="Auto-calculated if blank" className="w-full bg-secondary border border-border px-3 py`
### 172. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/smart-assist.tsx:51`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<div className="flex flex-col sm:flex-row gap-2"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder="Search candidate, ward, issue or opponent..." className="`
### 173. [MEDIUM] static-dashboard-card
- File: `artifacts/commandcentre/src/pages/social-listening.tsx:112`
- Issue: StatCard is display-only and has no navigation destination.
- Evidence: `<StatCard label="TOTAL MENTIONS" value={counts.total} tone="text-foreground" />`
### 174. [MEDIUM] static-dashboard-card
- File: `artifacts/commandcentre/src/pages/social-listening.tsx:113`
- Issue: StatCard is display-only and has no navigation destination.
- Evidence: `<StatCard label="POSITIVE" value={counts.positive} tone="text-green-400" />`
### 175. [MEDIUM] static-dashboard-card
- File: `artifacts/commandcentre/src/pages/social-listening.tsx:114`
- Issue: StatCard is display-only and has no navigation destination.
- Evidence: `<StatCard label="NEGATIVE" value={counts.negative} tone="text-red-400" />`
### 176. [MEDIUM] static-dashboard-card
- File: `artifacts/commandcentre/src/pages/social-listening.tsx:115`
- Issue: StatCard is display-only and has no navigation destination.
- Evidence: `<StatCard label="NEUTRAL" value={counts.neutral} tone="text-yellow-400" />`
### 177. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/speeches.tsx:244`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. youth, farmers, church congregation" className={inputCls} />`
### 178. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/speeches.tsx:275`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="Bullet the specific promises, achievements or themes to include..."`
### 179. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/speeches.tsx:318`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="Any specific issues to emphasize across the manifesto..."`
### 180. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/strategist.tsx:332`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="Ask your Chief Strategist anything about the campaign..."`
### 181. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/strategist.tsx:335`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `className="flex-1 resize-none rounded-lg border border-border/60 bg-card/50 px-4 py-3 text-sm focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/60"`
### 182. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/surveys.tsx:277`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={pollForm.title ?? ""} onChange={e => setPollForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Which development project should be prioritised?" className="w-full bg-secondary border border-bor`
### 183. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/surveys.tsx:298`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={pollForm.description ?? ""} onChange={e => setPollForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional context for respondents" className="w-full bg-secondary border border-border px-3 `
### 184. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/surveys.tsx:311`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder={\`Option ${idx + 1}…\`}`
### 185. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/surveys.tsx:388`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input placeholder="RESPONDENT NAME (optional)" value={voteForm.respondentName ?? ""} onChange={e => setVoteForm(p => ({ ...p, respondentName: e.target.value }))} className="bg-secondary border border-border px-2 py-1.5 `
### 186. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/surveys.tsx:489`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={issueForm.title ?? ""} onChange={e => setIssueForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Wote–Mavindini road impassable during rains" className="w-full bg-secondary border border-border`
### 187. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/surveys.tsx:512`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input type="number" value={issueForm.affectedPopulation ?? ""} onChange={e => setIssueForm(p => ({ ...p, affectedPopulation: e.target.value }))} placeholder="Est. number of residents" className="w-full bg-secondary bord`
### 188. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/surveys.tsx:516`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={issueForm.reportedBy ?? ""} onChange={e => setIssueForm(p => ({ ...p, reportedBy: e.target.value }))} placeholder="Field agent / source" className="w-full bg-secondary border border-border px-3 py-2 font-mo`
### 189. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/surveys.tsx:520`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<textarea value={issueForm.description ?? ""} onChange={e => setIssueForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Full description of the issue, background, and impact…" className="w-full bg-`
### 190. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/surveys.tsx:620`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input placeholder="AGENT NAME" value={reportForm.reportedBy ?? ""} onChange={e => setReportForm(p => ({ ...p, reportedBy: e.target.value }))} className="bg-card border border-border px-2 py-1.5 font-mono text-[10px] foc`
### 191. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/surveys.tsx:621`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input placeholder="LOCATION" value={reportForm.location ?? ""} onChange={e => setReportForm(p => ({ ...p, location: e.target.value }))} className="bg-card border border-border px-2 py-1.5 font-mono text-[10px] focus:out`
### 192. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/surveys.tsx:624`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<textarea value={reportForm.notes ?? ""} onChange={e => setReportForm(p => ({ ...p, notes: e.target.value }))} placeholder="Intelligence report notes…" rows={2} className="w-full bg-card border border-border px-2 py-1.5 `
### 193. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/surveys.tsx:634`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={resolution} onChange={e => setResolution(e.target.value)} placeholder="RESOLUTION NOTES…" className="flex-1 bg-secondary border border-green-400/30 px-3 py-1.5 font-mono text-xs focus:outline-none focus:bor`
### 194. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/surveys.tsx:676`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={q.text ?? ""} onChange={e => setQuestions(qs => qs.map((item, i) => i === idx ? { ...item, text: e.target.value } : item))} placeholder="Question text…" className="flex-1 bg-card border border-border px-2 p`
### 195. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/surveys.tsx:683`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={(q.options ?? []).join(", ")} onChange={e => setQuestions(qs => qs.map((item, i) => i === idx ? { ...item, options: e.target.value.split(",").map(s => s.trim()) } : item))} placeholder="Option 1, Option 2, `
### 196. [MEDIUM] static-dashboard-card
- File: `artifacts/commandcentre/src/pages/turnout.tsx:136`
- Issue: StatCard is display-only and has no navigation destination.
- Evidence: `<StatCard label="PROJECTED TURNOUT" value={\`${data.totals.predictedTurnoutRate}%\`} sub={\`${fmt(data.totals.predictedVotes)} OF ${fmt(data.totals.registered)} VOTERS\`} />`
### 197. [MEDIUM] static-dashboard-card
- File: `artifacts/commandcentre/src/pages/turnout.tsx:141`
- Issue: StatCard is display-only and has no navigation destination.
- Evidence: `<StatCard label="PROJECTED KALOKI VOTES" value={fmt(data.totals.predictedCandidateVotes)} sub={\`${data.totals.predictedCandidateShare}% PROJECTED VOTE SHARE\`} accent="text-green-400" />`
### 198. [MEDIUM] static-dashboard-card
- File: `artifacts/commandcentre/src/pages/turnout.tsx:147`
- Issue: StatCard is display-only and has no navigation destination.
- Evidence: `<StatCard label="REGISTERED VOTERS" value={fmt(data.totals.registered)} sub={\`${data.wards.length} WARDS · MAKUENI\`} />`
### 199. [MEDIUM] static-dashboard-card
- File: `artifacts/commandcentre/src/pages/turnout.tsx:152`
- Issue: StatCard is display-only and has no navigation destination.
- Evidence: `<StatCard label="TOP GOTV PRIORITY" value={data.totals.topGotvWard ?? "—"} sub={\`+${fmt(data.totals.topGotvUpside)} POTENTIAL VOTES\`} accent="text-yellow-400" />`
### 200. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/volunteers.tsx:413`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={taskForm.title ?? ""} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Canvass Wote Market, 200 doors" className="w-full bg-secondary border border-border px-3 py-2 font`
### 201. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/volunteers.tsx:427`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={taskForm.targetMetric ?? ""} onChange={e => setTaskForm(p => ({ ...p, targetMetric: e.target.value }))} placeholder="e.g. Doors Knocked" className="w-full bg-secondary border border-border px-3 py-2 font-mo`
### 202. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/volunteers.tsx:431`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input type="number" value={taskForm.targetValue ?? ""} onChange={e => setTaskForm(p => ({ ...p, targetValue: e.target.value }))} placeholder="200" className="w-full bg-secondary border border-border px-3 py-2 font-mono `
### 203. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/volunteers.tsx:533`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input type="number" min="0" max="100" value={logForm.completionPct ?? ""} onChange={e => setLogForm(p => ({ ...p, completionPct: e.target.value }))} placeholder="0-100" className="w-full bg-card border border-border px-`
### 204. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/volunteers.tsx:543`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input type="number" value={logForm.hoursSpent ?? ""} onChange={e => setLogForm(p => ({ ...p, hoursSpent: e.target.value }))} placeholder="0" className="w-full bg-card border border-border px-2 py-1.5 font-mono text-xs f`
### 205. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/volunteers.tsx:547`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={logForm.notes ?? ""} onChange={e => setLogForm(p => ({ ...p, notes: e.target.value }))} placeholder="What was accomplished today?" className="w-full bg-card border border-border px-2 py-1.5 font-mono text-x`
### 206. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/volunteers.tsx:551`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={logForm.blockers ?? ""} onChange={e => setLogForm(p => ({ ...p, blockers: e.target.value }))} placeholder="Any obstacles preventing progress?" className="w-full bg-card border border-border border-red-400/2`
### 207. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/volunteers.tsx:669`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={issueForm.title ?? ""} onChange={e => setIssueForm(p => ({ ...p, title: e.target.value }))} placeholder="Brief description" className="w-full bg-secondary border border-border px-3 py-2 font-mono text-xs fo`
### 208. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/volunteers.tsx:719`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={resolution} onChange={e => setResolution(e.target.value)} placeholder="RESOLUTION NOTES…" className="flex-1 bg-secondary border border-green-400/30 px-3 py-1.5 font-mono text-xs focus:outline-none focus:bor`
### 209. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/voters-db.tsx:170`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} placeholder="Name, National ID, Voter #..." className="w-full bg-secondary border border-border pl-8 pr`
### 210. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/voters-db.tsx:430`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="FULL NAME" required placeholder="John Mutua Kioko" value={form.fullName ?? ""} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} />`
### 211. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/voters-db.tsx:432`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="NATIONAL ID" placeholder="12345678" value={form.nationalId ?? ""} onChange={e => setForm(p => ({ ...p, nationalId: e.target.value }))} />`
### 212. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/voters-db.tsx:433`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="VOTER NUMBER / SERIAL" placeholder="01234567" value={form.voterNumber ?? ""} onChange={e => setForm(p => ({ ...p, voterNumber: e.target.value }))} />`
### 213. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/voters-db.tsx:434`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="PHONE" type="tel" placeholder="0712 345 678" value={form.phone ?? ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />`
### 214. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/voters-db.tsx:445`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="SUB-COUNTY" placeholder="Makueni" value={form.subCounty ?? ""} onChange={e => setForm(p => ({ ...p, subCounty: e.target.value }))} />`
### 215. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/voters-db.tsx:447`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="POLLING STATION" placeholder="Wote Township Primary School" value={form.pollingStation ?? ""} onChange={e => setForm(p => ({ ...p, pollingStation: e.target.value }))} />`
### 216. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/voters-db.tsx:449`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="STATION CODE" placeholder="TAL-001" value={form.pollingStationCode ?? ""} onChange={e => setForm(p => ({ ...p, pollingStationCode: e.target.value }))} />`
### 217. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/voters-db.tsx:450`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="STREAM" placeholder="1" value={form.stream ?? ""} onChange={e => setForm(p => ({ ...p, stream: e.target.value }))} />`
### 218. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/voters-db.tsx:626`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `placeholder="iebc_live_xxxxxxxxxxxxxxxxxxxxxxxx"`
### 219. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/voters-db.tsx:631`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="BASE URL" value={form.baseUrl} onChange={e => setForm(p => ({ ...p, baseUrl: e.target.value }))} placeholder="https://api.iebc.or.ke/v1" />`
### 220. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/voters-db.tsx:632`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="CLIENT ID" value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))} placeholder="makueni-campaign-001" />`
### 221. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/voters-db.tsx:633`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="NOTES" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Integration contact, expiry date etc." />`
### 222. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/voters-db.tsx:658`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="POLLING STATION (OPTIONAL)" value={syncOpts.pollingStation} onChange={e => setSyncOpts(p => ({ ...p, pollingStation: e.target.value }))} placeholder="Wote Township Primary" />`
### 223. [MEDIUM] placeholder
- File: `artifacts/commandcentre/src/pages/voters-db.tsx:659`
- Issue: Potential unfinished implementation: placeholder
- Evidence: `<Input label="RECORD LIMIT" type="number" value={syncOpts.limit} onChange={e => setSyncOpts(p => ({ ...p, limit: e.target.value }))} placeholder="500" />`