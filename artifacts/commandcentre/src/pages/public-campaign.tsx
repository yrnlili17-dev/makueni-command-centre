import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, HeartHandshake, MapPin, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Content = {
  id: number;
  contentType: string;
  title: string;
  summary?: string;
  body?: string;
  imageUrl?: string;
  actionLabel?: string;
  actionUrl?: string;
};

export default function PublicCampaign() {
  const [items, setItems] = useState<Content[]>([]);
  useEffect(() => {
    fetch("/api/final-release/public/content")
      .then(async (response) => response.headers.get("content-type")?.includes("application/json") ? response.json() : [])
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  }, []);

  const priorities = [
    ["Reliable healthcare", "Stronger facilities, medicine availability and responsive community health services.", HeartHandshake],
    ["Water and agriculture", "Practical water security, irrigation and better market access for farmers.", MapPin],
    ["Youth opportunity", "Skills, enterprise support, digital work and transparent county opportunities.", Users],
    ["Accountable leadership", "Integrity, public participation and measurable delivery in every ward.", ShieldCheck],
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div><p className="text-sm font-black tracking-wider">PROF. PHILIP KALOKI</p><p className="text-[10px] uppercase tracking-[0.22em] text-primary">Makueni 2027</p></div>
          <Button size="sm" onClick={() => document.getElementById("join")?.scrollIntoView({ behavior: "smooth" })}>Join the movement</Button>
        </div>
      </header>

      <main>
        <section className="border-b">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div>
              <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.28em] text-primary">Development · Integrity · Prosperity</p>
              <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">A stronger future for every Makueni household.</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">A people-centred campaign focused on practical development, accountable leadership and opportunity across every constituency, ward and village.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button size="lg">Read the priorities <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Button size="lg" variant="outline"><CalendarDays className="mr-2 h-4 w-4" />Campaign events</Button>
              </div>
            </div>
            <Card className="overflow-hidden">
              <CardContent className="grid min-h-[320px] place-items-center bg-gradient-to-br from-primary/20 via-background to-secondary p-8 text-center">
                <div><p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Makueni County</p><p className="mt-4 text-4xl font-black">Leadership that delivers.</p><p className="mt-3 text-sm text-muted-foreground">Campaign media and candidate photography can be added during the final branding pass.</p></div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Our priorities</p><h2 className="mt-2 text-3xl font-bold">A practical development agenda</h2></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {priorities.map(([title, text, Icon]) => (
              <Card key={title}><CardContent className="p-5"><Icon className="h-7 w-7 text-primary" /><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></CardContent></Card>
            ))}
          </div>
        </section>

        {items.length > 0 && (
          <section className="border-y bg-card/40">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
              <h2 className="text-3xl font-bold">Latest campaign updates</h2>
              <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => <Card key={item.id}><CardContent className="p-5"><p className="text-xs uppercase tracking-wider text-primary">{item.contentType}</p><h3 className="mt-2 text-xl font-bold">{item.title}</h3><p className="mt-3 text-sm text-muted-foreground">{item.summary || item.body}</p></CardContent></Card>)}
              </div>
            </div>
          </section>
        )}

        <section id="join" className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-black sm:text-4xl">Build Makueni's future with us.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Register as a volunteer, attend a campaign event, share your priorities and help organize your community.</p>
          <Button className="mt-7" size="lg">Volunteer registration <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </section>
      </main>

      <footer className="border-t px-4 py-8 text-center text-xs text-muted-foreground">Prof. Philip Kaloki 2027 Campaign · Makueni County</footer>
    </div>
  );
}
