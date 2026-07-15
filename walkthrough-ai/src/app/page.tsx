'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/marketing/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  UploadCloud, ScanEye, Network, Camera, Sparkles, Clapperboard,
  ArrowRight, Wand2, Building2, MapPin,
} from 'lucide-react';

const PIPELINE = [
  { icon: ScanEye, name: 'Image Understanding', desc: 'Every photo is analyzed for room type, materials, furniture, lighting, and architecture — a precise structured extraction, never a guess.' },
  { icon: Network, name: 'Layout Builder', desc: 'Duplicate photos of the same room are merged, and a real adjacency graph and floorplan are inferred from doors, windows, and sightlines.' },
  { icon: Camera, name: 'Camera Planner', desc: 'A physically-valid shot list is planned — the camera only moves through real doors and openings, in professional real-estate cinematography style.' },
  { icon: Wand2, name: 'Prompt Generator', desc: 'An exhaustively detailed cinematic prompt is written for your chosen video model, with camera, lighting, material, and negative-prompt precision.' },
  { icon: Clapperboard, name: 'Video Generator', desc: 'Sent to Veo, Kling, Runway, or Hailuo through one unified abstraction layer — swap providers without touching your prompt.' },
];

const FEATURES = [
  { icon: UploadCloud, title: 'Drag & drop batch upload', desc: '5 to 30 photos, sorted and grouped automatically.' },
  { icon: Building2, title: 'AI room grouping', desc: 'Duplicate angles of the same room are merged intelligently.' },
  { icon: MapPin, title: 'Floorplan preview', desc: 'See the inferred layout and adjust connections before generating.' },
  { icon: Sparkles, title: 'Six luxury design styles', desc: 'Luxury, Modern, Mediterranean, Scandinavian, Minimal, Cozy.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-noise">
      <Navbar />

      <section className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pb-28 pt-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Five specialized AI agents. One physically-accurate walkthrough.
          </span>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Turn property photos into a
            <br />
            <span className="text-gradient-gold">cinematic luxury walkthrough</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Upload 5–30 photos of any villa, apartment, or Airbnb. Walkthrough AI understands every
            room, plans a physically-real camera path, and generates a professional walkthrough video —
            without ever inventing a room, moving a sofa, or bending a wall.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/sign-up">
                Generate your first walkthrough <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#pipeline">See how it works</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      <section id="pipeline" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            A pipeline of agents, not one guessing model
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Each stage is a specialized agent with one job and hard physical constraints — the same
            discipline a real production studio applies to a real shoot.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          {PIPELINE.map((stage, i) => (
            <motion.div
              key={stage.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Card className="glass-panel h-full">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <stage.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">Agent {i + 1} — {stage.name}</CardTitle>
                  <CardDescription>{stage.desc}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title} className="border-border/50">
              <CardContent className="pt-6">
                <f.icon className="mb-3 h-5 w-5 text-primary" />
                <h3 className="font-medium">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-32 text-center">
        <Card className="glass-panel px-8 py-14">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Ready to see your property in motion?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Start with 20 free credits — enough for your first cinematic walkthrough.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href="/sign-up">Start free <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </Card>
      </section>

      <footer className="border-t border-white/5 py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Walkthrough AI. All rights reserved.
      </footer>
    </div>
  );
}
