import React from 'react';
import { User } from 'firebase/auth';

interface HeaderProps {
    setView: (view: { page: 'home' } | { page: 'weeklyMarks' } | { page: 'dashboard' }) => void;
    user: User | null;
    onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ setView, user, onSignOut }) => {
    return (
        <header className="bg-sky-600 dark:bg-sky-800 text-white shadow-md">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">BB Manager</h1>
                <div className="flex items-center space-x-2 sm:space-x-4">
                    {user ? (
                        <>
                            <button 
                                onClick={() => setView({ page: 'home' })}
                                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-sky-700 dark:hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-800 focus:ring-white"
                            >
                                Home
                            </button>
                             <button 
                                onClick={() => setView({ page: 'dashboard' })}
                                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-sky-700 dark:hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-800 focus:ring-white"
                            >
                                Dashboard
                            </button>
                            <button 
                                onClick={() => setView({ page: 'weeklyMarks' })}
                                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-sky-700 dark:hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-800 focus:ring-white"
                            >
                                Weekly Marks
                            </button>
                             <div className="hidden sm:flex items-center space-x-2 border-l border-sky-500 pl-4 ml-2">
                                <span className="text-sm truncate">{user.email}</span>
                                <button 
                                    onClick={onSignOut}
                                    className="px-3 py-2 rounded-md text-sm font-medium bg-sky-700 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-800 focus:ring-white"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </>
                    ) : null}
                </div>
            </nav>
        </header>
    );
};

export default Header;