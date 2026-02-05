import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import NotificationModal from '../components/NotificationModal';

type NotificationType = 'success' | 'error' | 'info';

interface NotificationContextType {
    showNotification: (message: string, type?: NotificationType) => void;
    showConfirm: (message: string, onConfirm: () => void, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notification, setNotification] = useState<{
        message: string;
        type: NotificationType | 'confirm';
        isOpen: boolean;
        title?: string;
        onSafeConfirm?: () => void;
    }>({
        message: '',
        type: 'info',
        isOpen: false,
    });

    const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
        setNotification({ message, type, isOpen: true, title: 'System Message' });
    }, []);

    const showConfirm = useCallback((message: string, onConfirm: () => void, title: string = 'Confirm Action') => {
        setNotification({
            message,
            type: 'confirm',
            isOpen: true,
            title,
            onSafeConfirm: onConfirm
        });
    }, []);

    const closeNotification = useCallback(() => {
        setNotification((prev) => ({ ...prev, isOpen: false }));
    }, []);

    return (
        <NotificationContext.Provider value={{ showNotification, showConfirm }}>
            {children}
            <NotificationModal
                isOpen={notification.isOpen}
                message={notification.message}
                type={notification.type === 'confirm' ? 'info' : notification.type}
                title={notification.title}
                showConfirmButtons={notification.type === 'confirm'}
                onConfirm={() => {
                    if (notification.onSafeConfirm) notification.onSafeConfirm();
                    closeNotification();
                }}
                onClose={closeNotification}
            />
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
