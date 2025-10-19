import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

interface NotificationProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500',
          textColor: 'text-green-400',
          iconColor: 'text-green-400',
        };
      case 'error':
        return {
          icon: XCircle,
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500',
          textColor: 'text-red-400',
          iconColor: 'text-red-400',
        };
      case 'info':
        return {
          icon: AlertCircle,
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500',
          textColor: 'text-blue-400',
          iconColor: 'text-blue-400',
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-2 duration-300">
      <div
        className={`flex items-center space-x-3 ${config.bgColor} ${config.borderColor} border rounded-lg p-4 shadow-lg max-w-md`}
      >
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0`} />
        <p className={`${config.textColor} text-sm flex-1`}>{message}</p>
        <button
          onClick={onClose}
          className={`${config.textColor} hover:opacity-70 transition-opacity flex-shrink-0`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
