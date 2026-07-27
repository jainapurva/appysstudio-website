import { Cpu, Bot, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: "Robotics — Coming Soon | Appy's Studio",
  description:
    "Embedded hardware from Appy's Studio — plug-and-play ESP32 developer kits and agentic Arduino platforms. Coming soon.",
  alternates: { canonical: 'https://appysstudio.com/robotics' },
};

export default function RoboticsPage() {
  return (
    <div className="bg-ink min-h-[calc(100vh-4rem)]">
      <section className="relative overflow-hidden pt-20 pb-24 px-4">
        <span className="absolute -top-16 -right-10 text-[220px] text-paper/5 craft-spin !animate-[craft-spin_30s_linear_infinite]" aria-hidden="true">✳︎</span>

        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-craft-orange text-[13px] font-bold uppercase tracking-[.14em] px-4 py-2 mb-6">
              Hardware × Intelligence
            </div>
            <h1 className="font-display text-[clamp(44px,5.6vw,64px)] text-paper mb-5 leading-[1.1]">
              Robotics{' '}
              <span className="text-craft-orange">Lab</span>
            </h1>
            <p className="text-lg text-foot-text max-w-2xl mx-auto leading-relaxed">
              Embedded systems where hardware meets intelligence. Two products currently
              in the pipeline.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Breadboard Developer Kit */}
            <div className="bg-white/5 border border-dashed border-foot-text/30 rounded-2xl p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 bg-craft-orange/15 rounded-xl flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-craft-orange" />
                </div>
                <span className="inline-flex items-center bg-butter text-ink text-xs font-bold px-3 py-1 rounded-full rotate-2">
                  Coming Soon
                </span>
              </div>
              <h2 className="font-display text-[26px] text-paper mb-1">Breadboard Developer Kit</h2>
              <p className="text-sm text-craft-orange font-mono mb-4">ESP32 · Arduino · Plug &amp; Play</p>
              <p className="text-foot-text mb-6 leading-relaxed">
                A curated hardware kit for rapid prototyping with ESP32 and Arduino.
                Pre-tested components, wiring guides, and starter code to get from idea
                to working prototype fast.
              </p>
              <ul className="space-y-2.5 text-sm text-foot-text">
                <li className="flex gap-3">
                  <span className="text-craft-orange">✳︎</span>
                  <span>Curated components: OLED, I2S mic, amp, touch sensors, jumpers</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-craft-orange">✳︎</span>
                  <span>Color-coded wiring diagrams and pinout guides</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-craft-orange">✳︎</span>
                  <span>Starter code library: audio, display, touch, WiFi, AI integration</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-craft-orange">✳︎</span>
                  <span>Guided tutorials from unboxing to working embedded project</span>
                </li>
              </ul>
            </div>

            {/* Agentic Arduino */}
            <div className="bg-white/5 border border-dashed border-foot-text/30 rounded-2xl p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 bg-craft-orange/15 rounded-xl flex items-center justify-center">
                  <Bot className="w-6 h-6 text-craft-orange" />
                </div>
                <span className="inline-flex items-center bg-sage text-white text-xs font-bold px-3 py-1 rounded-full -rotate-2">
                  In Development
                </span>
              </div>
              <h2 className="font-display text-[26px] text-paper mb-1">Agentic Arduino</h2>
              <p className="text-sm text-craft-orange font-mono mb-4">AI · Autonomy · Edge</p>
              <p className="text-foot-text mb-6 leading-relaxed">
                An Arduino platform with embedded agentic AI — autonomous decision-making,
                tool use, and multi-step task execution entirely on the edge. No cloud
                required for reasoning.
              </p>
              <ul className="space-y-2.5 text-sm text-foot-text">
                <li className="flex gap-3">
                  <span className="text-craft-orange">✳︎</span>
                  <span>On-device AI agent loop — perceive, reason, act without cloud</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-craft-orange">✳︎</span>
                  <span>Agent calls hardware functions — move, sense, speak, display</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-craft-orange">✳︎</span>
                  <span>Hybrid cloud + edge — falls back to cloud APIs when WiFi available</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-craft-orange">✳︎</span>
                  <span>Low-power design for battery-powered, always-on operation</span>
                </li>
              </ul>
              <div className="mt-6">
                <div className="flex items-center justify-between text-xs font-mono text-foot-text/70 mb-2">
                  <span>development progress</span>
                  <span>15%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-craft-orange rounded-full" style={{ width: '15%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-16">
            <Link
              href="/#shop"
              className="inline-flex items-center gap-2 text-craft-orange hover:text-paper font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to shop
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
