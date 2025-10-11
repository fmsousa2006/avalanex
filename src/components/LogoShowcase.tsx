import { X } from 'lucide-react';
import Logo1 from './logos/Logo1';
import Logo2 from './logos/Logo2';
import Logo3 from './logos/Logo3';
import Logo4 from './logos/Logo4';
import Logo5 from './logos/Logo5';

interface LogoShowcaseProps {
  onClose: () => void;
}

export default function LogoShowcase({ onClose }: LogoShowcaseProps) {
  const logos = [
    {
      id: 1,
      component: Logo1,
      name: 'Mountain Peak',
      description: 'Modern geometric design with ascending triangle representing growth and peak performance',
      colors: 'Blue gradient with white accents',
    },
    {
      id: 2,
      component: Logo2,
      name: 'Growth Chart',
      description: 'Upward trending line chart symbolizing portfolio growth and dividend increases',
      colors: 'Green gradient representing financial growth',
    },
    {
      id: 3,
      component: Logo3,
      name: 'Avalanche Stack',
      description: 'Layered mountain design representing accumulation and dividend stacking',
      colors: 'Indigo/purple gradient with depth',
    },
    {
      id: 4,
      component: Logo4,
      name: 'Monogram A',
      description: 'Bold lettermark with subtle market wave pattern in background',
      colors: 'Cyan/teal professional gradient',
    },
    {
      id: 5,
      component: Logo5,
      name: 'Dividend Drop',
      description: 'Mountain with dividend payment indicators, representing recurring income streams',
      colors: 'Red/orange gradient with energy',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Avalanex Logo Concepts</h2>
            <p className="text-gray-400 text-sm mt-1">Choose your preferred logo design</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {logos.map((logo) => (
            <div
              key={logo.id}
              className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors border border-gray-700"
            >
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 space-y-4">
                  <div className="bg-white rounded-xl p-8 flex items-center justify-center">
                    <logo.component size={120} />
                  </div>
                  <div className="bg-gray-900 rounded-xl p-8 flex items-center justify-center">
                    <logo.component size={120} />
                  </div>
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 flex items-center justify-center">
                    <logo.component size={120} />
                  </div>
                </div>

                <div className="flex-1 pt-2">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold text-white">{logo.name}</h3>
                    <span className="text-sm text-gray-500">Option {logo.id}</span>
                  </div>

                  <p className="text-gray-300 mb-4 leading-relaxed">
                    {logo.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-400">Color Scheme:</span>
                      <span className="text-sm text-gray-300">{logo.colors}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2">
                    <logo.component size={32} />
                    <span className="text-lg font-bold text-white">Avalanex</span>
                    <span className="text-gray-500 ml-2">Preview with text</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              All logos are scalable SVG format and can be customized with different colors
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
