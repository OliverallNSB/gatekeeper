'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface UserSettings {
  id: string;
  user_id: string;
  ai_screening_enabled: boolean;
  sms_notifications_enabled: boolean;
  call_recording_enabled: boolean;
  voicemail_transcription_enabled: boolean;
  custom_routing_enabled: boolean;
  analytics_enabled: boolean;
  multi_user_enabled: boolean;
  owner_phone_number: string | null;
  created_at: string;
  updated_at: string;
}

export default function SetupPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      loadSettings(session.access_token);
    };

    checkAuth();
  }, [router]);

  const loadSettings = async (token: string) => {
    try {
      const response = await fetch('/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof UserSettings) => {
    if (!settings || !user) return;

    const newValue = !settings[key];
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [key]: newValue,
        }),
      });

      if (!response.ok) throw new Error('Failed to update settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Error loading settings</div>
      </div>
    );
  }

  const features = [
    {
      key: 'ai_screening_enabled' as const,
      label: 'AI Call Screening',
      description: 'Enable AI to screen and analyze incoming calls. When OFF, all calls forward directly to you.',
      icon: '🤖',
    },
    {
      key: 'sms_notifications_enabled' as const,
      label: 'SMS Notifications',
      description: 'Receive SMS alerts when calls come in.',
      icon: '📱',
    },
    {
      key: 'call_recording_enabled' as const,
      label: 'Call Recording',
      description: 'Automatically record all incoming calls.',
      icon: '🎙️',
    },
    {
      key: 'voicemail_transcription_enabled' as const,
      label: 'Voicemail Transcription',
      description: 'Convert voicemails to text automatically.',
      icon: '📝',
    },
    {
      key: 'custom_routing_enabled' as const,
      label: 'Custom Call Routing',
      description: 'Route calls based on caller ID or reason.',
      icon: '🛣️',
    },
    {
      key: 'analytics_enabled' as const,
      label: 'Analytics Dashboard',
      description: 'Track call metrics and trends.',
      icon: '📊',
    },
    {
      key: 'multi_user_enabled' as const,
      label: 'Multi-User Support',
      description: 'Add team members to manage calls.',
      icon: '👥',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">GATEKEEPER Settings</h1>
            <p className="text-slate-400 mt-1">Customize your call screening experience</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid gap-6">
          {features.map((feature) => (
            <div
              key={feature.key}
              className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{feature.icon}</span>
                    <h3 className="text-xl font-semibold text-white">{feature.label}</h3>
                  </div>
                  <p className="text-slate-400">{feature.description}</p>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggle(feature.key)}
                  disabled={saving}
                  className={`ml-6 relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    settings[feature.key]
                      ? 'bg-cyan-600 hover:bg-cyan-700'
                      : 'bg-slate-600 hover:bg-slate-700'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      settings[feature.key] ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Status Badge */}
              <div className="mt-4 flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    settings[feature.key] ? 'bg-green-500' : 'bg-slate-500'
                  }`}
                />
                <span className="text-sm text-slate-400">
                  {settings[feature.key] ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-12 bg-cyan-900 border border-cyan-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-cyan-100 mb-2">💡 Pro Tip</h3>
          <p className="text-cyan-200">
            Turn off <strong>AI Call Screening</strong> anytime if you want to handle all calls manually. 
            This is perfect when you're available and want to answer calls directly without AI filtering.
          </p>
        </div>
      </div>
    </div>
  );
}
