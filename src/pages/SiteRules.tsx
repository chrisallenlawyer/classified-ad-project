import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';

interface SiteRules {
  id: string;
  version: string;
  title: string;
  content: string;
  effective_date: string;
}

interface UserRulesHistory {
  rules_version: string;
  accepted_at: string;
  title: string;
}

const SiteRules: React.FC = () => {
  const [siteRules, setSiteRules] = useState<SiteRules | null>(null);
  const [userHistory, setUserHistory] = useState<UserRulesHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchSiteRules();
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        fetchUserHistory(user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const fetchSiteRules = async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_site_rules');
      
      if (error) {
        console.error('Error fetching site rules:', error);
        setError('Failed to load site rules');
        return;
      }
      
      if (data && data.length > 0) {
        setSiteRules(data[0]);
      } else {
        setError('No site rules found');
      }
    } catch (error) {
      console.error('Error fetching site rules:', error);
      setError('Failed to load site rules');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserHistory = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_rules_history', {
        p_user_id: userId
      });
      
      if (error) {
        console.error('Error fetching user history:', error);
        return;
      }
      
      setUserHistory(data || []);
    } catch (error) {
      console.error('Error fetching user history:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMarkdownContent = (content: string) => {
    // Simple markdown-like rendering for the rules content
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={key++} className="text-lg font-semibold text-gray-900 mt-6 mb-3">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={key++} className="text-xl font-bold text-gray-900 mt-8 mb-4">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={key++} className="text-2xl font-bold text-gray-900 mt-8 mb-6">
            {line.replace('# ', '')}
          </h1>
        );
      } else if (line.startsWith('**') && line.endsWith('**')) {
        elements.push(
          <h4 key={key++} className="text-md font-semibold text-gray-800 mt-4 mb-2">
            {line.replace(/\*\*/g, '')}
          </h4>
        );
      } else if (line.startsWith('- ')) {
        elements.push(
          <li key={key++} className="ml-4 mb-1 text-gray-700">
            {line.replace('- ', '')}
          </li>
        );
      } else if (line === '') {
        elements.push(<div key={key++} className="mb-2" />);
      } else if (line.length > 0) {
        elements.push(
          <p key={key++} className="mb-2 text-gray-700">
            {line}
          </p>
        );
      }
    }

    return elements;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center">
              <div className="text-red-600 text-lg font-semibold mb-4">
                Error Loading Site Rules
              </div>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchSiteRules}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Site Rules - Bama Classifieds</title>
        <meta name="description" content="User rules and guidelines for Bama Classifieds platform" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {siteRules?.title || 'Site Rules'}
                </h1>
                {siteRules && (
                  <p className="text-gray-600 mt-2">
                    Version {siteRules.version} • Effective {formatDate(siteRules.effective_date)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">
                  Last Updated: {siteRules ? formatDate(siteRules.effective_date) : 'N/A'}
                </div>
              </div>
            </div>

            {/* User Acceptance History */}
            {user && userHistory.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Your Acceptance History
                </h3>
                <div className="space-y-2">
                  {userHistory.map((history, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-blue-800">
                        Version {history.rules_version}
                      </span>
                      <span className="text-blue-600">
                        Accepted: {formatDate(history.accepted_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rules Content */}
          <div className="bg-white rounded-lg shadow p-8">
            <div className="prose prose-lg max-w-none">
              {siteRules && renderMarkdownContent(siteRules.content)}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                By using Bama Classifieds, you agree to abide by these rules and guidelines.
              </p>
              <div className="flex justify-center space-x-4 text-sm text-gray-500">
                <span>Questions? Contact us at support@bamaclassifieds.com</span>
                <span>•</span>
                <span>Report violations using our reporting tools</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SiteRules;
