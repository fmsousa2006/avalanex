import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  const getVariantClasses = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: 'text-red-400',
          iconBg: 'bg-red-900/30',
          button: 'bg-red-600 hover:bg-red-700',
        };
      case 'warning':
        return {
          icon: 'text-yellow-400',
          iconBg: 'bg-yellow-900/30',
          button: 'bg-yellow-600 hover:bg-yellow-700',
        };
      case 'info':
        return {
          icon: 'text-blue-400',
          iconBg: 'bg-blue-900/30',
          button: 'bg-blue-600 hover:bg-blue-700',
        };
    }
  };

  const classes = getVariantClasses();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-md w-full border border-gray-700 shadow-2xl">
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${classes.iconBg} flex items-center justify-center`}>
              <AlertTriangle className={`w-6 h-6 ${classes.icon}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
              <p className="text-gray-400 text-sm">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 hover:bg-gray-800 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 rounded-lg font-medium transition-colors text-white ${classes.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
