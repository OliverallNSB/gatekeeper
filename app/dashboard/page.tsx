'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CallSession {
  id: string;
  call_sid: string;
  from_number: string;
  to_number: string;
  status: string;
  caller_name: string | null;
  caller_reason: string;
  decision: string;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      loadCalls();
    };

    checkAuth();
  }, [router]);

  const loadCalls = async () => {
    try {
      const { data, error } = await supabase
        .from('call_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error('Error loading calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'transferred':
        return <span className="px-3 py-1 bg-green-900 text-green-200 rounded-full text-sm font-medium">Transferred</span>;
      case 'voicemail':
        return <span className="px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-sm font-medium">Voicemail</span>;
      default:
        return <span className="px-3 py-1 bg-slate-700 text-slate-200 rounded-full text-sm font-medium">{decision}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">GATEKEEPER Dashboard</h1>
            <p className="text-slate-400 mt-1">Call History</p>
          </div>
          
        <div className="flex items-center gap-4">
  <button
    onClick={() => router.push('/contacts')}
    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
  >
    👥 Contacts
  </button>
  <button
    onClick={() => router.push('/setup')}
    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition font-medium"
  >
    ⚙️ Settings
  </button>
  <button
    onClick={handleLogout}
    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
  >
    Logout
  </button>
</div>

        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="text-slate-400 text-sm font-medium">Total Calls</div>
            <div className="text-4xl font-bold text-white mt-2">{calls.length}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="text-slate-400 text-sm font-medium">Transferred</div>
            <div className="text-4xl font-bold text-green-400 mt-2">
              {calls.filter(c => c.decision === 'transferred').length}
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="text-slate-400 text-sm font-medium">Voicemail</div>
            <div className="text-4xl font-bold text-blue-400 mt-2">
              {calls.filter(c => c.decision === 'voicemail').length}
            </div>
          </div>
        </div>

        {/* Call History Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">FROM</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">CALLER NAME</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">REASON</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">STATUS</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">DECISION</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      Loading calls...
                    </td>
                  </tr>
                ) : calls.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No calls yet
                    </td>
                  </tr>
                ) : (
                  calls.map((call) => (
                    <tr key={call.id} className="hover:bg-slate-700 transition">
                      <td className="px-6 py-4 text-sm text-white font-mono">{call.from_number}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{call.caller_name || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-300 max-w-xs truncate">{call.caller_reason}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-3 py-1 bg-slate-700 text-slate-200 rounded-full text-xs font-medium">
                          {call.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{getDecisionBadge(call.decision)}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{formatDate(call.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
