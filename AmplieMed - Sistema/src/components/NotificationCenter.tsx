import { useState } from 'react';
import { Bell, Calendar, DollarSign, FileText, Shield, X, Check, Trash2, Clock } from 'lucide-react';
import { useApp } from './AppContext';
import type { AppNotification } from './AppContext';

type Notification = AppNotification;

interface NotificationCenterProps {
  onClose: () => void;
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    unreadNotificationCount,
  } = useApp();

  const [filterType, setFilterType] = useState<'all' | Notification['type']>('all');

  const filtered = filterType === 'all'
    ? notifications
    : notifications.filter(n => n.type === filterType);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="w-4 h-4" />;
      case 'payment':
        return <DollarSign className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      case 'security':
        return <Shield className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'appointment':
        return 'bg-pink-600 text-white';
      case 'payment':
        return 'bg-green-600 text-white';
      case 'document':
        return 'bg-orange-600 text-white';
      case 'security':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      
      {/* Notification Panel */}
      <div className="fixed top-16 right-4 w-96 max-h-[600px] bg-white border border-gray-200 shadow-lg z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-gray-900 flex items-center gap-2">
              Notificações
              {unreadNotificationCount > 0 && (
                <span className="px-2 py-0.5 bg-pink-600 text-white text-xs">
                  {unreadNotificationCount}
                </span>
              )}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {unreadNotificationCount > 0 && (
              <button 
                onClick={markAllNotificationsRead}
                className="text-xs text-pink-600 hover:text-pink-700"
              >
                Marcar todas como lidas
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Nenhuma notificação</p>
            </div>
          ) : (
            <div>
              {filtered.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors group ${
                    !notification.read ? 'bg-pink-50/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${getIconColor(notification.type)}`}>
                      {getIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm ${!notification.read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          {notification.urgent && (
                            <span className="px-1.5 py-0.5 bg-red-600 text-white text-xs">
                              Urgente
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {notification.time}
                        </p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                            <button
                              onClick={() => markNotificationRead(notification.id)}
                              className="p-1 hover:bg-gray-200 transition-colors"
                              title="Marcar como lida"
                            >
                              <Check className="w-3 h-3 text-gray-600" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 hover:bg-gray-200 transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-3 h-3 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200">
          <button className="w-full py-2 text-sm text-pink-600 hover:bg-pink-50 transition-colors">
            Ver todas as notificações
          </button>
        </div>
      </div>
    </>
  );
}