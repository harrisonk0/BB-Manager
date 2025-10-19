import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { MenuIcon, XIcon } from './Icons';
import { Page } from '../types';

interface HeaderProps {
    setView: (view: { page: Page }) => void;
    user: User | null;
    onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ setView, user, onSignOut }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const handleNavClick = (page: Page) => {
        setView({ page });
        setIsMenuOpen(false);
    };

    return (
        <header className="bg-bb-blue text-white shadow-md sticky top-0 z-20">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <button 
                        onClick={() => handleNavClick('home')} 
                        className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bb-blue focus:ring-white rounded-md"
                        aria-label="Go to Home page"
                    >
                        <img 
                            src="https://i.postimg.cc/76v1rXkf/temp-Image8-Qmy6-T.avif" 
                            alt="BBNI The Northern Ireland Boys' Brigade Logo" 
                            className="h-14"
                        />
                    </button>
                    
                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-2 sm:space-x-4">
                        {user && (
                            <>
                                <button onClick={() => handleNavClick('home')} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-black hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white">Home</button>
                                <button onClick={() => handleNavClick('dashboard')} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-black hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white">Dashboard</button>
                                <button onClick={() => handleNavClick('weeklyMarks')} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-black hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white">Weekly Marks</button>
                                <button onClick={() => handleNavClick('auditLog')} className="px-3 py-2 rounded-md text-sm font-medium hover:bg-black hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white">Audit Log</button>
                                <div className="flex items-center space-x-2 border-l border-white/20 pl-4 ml-2">
                                    <span className="text-sm truncate">{user.email}</span>
                                    <button onClick={onSignOut} className="px-3 py-2 rounded-md text-sm font-medium bg-black/20 hover:bg-black/30 focus:outline-none focus:ring-2 focus:ring-white">Sign Out</button>
                                </div>
                            </>
                        )}
                    </div>
                    
                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        {user && (
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-blue-100 hover:text-white hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                                <span className="sr-only">Open main menu</span>
                                {isMenuOpen ? <XIcon className="block h-6 w-6" /> : <MenuIcon className="block h-6 w-6" />}
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            {isMenuOpen && user && (
                <div className="md:hidden absolute w-full bg-bb-blue z-30" id="mobile-menu">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <button onClick={() => handleNavClick('home')} className="text-blue-100 hover:bg-black/20 hover:text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium">Home</button>
                        <button onClick={() => handleNavClick('dashboard')} className="text-blue-100 hover:bg-black/20 hover:text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium">Dashboard</button>
                        <button onClick={() => handleNavClick('weeklyMarks')} className="text-blue-100 hover:bg-black/20 hover:text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium">Weekly Marks</button>
                        <button onClick={() => handleNavClick('auditLog')} className="text-blue-100 hover:bg-black/20 hover:text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium">Audit Log</button>
                    </div>
                    <div className="pt-4 pb-3 border-t border-white/20">
                        <div className="flex items-center px-5">
                            <div className="ml-3">
                                <div className="text-base font-medium leading-none text-white">{user.email}</div>
                            </div>
                        </div>
                        <div className="mt-3 px-2 space-y-1">
                            <button onClick={onSignOut} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-blue-200 hover:text-white hover:bg-black/20">Sign out</button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;