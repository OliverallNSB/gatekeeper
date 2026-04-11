'use client';

import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center font-bold text-slate-950">
              G
            </div>
            <span className="text-xl font-bold">GATEKEEPER</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/login')}
              className="text-slate-300 hover:text-white transition"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="px-4 py-2 bg-teal-500 text-slate-950 font-semibold rounded-lg hover:bg-teal-400 transition"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Your Personal Assistant
              

            <span className="text-teal-400"> for Call Screening</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Let AI handle your incoming calls. Screen callers, prioritize urgent calls, and focus on what matters.
            Your personal assistant works 24/7, so you don't have to.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <button
              onClick={() => router.push('/signup')}
              className="px-8 py-4 bg-teal-500 text-slate-950 font-bold text-lg rounded-lg hover:bg-teal-400 transition transform hover:scale-105"
            >
              Start Free Trial
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-4 border-2 border-teal-500 text-teal-400 font-bold text-lg rounded-lg hover:bg-teal-500/10 transition"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">What Your Assistant Does</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 hover:border-teal-500 transition">
            <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-xl font-bold mb-3">AI Call Screening</h3>
            <p className="text-slate-300">
              Intelligent voice agent answers calls, asks why they're calling, and gathers information automatically.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 hover:border-teal-500 transition">
            <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Urgent Call Transfer</h3>
            <p className="text-slate-300">
              Detects urgent calls and transfers them to your phone immediately. Never miss an important call again.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 hover:border-teal-500 transition">
            <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="text-xl font-bold mb-3">SMS Notifications</h3>
            <p className="text-slate-300">
              Get instant SMS alerts with caller info and reason for calling. Stay informed even when you're busy.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-slate-950">
              1
            </div>
            <h3 className="text-xl font-bold mb-3">Incoming Call</h3>
            <p className="text-slate-300">
              Call comes to your Gatekeeper number. AI assistant answers and asks why they're calling.
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-slate-950">
              2
            </div>
            <h3 className="text-xl font-bold mb-3">AI Screening</h3>
            <p className="text-slate-300">
              AI evaluates the call, detects urgency, and decides: transfer to you or send to voicemail.
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-slate-950">
              3
            </div>
            <h3 className="text-xl font-bold mb-3">You Stay in Control</h3>
            <p className="text-slate-300">
              Review all calls in your dashboard. See who called, why, and what decision was made.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border border-teal-500/50 rounded-2xl p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Your Personal Assistant?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Start your free trial today. No credit card required.
          </p>
          <button
            onClick={() => router.push('/signup')}
            className="px-8 py-4 bg-teal-500 text-slate-950 font-bold text-lg rounded-lg hover:bg-teal-400 transition transform hover:scale-105"
          >
            Start Free Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">GATEKEEPER</h4>
              <p className="text-slate-400 text-sm">
                AI-powered call screening for small business owners.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-teal-400">Features</a></li>
                <li><a href="#" className="hover:text-teal-400">Pricing</a></li>
                <li><a href="#" className="hover:text-teal-400">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-teal-400">About</a></li>
                <li><a href="#" className="hover:text-teal-400">Blog</a></li>
                <li><a href="#" className="hover:text-teal-400">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-teal-400">Privacy</a></li>
                <li><a href="#" className="hover:text-teal-400">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; 2026 Gatekeeper. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
