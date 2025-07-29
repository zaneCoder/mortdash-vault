'use client';

import { useState, ReactNode, createContext, useContext, useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  type: 'success' | 'error';
  message: string;
}

interface MessageContextType {
  messages: Message[];
  addMessage: (message: Omit<Message, 'id'>) => void;
  removeMessage: (id: string) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = (message: Omit<Message, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newMessage = { ...message, id };
    
    setMessages(prev => [...prev, newMessage]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      removeMessage(id);
    }, 4000);
  };

  const removeMessage = (id: string) => {
    setMessages(prev => prev.filter(message => message.id !== id));
  };

  // Register the message instance globally
  useEffect(() => {
    setMessageInstance({ addMessage, removeMessage });
  }, []);

  return (
    <MessageContext.Provider value={{ messages, addMessage, removeMessage }}>
      {children}
      <MessageContainer />
    </MessageContext.Provider>
  );
}

function MessageContainer() {
  const { messages, removeMessage } = useMessage();

  if (messages.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {messages.map((messageItem) => (
        <Message key={messageItem.id} message={messageItem} onRemove={removeMessage} />
      ))}
    </div>
  );
}

function Message({ message, onRemove }: { message: Message; onRemove: (id: string) => void }) {
  const getMessageStyles = () => {
    switch (message.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex items-center p-4 rounded-lg border shadow-lg max-w-sm ${getMessageStyles()}`}>
      <div className="flex-shrink-0 mr-3">
        {getIcon()}
      </div>
      <div className="flex-1 text-sm font-medium">
        {message.message}
      </div>
      <button
        onClick={() => onRemove(message.id)}
        className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useMessage() {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessage must be used within a MessageProvider');
  }
  return context;
}

// Global message instance
let messageInstance: any = null;

export const setMessageInstance = (instance: any) => {
  messageInstance = instance;
};

export const message = {
  success: (messageText: string) => {
    if (messageInstance) {
      messageInstance.addMessage({ type: 'success', message: messageText });
    } else {
      console.warn('Message instance not available');
    }
  },
  error: (messageText: string) => {
    if (messageInstance) {
      messageInstance.addMessage({ type: 'error', message: messageText });
    } else {
      console.warn('Message instance not available');
    }
  },
}; 