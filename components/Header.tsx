/**
 * @file Header.tsx
 * @description The main header and navigation bar for the application.
 * It provides links to different pages, displays user information, and handles sign-out
 * and section switching. The header's appearance dynamically changes based on the active section.
 */

import React, { useState, useRef, useEffect } from 'react';
// FIX: Use named imports for Supabase compatibility.
import { type User } from '@supabase/supabase-js';
import { MenuIcon, XIcon, CogIcon, QuestionMarkCircleIcon, UserCircleIcon, SwitchHorizontalIcon, LogOutIcon } from './Icons'; // Added LogOutIcon and SwitchHorizontalIcon
import { Page, Section, UserRole } from '../types'; // Import UserRole

interface HeaderProps {
    /** Function to change the current view/page. */
    setView: (view: { page: Page }) => void;
    /** The currently authenticated Firebase user object, or null if not signed in. */
    // FIX: Use User type from named import.
    user: User | null;
    /** Callback function to handle the sign-out process. */
    onSignOut: () => void;
    /** The currently active section ('company' or 'junior'). */
    activeSection: Section;
    /** Callback function to handle switching between sections. */
    onSwitchSection: () => void;
    /** The role of the currently logged-in user. */
    userRole: UserRole | null;
    /** Callback to open the help modal. */
    onOpenHelpModal: () => void;
}

const Header: React.FC<HeaderProps> = ({ setView, user, onSignOut, activeSection, onSwitchSection, userRole, onOpenHelpModal }) => {
    // State to manage the visibility of the mobile menu.
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    // State to manage the visibility of the desktop profile dropdown.
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null); // Ref for the profile dropdown

    /**
     * Handles navigation clicks from both desktop and mobile menus.
     * @param page The page to navigate to.
     */
    const handleNavClick = (page: Page) => {
        setView({ page });
        setIsMenuOpen(false); // Close mobile menu after navigation
        setIsProfileMenuOpen(false); // Close profile menu after navigation
    };

    /**
     * Closes the profile dropdown if a click occurs outside of it.
     */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [profileMenuRef]);

    // Determine section-specific assets and styles.
    const isCompany = activeSection === 'company';
    const sectionName = isCompany ? 'Company Section' : 'Junior Section';
    const bgColor = isCompany ? 'bg-company-blue' : 'bg-junior-blue';
    const ringOffsetColor = isCompany ? 'focus:ring-offset-company-blue' : 'focus:ring-offset-junior-blue';
    const ringColor = 'focus:ring-white';

    // Shared Tailwind CSS class strings for consistent styling.
    const navLinkClasses = `px-3 py-2 rounded-md text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${ringOffsetColor} ${ringColor}`;
    const iconButtonClasses = `p-2 rounded-full text-gray-200 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${ringOffsetColor} ${ringColor}`;
    const mobileNavLinkClasses = `block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-200 hover:bg-white/10 hover:text-white`;
    const dropdownItemClasses = `flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 w-full text-left`;


    // Permission checks
    const canAccessSectionSettings = userRole && ['admin', 'captain'].includes(userRole);
    const canAccessAuditLog = userRole && ['admin', 'captain'].includes(userRole);

    return (
        <header className={`${bgColor} text-white shadow-md sticky top-0 z-20`}>
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <div className="flex items-center space-x-2 lg:space-x-4"> {/* Adjusted spacing for lg */}
                        {/* Main BB Logo - acts as a "Home" button */}
                        <button 
                            onClick={() => handleNavClick('home')} 
                            className={`focus:outline-none focus:ring-2 focus:ring-offset-2 ${ringOffsetColor} ${ringColor} rounded-md`}
                            aria-label="Go to Home page"
                        >
                            <img 
                                src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" 
                                alt="The Boys' Brigade Logo" 
                                className="h-14 rounded-md" // Consistent size for main logo
                            />
                        </button>
                        {/* Section-specific logo, hidden by default, shown on lg and up */}
                        <div className="hidden lg:flex items-center border-l border-white/20 pl-4">
                          <img
                            src={isCompany ? "https://i.postimg.cc/0j44DjdY/company-boxed-colour.png" : "https://i.postimg.cc/W1qvWLdp/juniors-boxed-colour.png"}
                            alt={`${sectionName} Logo`}
                            className="h-10 rounded-md"
                          />
                        </div>
                    </div>
                    
                    {/* Desktop Menu */}
                    <div className="hidden lg:flex items-center space-x-2">
                        {user && (
                            <>
                                <button onClick={() => handleNavClick('home')} className={navLinkClasses}>Home</button>
                                <button onClick={() => handleNavClick('dashboard')} className={navLinkClasses}>Dashboard</button>
                                <button onClick={() => handleNavClick('weeklyMarks')} className={navLinkClasses}>Weekly Marks</button>
                                {canAccessAuditLog && (
                                    <button onClick={() => handleNavClick('auditLog')} className={navLinkClasses}>Audit Log</button>
                                )}
                                
                                {/* Icon-based buttons for less frequent actions */}
                                <button onClick={() => { onOpenHelpModal(); setIsProfileMenuOpen(false); }} title="Help" aria-label="Help" className={iconButtonClasses}>
                                    <QuestionMarkCircleIcon className="h-6 w-6"/>
                                </button>
                                {canAccessSectionSettings && (
                                    <button onClick={() => handleNavClick('settings')} title="Section Settings" aria-label="Section Settings" className={iconButtonClasses}>
                                        <CogIcon className="h-6 w-6"/>
                                    </button>
                                )}
                                
                                {/* User Profile Dropdown */}
                                <div className="relative ml-2" ref={profileMenuRef}>
                                    <button 
                                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} 
                                        className={iconButtonClasses}
                                        aria-label="User menu"
                                        aria-haspopup="true"
                                        aria-expanded={isProfileMenuOpen ? 'true' : 'false'}
                                    >
                                        <UserCircleIcon className="h-7 w-7" />
                                    </button>
                                    {isProfileMenuOpen && (
                                        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button">
                                            <div className="py-1">
                                                <p className="block px-4 py-2 text-sm text-slate-500 truncate border-b border-slate-100">{user.email}</p>
                                                <button onClick={() => handleNavClick('accountSettings')} className={dropdownItemClasses} role="menuitem">
                                                    <CogIcon className="h-5 w-5 mr-2 text-slate-500" />
                                                    Account Settings
                                                </button>
                                                <button onClick={() => { onSwitchSection(); setIsProfileMenuOpen(false); }} className={dropdownItemClasses} role="menuitem">
                                                    <SwitchHorizontalIcon className="h-5 w-5 mr-2 text-slate-500" />
                                                    Switch Section
                                                </button>
                                                <button onClick={() => { onSignOut(); setIsProfileMenuOpen(false); }} className={dropdownItemClasses} role="menuitem">
                                                    <LogOutIcon className="h-5 w-5 mr-2 text-slate-500" />
                                                    Log Out
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    
                    {/* Mobile Menu Button (Hamburger Icon) */}
                    <div className="lg:hidden flex items-center">
                        {user && (
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset ${ringColor}`}>
                                <span className="sr-only">Open main menu</span>
                                {isMenuOpen ? <XIcon className="block h-6 w-6" /> : <MenuIcon className="block h-6 w-6" />}
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Panel */}
            {isMenuOpen && user && (
                <div className={`lg:hidden absolute w-full ${bgColor} shadow-lg z-30`} id="mobile-menu">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        <button onClick={() => handleNavClick('home')} className={mobileNavLinkClasses}>Home</button>
                        <button onClick={() => handleNavClick('dashboard')} className={mobileNavLinkClasses}>Dashboard</button>
                        <button onClick={() => handleNavClick('weeklyMarks')} className={mobileNavLinkClasses}>Weekly Marks</button>
                        {canAccessAuditLog && (
                            <button onClick={() => handleNavClick('auditLog')} className={mobileNavLinkClasses}>Audit Log</button>
                        )}
                        <button onClick={() => { onOpenHelpModal(); setIsMenuOpen(false); }} className={mobileNavLinkClasses}>
                            <div className="flex items-center"><QuestionMarkCircleIcon className="h-5 w-5 mr-3"/><span>Help</span></div>
                        </button>
                        {canAccessSectionSettings && (
                            <button onClick={() => handleNavClick('settings')} className={mobileNavLinkClasses}>
                                <div className="flex items-center"><CogIcon className="h-5 w-5 mr-3"/><span>Section Settings</span></div>
                            </button>
                        )}
                        {/* Profile-related options in mobile menu */}
                        <div className="pt-2 mt-2 border-t border-white/20">
                            <p className="block px-3 py-2 text-base font-medium text-gray-200">{user.email}</p>
                            <button onClick={() => handleNavClick('accountSettings')} className={mobileNavLinkClasses}>
                                <div className="flex items-center"><CogIcon className="h-5 w-5 mr-3"/><span>Account Settings</span></div>
                            </button>
                            <button onClick={() => { onSwitchSection(); setIsMenuOpen(false); }} className={mobileNavLinkClasses}>
                                <div className="flex items-center"><SwitchHorizontalIcon className="h-5 w-5 mr-3"/><span>Switch Section</span></div>
                            </button>
                            <button onClick={() => { onSignOut(); setIsMenuOpen(false); }} className={mobileNavLinkClasses}>
                                <div className="flex items-center"><LogOutIcon className="h-5 w-5 mr-3"/><span>Log Out</span></div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;