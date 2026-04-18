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
    <div className="bg-gray-950 min-h-[calc(100vh-4rem)]">
      <section className="relative overflow-hidden pt-20 pb-24 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent" />

        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-300 text-sm font-semibold px-4 py-2 rounded-full mb-6 ring-1 ring-purple-500/20">
              Hardware × Intelligence
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-5 leading-[1.1] tracking-tight">
              Robotics{' '}
              <span className="bg-gradient-to-r from-purple-400 to-purple-300 bg-clip-text text-transparent">
                Lab
              </span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Embedded systems where hardware meets intelligence. Two products currently
              in the pipeline.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Breadboard Developer Kit */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 ring-1 ring-purple-500/5">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center ring-1 ring-purple-500/20">
                  <Cpu className="w-6 h-6 text-purple-400" />
                </div>
                <span className="inline-flex items-center bg-amber-500/10 text-amber-300 text-xs font-semibold px-3 py-1 rounded-full ring-1 ring-amber-500/20">
                  Coming Soon
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Breadboard Developer Kit</h2>
              <p className="text-sm text-purple-300 font-mono mb-4">ESP32 · Arduino · Plug &amp; Play</p>
              <p className="text-gray-400 mb-6 leading-relaxed">
                A curated hardware kit for rapid prototyping with ESP32 and Arduino.
                Pre-tested components, wiring guides, and starter code to get from idea
                to working prototype fast.
              </p>
              <ul className="space-y-2.5 text-sm text-gray-300">
                <li className="flex gap-3">
                  <span className="text-purple-400">—</span>
                  <span>Curated components: OLED, I2S mic, amp, touch sensors, jumpers</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400">—</span>
                  <span>Color-coded wiring diagrams and pinout guides</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400">—</span>
                  <span>Starter code library: audio, display, touch, WiFi, AI integration</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400">—</span>
                  <span>Guided tutorials from unboxing to working embedded project</span>
                </li>
              </ul>
            </div>

            {/* Agentic Arduino */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 ring-1 ring-purple-500/5">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center ring-1 ring-purple-500/20">
                  <Bot className="w-6 h-6 text-purple-400" />
                </div>
                <span className="inline-flex items-center bg-blue-500/10 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full ring-1 ring-blue-500/20">
                  In Development
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Agentic Arduino</h2>
              <p className="text-sm text-purple-300 font-mono mb-4">AI · Autonomy · Edge</p>
              <p className="text-gray-400 mb-6 leading-relaxed">
                An Arduino platform with embedded agentic AI — autonomous decision-making,
                tool use, and multi-step task execution entirely on the edge. No cloud
                required for reasoning.
              </p>
              <ul className="space-y-2.5 text-sm text-gray-300">
                <li className="flex gap-3">
                  <span className="text-purple-400">—</span>
                  <span>On-device AI agent loop — perceive, reason, act without cloud</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400">—</span>
                  <span>Agent calls hardware functions — move, sense, speak, display</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400">—</span>
                  <span>Hybrid cloud + edge — falls back to cloud APIs when WiFi available</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400">—</span>
                  <span>Low-power design for battery-powered, always-on operation</span>
                </li>
              </ul>
              <div className="mt-6">
                <div className="flex items-center justify-between text-xs font-mono text-gray-500 mb-2">
                  <span>development progress</span>
                  <span>15%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full" style={{ width: '15%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-16">
            <Link
              href="/#shop"
              className="inline-flex items-center gap-2 text-purple-300 hover:text-white font-semibold transition-colors"
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
