import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { MenuIcon, XIcon, CogIcon, SwitchHorizontalIcon, QuestionMarkCircleIcon } from './Icons';
import { Page, Section } from '../types';

interface HeaderProps {
    setView: (view: { page: Page }) => void;
    user: User | null;
    onSignOut: () => void;
    activeSection: Section;
    onSwitchSection: () => void;
}

const Header: React.FC<HeaderProps> = ({ setView, user, onSignOut, activeSection, onSwitchSection }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const handleNavClick = (page: Page) => {
        setView({ page });
        setIsMenuOpen(false);
    };

    const isCompany = activeSection === 'company';
    const sectionName = isCompany ? 'Company Section' : 'Junior Section';

    const bgColor = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
    const ringColor = 'focus:ring-white';
    const ringOffsetColor = isCompany ? 'focus:ring-offset-company-blue' : 'focus:ring-offset-junior-blue';

    const navLinkClasses = `px-3 py-2 rounded-md text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${ringOffsetColor} ${ringColor}`;
    const iconButtonClasses = `p-2 rounded-full text-gray-200 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${ringOffsetColor} ${ringColor}`;
    const mobileNavLinkClasses = `block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-200 hover:bg-white/10 hover:text-white`;

    return (
        <header className={`${bgColor} text-white shadow-md sticky top-0 z-20`}>
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => handleNavClick('home')} 
                            className={`focus:outline-none focus:ring-2 focus:ring-offset-2 ${ringOffsetColor} ${ringColor} rounded-md`}
                            aria-label="Go to Home page"
                        >
                            <img 
                                src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" 
                                alt="The Boys' Brigade Logo" 
                                className="h-14 rounded-md"
                            />
                        </button>
                        <div className="hidden sm:flex items-center border-l border-white/20 pl-4">
                          <img
                            src={isCompany ? "https://i.postimg.cc/0j44DjdY/company-boxed-colour.png" : "https://i.postimg.cc/W1qvWLdp/juniors-boxed-colour.png"}
                            alt={`${sectionName} Logo`}
                            className="h-12 rounded-md"
                          />
                        </div>
                    </div>
                    
                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-2">
                        {user && (
                            <>
                                <button onClick={() => handleNavClick('home')} className={navLinkClasses}>Home</button>
                                <button onClick={() => handleNavClick('dashboard')} className={navLinkClasses}>Dashboard</button>
                                <button onClick={() => handleNavClick('weeklyMarks')} className={navLinkClasses}>Weekly Marks</button>
                                <button onClick={() => handleNavClick('auditLog')} className={navLinkClasses}>Audit Log</button>
                                
                                <button onClick={() => handleNavClick('help')} title="Help" aria-label="Help" className={iconButtonClasses}>
                                    <QuestionMarkCircleIcon className="h-6 w-6"/>
                                </button>
                                <button onClick={() => handleNavClick('settings')} title="Settings" aria-label="Settings" className={iconButtonClasses}>
                                    <CogIcon className="h-6 w-6"/>
                                </button>
                                <button onClick={onSwitchSection} title="Switch Section" aria-label="Switch Section" className={iconButtonClasses}>
                                    <SwitchHorizontalIcon className="h-6 w-6"/>
                                </button>
                                
                                <div className="flex items-center space-x-2 border-l border-white/20 pl-4 ml-2">
                                    <span className="text-sm text-gray-300 truncate max-w-[120px]">{user.email}</span>
                                    <button onClick={onSignOut} className={`px-3 py-2 rounded-md text-sm font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 ${ringOffsetColor} ${ringColor}`}>Sign Out</button>
                                </div>
                            </>
                        )}
                    </div>
                    
                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        {user && (
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset ${ringColor}`}>
                                <span className="sr-only">Open main menu</span>
                                {isMenuOpen ? <XIcon className="block h-6 w-6" /> : <MenuIcon className="block h-6 w-6" />}
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            {isMenuOpen && user && (
                <div className={`md:hidden absolute w-full ${bgColor} shadow-lg z-30`} id="mobile-menu">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <button onClick={() => handleNavClick('home')} className={mobileNavLinkClasses}>Home</button>
                        <button onClick={() => handleNavClick('dashboard')} className={mobileNavLinkClasses}>Dashboard</button>
                        <button onClick={() => handleNavClick('weeklyMarks')} className={mobileNavLinkClasses}>Weekly Marks</button>
                        <button onClick={() => handleNavClick('auditLog')} className={mobileNavLinkClasses}>Audit Log</button>
                        <button onClick={() => handleNavClick('help')} className={mobileNavLinkClasses}>
                            <div className="flex items-center"><QuestionMarkCircleIcon className="h-5 w-5 mr-3"/><span>Help</span></div>
                        </button>
                        <button onClick={() => handleNavClick('settings')} className={mobileNavLinkClasses}>
                            <div className="flex items-center"><CogIcon className="h-5 w-5 mr-3"/><span>Settings</span></div>
                        </button>
                        <button onClick={onSwitchSection} className={mobileNavLinkClasses}>
                            <div className="flex items-center"><SwitchHorizontalIcon className="h-5 w-5 mr-3"/><span>Switch Section</span></div>
                        </button>
                    </div>
                    <div className="pt-4 pb-3 border-t border-white/20">
                        <div className="flex items-center px-5">
                            <div className="ml-3">
                                <div className="text-base font-medium leading-none text-white">{user.email}</div>
                            </div>
                        </div>
                        <div className="mt-3 px-2 space-y-1">
                            <button onClick={onSignOut} className={mobileNavLinkClasses}>Sign out</button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;