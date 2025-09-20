import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface EmailTemplate {
  id: string;
  name: string;
  display_name: string;
  subject: string;
  html_content: string;
  text_content: string;
  variables: Record<string, string>;
  is_active: boolean;
  is_default: boolean;
}

const EmailTemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');

  // Form state
  const [editForm, setEditForm] = useState({
    subject: '',
    html_content: '',
    text_content: ''
  });

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('📧 Loading email templates...');
      
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('display_name');

      if (error) {
        console.error('📧 Supabase error loading templates:', error);
        throw error;
      }

      console.log('📧 Templates loaded:', data);
      setTemplates(data || []);
      
      if (!data || data.length === 0) {
        setError('No email templates found. Please create some templates first.');
      }
    } catch (err: any) {
      console.error('📧 Error loading templates:', err);
      setError(`Failed to load email templates: ${err.message || err.code || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditForm({
      subject: template.subject,
      html_content: template.html_content,
      text_content: template.text_content || ''
    });
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const startEditing = () => {
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const cancelEditing = () => {
    if (selectedTemplate) {
      setEditForm({
        subject: selectedTemplate.subject,
        html_content: selectedTemplate.html_content,
        text_content: selectedTemplate.text_content || ''
      });
    }
    setIsEditing(false);
    setError('');
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setIsSaving(true);
      setError('');

      console.log('📧 Saving template:', selectedTemplate.name);

      // Update template directly
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject: editForm.subject,
          html_content: editForm.html_content,
          text_content: editForm.text_content,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTemplate.id);

      if (error) {
        console.error('📧 Error updating template:', error);
        throw error;
      }

      console.log('📧 Template saved successfully');
      setSuccess('Template updated successfully!');
      setIsEditing(false);
      
      // Update selected template in state
      setSelectedTemplate({
        ...selectedTemplate,
        subject: editForm.subject,
        html_content: editForm.html_content,
        text_content: editForm.text_content
      });
      
      // Reload templates to get updated data
      await loadTemplates();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('📧 Error saving template:', err);
      setError(`Failed to save template: ${err.message || err.code || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const renderPreview = () => {
    if (!selectedTemplate) return null;

    const content = isEditing 
      ? (previewMode === 'html' ? editForm.html_content : editForm.text_content)
      : (previewMode === 'html' ? selectedTemplate.html_content : selectedTemplate.text_content);

    // Replace variables with sample data for preview
    let previewContent = content;
    if (selectedTemplate.variables) {
      Object.entries(selectedTemplate.variables).forEach(([key, description]) => {
        const sampleValue = getSampleValue(key);
        previewContent = previewContent.replace(new RegExp(`{{${key}}}`, 'g'), sampleValue);
      });
    }

    if (previewMode === 'html') {
      return (
        <div 
          className="border rounded-lg p-4 bg-white"
          dangerouslySetInnerHTML={{ __html: previewContent }}
        />
      );
    } else {
      return (
        <div className="border rounded-lg p-4 bg-gray-50">
          <pre className="whitespace-pre-wrap text-sm text-gray-800">
            {previewContent}
          </pre>
        </div>
      );
    }
  };

  const getSampleValue = (variable: string): string => {
    const samples: Record<string, string> = {
      userName: 'John Smith',
      senderName: 'Jane Doe',
      listingTitle: 'Used iPhone 12 Pro',
      messagePreview: 'Hi, is this still available? I can pick it up today.',
      confirmationUrl: 'https://bamaclassifieds.com/confirm?token=abc123',
      resetUrl: 'https://bamaclassifieds.com/reset-password?token=xyz789',
      planName: 'Professional Plan',
      amount: '19.99'
    };
    return samples[variable] || `{{${variable}}}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Email Template Editor</h3>
        {selectedTemplate && (
          <div className="flex space-x-2">
            {!isEditing ? (
              <button
                onClick={startEditing}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
              >
                Edit Template
              </button>
            ) : (
              <>
                <button
                  onClick={cancelEditing}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTemplate}
                  disabled={isSaving}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
          <p className="text-green-600 text-sm">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1">
          <h4 className="font-medium text-gray-900 mb-3">Email Templates</h4>
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => selectTemplate(template)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{template.display_name}</div>
                <div className="text-sm text-gray-600">{template.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {template.is_active ? '✅ Active' : '❌ Inactive'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <div className="space-y-4">
              {/* Template Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900">{selectedTemplate.display_name}</h4>
                <p className="text-sm text-gray-600">Template: {selectedTemplate.name}</p>
                {selectedTemplate.variables && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Available variables:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.keys(selectedTemplate.variables).map((variable) => (
                        <span
                          key={variable}
                          className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                        >
                          {`{{${variable}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Subject Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={isEditing ? editForm.subject : selectedTemplate.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              {/* Content Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Email Content
                  </label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPreviewMode('html')}
                      className={`px-3 py-1 text-xs rounded ${
                        previewMode === 'html'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      HTML
                    </button>
                    <button
                      onClick={() => setPreviewMode('text')}
                      className={`px-3 py-1 text-xs rounded ${
                        previewMode === 'text'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Text
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Editor */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        {previewMode === 'html' ? 'HTML Content' : 'Text Content'}
                      </label>
                      <textarea
                        value={previewMode === 'html' ? editForm.html_content : editForm.text_content}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          [previewMode === 'html' ? 'html_content' : 'text_content']: e.target.value
                        })}
                        rows={20}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                        placeholder={previewMode === 'html' ? 'Enter HTML content...' : 'Enter plain text content...'}
                      />
                    </div>

                    {/* Live Preview */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Live Preview</label>
                      <div className="border border-gray-300 rounded-md h-96 overflow-auto">
                        {renderPreview()}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Read-only Preview */
                  <div>
                    <div className="border border-gray-300 rounded-md h-96 overflow-auto">
                      {renderPreview()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="mt-2">Select a template to edit</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailTemplateEditor;
