'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { getCallAction } from '@/lib/call-actions';

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
  call_category: string | null;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadIntake {
  id: string;
  call_session_id: string;
  caller_name: string | null;
  service_needed: string | null;
  property_address: string | null;
  callback_phone: string | null;
  created_at: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  emergency:         { label: 'Emergency',         bg: 'bg-red-900',    text: 'text-red-200' },
  appointment:       { label: 'Appointment',       bg: 'bg-green-900',  text: 'text-green-200' },
  existing_customer: { label: 'Existing Customer', bg: 'bg-blue-900',   text: 'text-blue-200' },
  new_customer:      { label: 'New Customer',      bg: 'bg-purple-900', text: 'text-purple-200' },
  vendor_sales:      { label: 'Vendor / Sales',    bg: 'bg-orange-900', text: 'text-orange-200' },
  spam:              { label: 'Spam',              bg: 'bg-slate-700',  text: 'text-slate-400' },
  general:           { label: 'General',           bg: 'bg-slate-800',  text: 'text-slate-300' },
};

const DECISION_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  transferred:  { label: 'Transferred',  bg: 'bg-green-900',  text: 'text-green-200' },
  voicemail:    { label: 'Message',      bg: 'bg-blue-900',   text: 'text-blue-200' },
  blocked:      { label: 'Blocked',      bg: 'bg-red-900',    text: 'text-red-200' },
  lead_intake:  { label: 'Lead',         bg: 'bg-purple-900', text: 'text-purple-200' },
};

const FILTER_OPTIONS = [
  { value: 'all',               label: 'All Calls' },
  { value: 'emergency',         label: 'Emergency' },
  { value: 'appointment',       label: 'Appointments' },
  { value: 'existing_customer', label: 'Existing Customers' },
  { value: 'new_customer',      label: 'New Customers' },
  { value: 'vendor_sales',      label: 'Vendor / Sales' },
  { value: 'spam',              label: 'Spam' },
  { value: 'general',           label: 'General' },
  { value: 'transferred',       label: 'Transferred' },
  { value: 'voicemail',         label: 'Voicemail' },
  { value: 'blocked',           label: 'Blocked' },
];

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-slate-500 text-xs font-medium uppercase mb-0.5">{label}</div>
      <div className="text-slate-200 text-sm break-words">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedCalls, setSelectedCalls] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [leadDataCache, setLeadDataCache] = useState<Record<string, LeadIntake | null>>({});
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const lastClickedId = useRef<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      try {
        const { data, error } = await supabase
          .from('call_sessions')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCalls(data || []);
      } catch (error) {
        console.error('Error loading calls:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const filteredCalls = calls.filter((call) => {
    if (filter !== 'all') {
      const isDecisionFilter = ['transferred', 'voicemail', 'blocked'].includes(filter);
      if (isDecisionFilter) {
        if (call.decision !== filter) return false;
      } else {
        if (call.call_category !== filter) return false;
      }
    }

    if (search) {
      const q = search.toLowerCase();
      const searchable = [
        call.caller_name,
        call.from_number,
        call.caller_reason,
        call.call_category,
        call.decision,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    return true;
  });

  // Ctrl+A and Esc keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCalls([]);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        setSelectedCalls(filteredCalls.map((c) => c.id));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCalls]);

  const handleCardClick = (e: React.MouseEvent, call: CallSession) => {
    if (e.shiftKey && lastClickedId.current) {
      const ids = filteredCalls.map((c) => c.id);
      const start = ids.indexOf(lastClickedId.current);
      const end = ids.indexOf(call.id);
      if (start !== -1 && end !== -1) {
        const range = ids.slice(Math.min(start, end), Math.max(start, end) + 1);
        if (e.ctrlKey || e.metaKey) {
          setSelectedCalls((prev) => [...new Set([...prev, ...range])]);
        } else {
          setSelectedCalls(range);
        }
      }
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedCalls((prev) =>
        prev.includes(call.id)
          ? prev.filter((id) => id !== call.id)
          : [...prev, call.id]
      );
      lastClickedId.current = call.id;
    } else {
      setSelectedCalls([call.id]);
      lastClickedId.current = call.id;
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent, callId: string) => {
    e.stopPropagation();
    setSelectedCalls((prev) =>
      prev.includes(callId)
        ? prev.filter((id) => id !== callId)
        : [...prev, callId]
    );
    lastClickedId.current = callId;
  };

  const handleExpandToggle = async (e: React.MouseEvent, call: CallSession) => {
    e.stopPropagation();
    if (expandedCallId === call.id) {
      setExpandedCallId(null);
      return;
    }
    setExpandedCallId(call.id);
    setTranscriptOpen(false);

    if (call.decision === 'lead_intake' && !(call.call_sid in leadDataCache)) {
      const { data } = await supabase
        .from('lead_intake')
        .select('*')
        .eq('call_session_id', call.call_sid)
        .single();
      setLeadDataCache((prev) => ({ ...prev, [call.call_sid]: data }));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCalls.length === 0) return;

    const confirmDelete = window.confirm(
      `Delete ${selectedCalls.length} selected call(s)?`
    );

    if (!confirmDelete) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from('call_sessions')
        .delete()
        .eq('user_id', user.id)
        .in('id', selectedCalls);

      if (error) throw error;

      setCalls((prev) => prev.filter((call) => !selectedCalls.includes(call.id)));
      setSelectedCalls([]);
    } catch (error) {
      console.error('Error deleting calls:', error);
      alert('Error deleting selected calls.');
    } finally {
      setDeleting(false);
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getCategoryBadge = (category: string | null) => {
    const config = CATEGORY_CONFIG[category || 'general'] || CATEGORY_CONFIG.general;
    return (
      <span className={`px-2 py-0.5 ${config.bg} ${config.text} rounded-full text-xs font-medium`}>
        {config.label}
      </span>
    );
  };

  const getDecisionBadge = (decision: string) => {
    const config = DECISION_CONFIG[decision] || { label: decision, bg: 'bg-slate-700', text: 'text-slate-200' };
    return (
      <span className={`px-2 py-0.5 ${config.bg} ${config.text} rounded-full text-xs font-medium`}>
        {config.label}
      </span>
    );
  };

  const emergencyCount = calls.filter((c) => c.call_category === 'emergency').length;
  const transferredCount = calls.filter((c) => c.decision === 'transferred').length;
  const messageCount = calls.filter((c) => c.decision === 'voicemail').length;
  const blockedCount = calls.filter((c) => c.decision === 'blocked').length;

  const renderExpandedDetails = (call: CallSession) => {
    const lead = leadDataCache[call.call_sid] || null;
    const isLead = call.decision === 'lead_intake';
    const categoryLabel = (CATEGORY_CONFIG[call.call_category || 'general'] || CATEGORY_CONFIG.general).label;

    return (
      <div className="mt-3 pt-3 border-t border-slate-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <DetailItem
            label="Full Name"
            value={lead?.caller_name || call.caller_name || 'Not provided'}
          />
          <DetailItem
            label="Caller Phone"
            value={call.from_number}
          />
          {isLead && (
            <>
              <DetailItem
                label="Callback Phone"
                value={lead?.callback_phone || 'Not provided'}
              />
              <DetailItem
                label="Service Requested"
                value={lead?.service_needed || 'Not provided'}
              />
              <DetailItem
                label="Property Address / City"
                value={lead?.property_address || 'Not provided'}
              />
            </>
          )}
          <DetailItem label="Intent" value={categoryLabel} />
          <DetailItem label="AI Summary" value="Not provided" />
          <DetailItem label="Date / Time" value={formatFullDate(call.created_at)} />
        </div>

        <div className="mt-4">
          <button
            onClick={(e) => { e.stopPropagation(); setTranscriptOpen((prev) => !prev); }}
            className="flex items-center gap-1.5 text-slate-500 text-xs font-medium uppercase hover:text-slate-300 transition"
          >
            <svg
              className={`w-3 h-3 transition-transform ${transcriptOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            Conversation Transcript
          </button>
          {transcriptOpen && (
            <div className="mt-2 bg-slate-900 rounded-lg p-3 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {call.caller_reason || 'No transcript available.'}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            disabled
            className="px-3 py-1.5 text-xs bg-slate-700 text-slate-500 rounded-lg cursor-not-allowed"
          >
            Call
          </button>
          <button
            disabled
            className="px-3 py-1.5 text-xs bg-slate-700 text-slate-500 rounded-lg cursor-not-allowed"
          >
            SMS
          </button>
          <button
            disabled
            className="px-3 py-1.5 text-xs bg-slate-700 text-slate-500 rounded-lg cursor-not-allowed"
          >
            Email
          </button>
          <button
            disabled
            className="px-3 py-1.5 text-xs bg-slate-700 text-slate-500 rounded-lg cursor-not-allowed"
          >
            Convert to Client
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">GATEKEEPER</h1>
            <p className="text-slate-400 text-sm">Call Dashboard</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/blacklist')}
              className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition border border-slate-700"
            >
              Blacklist
            </button>
            <button
              onClick={() => router.push('/whitelist')}
              className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition border border-slate-700"
            >
              Contacts
            </button>
            <button
              onClick={() => router.push('/setup')}
              className="px-3 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
            >
              Settings
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-red-900 text-slate-400 hover:text-red-200 rounded-lg transition border border-slate-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-xs font-medium uppercase">Total</div>
            <div className="text-3xl font-bold text-white mt-1">{calls.length}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-xs font-medium uppercase">Transferred</div>
            <div className="text-3xl font-bold text-green-400 mt-1">{transferredCount}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-xs font-medium uppercase">Messages</div>
            <div className="text-3xl font-bold text-blue-400 mt-1">{messageCount}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-xs font-medium uppercase">
              {emergencyCount > 0 ? 'Emergencies' : 'Blocked'}
            </div>
            <div className={`text-3xl font-bold mt-1 ${emergencyCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {emergencyCount > 0 ? emergencyCount : blockedCount}
            </div>
          </div>
        </div>

        {/* Search + Filter + Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Search calls..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 appearance-none cursor-pointer"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedCalls.length === 0 || deleting}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition font-medium whitespace-nowrap"
          >
            {deleting ? 'Deleting...' : `Delete (${selectedCalls.length})`}
          </button>
        </div>

        {/* Call List */}
        <div className="space-y-2">
          {loading ? (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center text-slate-400">
              Loading calls...
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center text-slate-400">
              {search || filter !== 'all' ? 'No calls match your filters.' : 'No calls yet.'}
            </div>
          ) : (
            filteredCalls.map((call) => {
              const isSelected = selectedCalls.includes(call.id);
              const isExpanded = expandedCallId === call.id;

              return (
                <div
                  key={call.id}
                  onClick={(e) => handleCardClick(e, call)}
                  className={`bg-slate-800 border rounded-lg p-4 cursor-pointer transition select-none ${
                    isExpanded
                      ? 'border-cyan-600 ring-1 ring-cyan-600/30'
                      : isSelected
                      ? 'border-cyan-600'
                      : call.call_category === 'emergency'
                      ? 'border-red-800 hover:border-red-700'
                      : 'border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      onClick={(e) => handleCheckboxClick(e, call.id)}
                      className="w-4 h-4 accent-cyan-600 mt-1 shrink-0 cursor-pointer"
                    />

                    <div className="flex-1 min-w-0">
                      {/* Row 1: Caller identity + time */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-white font-medium text-sm truncate">
                            {call.caller_name || call.from_number}
                          </span>
                          {call.caller_name && (
                            <span className="text-slate-500 text-xs font-mono hidden sm:inline">
                              {call.from_number}
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500 text-xs whitespace-nowrap shrink-0">
                          {formatDate(call.created_at)}
                        </span>
                      </div>

                      {/* Row 2: Reason */}
                      <p className={`text-slate-400 text-sm mb-2 ${isExpanded ? '' : 'truncate'}`}>
                        {call.caller_reason}
                      </p>

                      {/* Row 3: Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {getCategoryBadge(call.call_category)}
                        {getDecisionBadge(call.decision)}
                        <span className="text-slate-600 text-xs">
                          {getCallAction(call.call_category).label}
                        </span>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && renderExpandedDetails(call)}
                    </div>

                    {/* Expand / Collapse chevron */}
                    <button
                      onClick={(e) => handleExpandToggle(e, call)}
                      className="shrink-0 mt-0.5 p-1 text-slate-500 hover:text-slate-300 transition rounded"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Results count */}
        {!loading && filteredCalls.length > 0 && (
          <p className="text-xs text-slate-500 mt-4 text-center">
            Showing {filteredCalls.length} of {calls.length} calls
          </p>
        )}
      </div>

      {/* Legal Footer */}
      <div className="border-t border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap gap-4 justify-center text-xs text-slate-500">
          <a href="/privacy" className="hover:text-slate-300">Privacy Policy</a>
          <span>|</span>
          <a href="/terms" className="hover:text-slate-300">Terms &amp; Conditions</a>
          <span>|</span>
          <a href="/sms-consent" className="hover:text-slate-300">SMS Consent</a>
          <span>|</span>
          <a href="mailto:support@appgatekeeper.net" className="hover:text-slate-300">Support</a>
        </div>
      </div>
    </div>
  );
}
