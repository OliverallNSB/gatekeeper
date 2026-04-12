'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TrustedContact {
  id: string;
  contact_name: string;
  phone_number: string;
  created_at: string;
}

export default function WhitelistPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [contactName, setContactName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      loadContacts(session.access_token);
    };

    checkAuth();
  }, [router]);

  const loadContacts = async (token: string) => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Response:', text);
        throw new Error(`Failed to load contacts: ${response.status}`);
      }
      
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      console.error('Error loading contacts:', error);
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!contactName.trim() || !phoneNumber.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setAdding(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contact_name: contactName,
          phone_number: phoneNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add contact');
      }

      const newContact = await response.json();
      setContacts([newContact, ...contacts]);
      setContactName('');
      setPhoneNumber('');
    } catch (error) {
      console.error('Error adding contact:', error);
      setError(error instanceof Error ? error.message : 'Failed to add contact');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/contacts?id=${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to delete contact');
      setContacts(contacts.filter(c => c.id !== contactId));
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading contacts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Trusted Contacts</h1>
            <p className="text-slate-400 mt-1">Whitelist numbers that bypass AI screening</p>
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
        {/* Add Contact Form */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Add Trusted Contact</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleAddContact} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g., Mom, Best Client"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g., +1 (386) 264-1920"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={adding}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? 'Adding...' : '+ Add Contact'}
            </button>
          </form>
        </div>

        {/* Contacts List */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white">
              Your Trusted Contacts ({contacts.length})
            </h2>
          </div>

          {contacts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No trusted contacts yet. Add one to get started!
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-6 hover:bg-slate-700 transition flex justify-between items-center"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-white">{contact.contact_name}</h3>
                    <p className="text-slate-400 font-mono text-sm mt-1">{contact.phone_number}</p>
                    <p className="text-slate-500 text-xs mt-2">
                      Added {new Date(contact.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className="px-4 py-2 bg-red-900 hover:bg-red-800 text-red-200 rounded-lg transition text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-cyan-900 border border-cyan-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-cyan-100 mb-2">📞 How It Works</h3>
          <p className="text-cyan-200">
            When someone from your trusted contacts calls, they'll be transferred directly to you without AI screening. 
            This is perfect for family, close friends, and important clients.
          </p>
        </div>
      </div>
    </div>
  );
}
