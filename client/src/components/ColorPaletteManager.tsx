import React, { useState } from 'react';
import { useColorPalette, ColorPalette } from '../contexts/ColorPaletteContext';

export function ColorPaletteManager() {
  const { currentPalette, setPalette, availablePalettes, customPalette, setCustomPalette } = useColorPalette();
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customColors, setCustomColors] = useState<ColorPalette['primary']>(customPalette?.primary || availablePalettes.crimson.primary);
  const [customAccent, setCustomAccent] = useState<ColorPalette['accent']>(customPalette?.accent || availablePalettes.crimson.accent);

  const handlePaletteChange = (paletteKey: string) => {
    if (paletteKey === 'custom') {
      setIsCustomizing(true);
    } else {
      setPalette(paletteKey);
      setIsCustomizing(false);
    }
  };

  const handleCustomColorChange = (shade: keyof ColorPalette['primary'], color: string) => {
    setCustomColors(prev => ({
      ...prev,
      [shade]: color
    }));
  };

  const handleCustomAccentChange = (shade: keyof ColorPalette['accent'], color: string) => {
    setCustomAccent(prev => ({
      ...prev,
      [shade]: color
    }));
  };

  const saveCustomPalette = () => {
    const newCustomPalette: ColorPalette = {
      name: 'Custom',
      description: 'Custom color palette',
      primary: customColors,
      accent: customAccent
    };
    setCustomPalette(newCustomPalette);
    setPalette('custom');
    setIsCustomizing(false);
  };

  const ColorSwatch = ({ color, label, onChange }: { color: string; label: string; onChange?: (color: string) => void }) => (
    <div className="flex items-center space-x-3">
      <div 
        className="w-8 h-8 rounded-lg border-2 border-gray-300 cursor-pointer"
        style={{ backgroundColor: color }}
        onClick={() => onChange && onChange(color)}
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500 font-mono">{color}</div>
      </div>
      {onChange && (
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border-0 cursor-pointer"
        />
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Color Palette Management</h3>
        <p className="text-sm text-gray-600">Choose a predefined palette or create your own custom colors.</p>
      </div>

      {/* Predefined Palettes */}
      <div className="mb-8">
        <h4 className="text-md font-medium text-gray-900 mb-4">Predefined Palettes</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(availablePalettes).map(([key, palette]) => (
            <div
              key={key}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                currentPalette.name === palette.name && !isCustomizing
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handlePaletteChange(key)}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="flex space-x-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: palette.primary[500] }} />
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: palette.primary[600] }} />
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: palette.primary[700] }} />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{palette.name}</div>
                  <div className="text-sm text-gray-500">{palette.description}</div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Custom Palette Option */}
          <div
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              isCustomizing
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handlePaletteChange('custom')}
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-8 rounded bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
                <span className="text-white text-xs font-bold">+</span>
              </div>
              <div>
                <div className="font-medium text-gray-900">Custom</div>
                <div className="text-sm text-gray-500">Create your own</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Color Editor */}
      {isCustomizing && (
        <div className="border-t pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Custom Color Palette</h4>
          <div className="space-y-4">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Primary Colors</h5>
            {Object.entries(customColors).map(([shade, color]) => (
              <ColorSwatch
                key={shade}
                color={color}
                label={`Primary ${shade}`}
                onChange={(newColor) => handleCustomColorChange(shade as keyof ColorPalette['primary'], newColor)}
              />
            ))}
            
            <div className="border-t pt-4 mt-6">
              <h5 className="text-sm font-medium text-gray-900 mb-3">Accent Colors (for "Great Deal" text)</h5>
              <div className="space-y-3">
                <ColorSwatch
                  color={customAccent.from}
                  label="Accent From"
                  onChange={(newColor) => handleCustomAccentChange('from', newColor)}
                />
                <ColorSwatch
                  color={customAccent.to}
                  label="Accent To"
                  onChange={(newColor) => handleCustomAccentChange('to', newColor)}
                />
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg border-2 border-gray-300" style={{ 
                    background: `linear-gradient(to right, ${customAccent.from}, ${customAccent.to})` 
                  }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Preview</div>
                    <div className="text-xs text-gray-500">Gradient preview</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setIsCustomizing(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveCustomPalette}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              Save Custom Palette
            </button>
          </div>
        </div>
      )}

      {/* Current Palette Preview */}
      <div className="border-t pt-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Current Palette Preview</h4>
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Primary Colors</h5>
          {Object.entries(currentPalette.primary).map(([shade, color]) => (
            <ColorSwatch
              key={shade}
              color={color}
              label={`Primary ${shade}`}
            />
          ))}
          
          <div className="border-t pt-4 mt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Accent Colors</h5>
            <div className="space-y-3">
              <ColorSwatch
                color={currentPalette.accent.from}
                label="Accent From"
              />
              <ColorSwatch
                color={currentPalette.accent.to}
                label="Accent To"
              />
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg border-2 border-gray-300" style={{ 
                  background: `linear-gradient(to right, ${currentPalette.accent.from}, ${currentPalette.accent.to})` 
                }} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">"Great Deal" Preview</div>
                  <div className="text-xs text-gray-500">Current gradient</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
