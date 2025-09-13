import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';

interface PricingManagerProps {
  onClose: () => void;
}

interface PricingConfig {
  id: string;
  config_key: string;
  config_value: any;
  description: string;
  is_active: boolean;
}

export function PricingManager({ onClose }: PricingManagerProps) {
  const [editingConfig, setEditingConfig] = useState<PricingConfig | null>(null);
  const [formData, setFormData] = useState({
    config_value: 0,
    description: ''
  });

  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery(
    'pricing-configs',
    async () => {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .order('config_key');
      
      if (error) throw error;
      return data as PricingConfig[];
    }
  );

  const updateConfigMutation = useMutation(
    async ({ id, updates }: { id: string; updates: Partial<PricingConfig> }) => {
      const { data, error } = await supabase
        .from('pricing_config')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pricing-configs');
        setEditingConfig(null);
      }
    }
  );

  const handleEdit = (config: PricingConfig) => {
    setEditingConfig(config);
    setFormData({
      config_value: typeof config.config_value === 'number' ? config.config_value : 0,
      description: config.description
    });
  };

  const handleSave = () => {
    if (!editingConfig) return;

    updateConfigMutation.mutate({
      id: editingConfig.id,
      updates: {
        config_value: formData.config_value,
        description: formData.description
      }
    });
  };

  const handleCancel = () => {
    setEditingConfig(null);
    setFormData({ config_value: 0, description: '' });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-center mt-4">Loading pricing configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Pricing Management</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          {configs?.map((config) => (
            <div key={config.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 capitalize">
                    {config.config_key.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {config.description}
                  </p>
                  <div className="mt-2">
                    {editingConfig?.id === config.id ? (
                      <div className="flex items-center space-x-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Price ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.config_value}
                            onChange={(e) => setFormData({
                              ...formData,
                              config_value: parseFloat(e.target.value) || 0
                            })}
                            className="mt-1 block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({
                              ...formData,
                              description: e.target.value
                            })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSave}
                            disabled={updateConfigMutation.isLoading}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                          >
                            <CheckIcon className="h-4 w-4 mr-1" />
                            Save
                          </button>
                          <button
                            onClick={handleCancel}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold text-primary-600">
                          ${typeof config.config_value === 'number' ? config.config_value.toFixed(2) : config.config_value}
                        </div>
                        <button
                          onClick={() => handleEdit(config)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          <PencilIcon className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}