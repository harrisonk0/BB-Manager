import React from 'react';
import { Section } from '../types';
import {
    ChartBarIcon,
    PencilIcon,
    TrashIcon,
    UndoIcon,
    CogIcon,
    PlusIcon,
    QuestionMarkCircleIcon,
    SwitchHorizontalIcon,
    SaveIcon,
    SearchIcon,
    ClockIcon,
    ClipboardIcon,
} from './Icons';


// --- UI Preview & Anatomy Components ---

const LoginPreview: React.FC = () => (
    <div className="w-full max-w-sm mx-auto p-6 bg-white rounded-lg shadow-md border border-slate-200">
        <div className="text-center">
            <img src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" alt="BB Logo" className="w-24 mx-auto mb-2" />
            <h2 className="text-lg text-slate-600">Sign in to your account</h2>
        </div>
        <div className="mt-4 space-y-3">
            <input type="email" placeholder="Email address" disabled className="block w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-100 cursor-not-allowed" />
            <input type="password" placeholder="Password" disabled className="block w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-100 cursor-not-allowed" />
            <button disabled className="w-full py-2 px-4 rounded-md text-white bg-junior-blue/80 cursor-not-allowed">Sign In</button>
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <span className="font-medium text-slate-600">Please use an invite link...</span>
        </p>
    </div>
);

const SignUpPreview: React.FC = () => (
    <div className="w-full max-w-sm mx-auto p-6 bg-white rounded-lg shadow-md border border-slate-200">
        <div className="text-center">
            <img src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" alt="BB Logo" className="w-24 mx-auto mb-2" />
            <h2 className="text-lg text-slate-600">Create Officer Account</h2>
        </div>
        <div className="mt-4 space-y-3">
            <input type="email" placeholder="Email address" disabled className="block w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-100 cursor-not-allowed" />
            <input type="password" placeholder="Password" disabled className="block w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-100 cursor-not-allowed" />
            <button disabled className="w-full py-2 px-4 rounded-md text-white bg-junior-blue/80 cursor-not-allowed">Create Account</button>
        </div>
         <p className="mt-4 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <span className="font-medium text-junior-blue cursor-pointer">Sign In</span>
        </p>
    </div>
);


const SectionSelectPreview: React.FC = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto p-4 bg-slate-100 rounded-lg border border-slate-200">
        <div className="p-4 bg-company-blue text-white rounded-lg shadow-md">
            <img src="https://i.postimg.cc/0j44DjdY/company-boxed-colour.png" alt="Company Section Logo" className="w-40 mx-auto" />
            <p className="mt-2 text-slate-200 text-sm">Manage boys in school years 8-14.</p>
        </div>
        <div className="p-4 bg-junior-blue text-white rounded-lg shadow-md">
            <img src="https://i.postimg.cc/W1qvWLdp/juniors-boxed-colour.png" alt="Junior Section Logo" className="w-40 mx-auto" />
            <p className="mt-2 text-slate-200 text-sm">Manage boys in school years P4-P7.</p>
        </div>
    </div>
);

const HeaderAnatomy: React.FC = () => {
    const activeSection = localStorage.getItem('activeSection') as Section | null;
    const isCompany = activeSection === 'company';
    const bgColor = isCompany ? 'bg-company-blue' : 'bg-junior-blue';

    return (
        <div className={`relative p-4 rounded-lg shadow-lg border-2 border-slate-300 overflow-hidden ${bgColor}`}>
            <div className="flex justify-between items-center h-16 text-white">
                <div className="flex items-center space-x-2">
                    <div className="h-12 w-12 bg-white/20 rounded-md flex-shrink-0"></div>
                    <div className="hidden sm:block h-10 w-10 bg-white/20 rounded-md"></div>
                </div>
                <div className="hidden md:flex items-center space-x-2 text-sm">
                    <div className="px-2 py-1 rounded bg-white/10">Home</div>
                    <div className="px-2 py-1 rounded bg-white/10">Dashboard</div>
                    <div className="h-6 w-6 rounded-full bg-white/10"></div>
                    <div className="h-6 w-6 rounded-full bg-white/10"></div>
                </div>
                <div className="md:hidden h-6 w-6 bg-white/10 rounded"></div>
            </div>
        </div>
    );
};

const HomePageAnatomy: React.FC = () => (
    <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 space-y-4">
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center"><SearchIcon className="h-5 w-5 text-slate-400" /></div>
            <input type="text" placeholder="Search members..." disabled className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md bg-white cursor-not-allowed" />
        </div>
        <div className="relative bg-white p-4 rounded-lg shadow-md">
             <div className="flex justify-between items-baseline mb-2">
                <h3 className="text-lg font-semibold text-slate-800">Squad 1</h3>
                <div className="text-right text-sm">
                    <p className="font-semibold text-slate-600">Total Marks: 450</p>
                </div>
            </div>
            <ul className="divide-y divide-slate-200">
                <li className="py-3 flex justify-between items-center">
                    <div>
                        <p className="font-medium text-red-600">John Smith</p>
                        <p className="text-sm text-slate-500">Year 12 • Total Marks: 85</p>
                    </div>
                    <div className="flex space-x-1">
                        <div className="p-2 border rounded-full"><ChartBarIcon className="h-4 w-4 text-slate-400" /></div>
                        <div className="p-2 border rounded-full"><PencilIcon className="h-4 w-4 text-slate-400" /></div>
                        <div className="p-2 border rounded-full"><TrashIcon className="h-4 w-4 text-slate-400" /></div>
                    </div>
                </li>
            </ul>
        </div>
    </div>
);

const AddMemberFormPreview: React.FC = () => (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md border border-slate-200 space-y-4">
        <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input type="text" value="New Member Name" disabled className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-100 cursor-not-allowed" />
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-700">School Year</label>
            <select disabled className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-100 cursor-not-allowed">
                <option>Year 9</option>
            </select>
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-700">Squad</label>
            <div className="mt-2 flex gap-4">
                <label className="inline-flex items-center"><input type="radio" name="squad" disabled className="form-radio" /> <span className="ml-2">1</span></label>
                <label className="inline-flex items-center"><input type="radio" name="squad" checked readOnly className="form-radio" /> <span className="ml-2">2</span></label>
                <label className="inline-flex items-center"><input type="radio" name="squad" disabled className="form-radio" /> <span className="ml-2">3</span></label>
            </div>
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button disabled className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 rounded-md cursor-not-allowed">Cancel</button>
            <button disabled className="px-4 py-2 text-sm font-medium text-white bg-company-blue/80 rounded-md cursor-not-allowed">Add Boy</button>
        </div>
    </div>
);

const WeeklyMarksAnatomy: React.FC = () => (
     <div className="relative p-4 bg-white rounded-lg shadow-md border border-slate-200">
        <li className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="flex-1">
                <span className="text-lg font-medium text-green-600">David Miller</span>
                <p className="text-sm text-slate-500">Year 10</p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
                <button disabled className="px-3 py-1 text-sm font-medium rounded-md bg-green-600 text-white w-20 text-center cursor-not-allowed">Present</button>
                <input type="number" placeholder="0-10" disabled className="w-20 text-center px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm cursor-not-allowed" />
            </div>
        </li>
    </div>
);

const SettingsInvitePreview: React.FC = () => (
    <div className="w-full max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md border border-slate-200">
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-company-blue">Invite New Officer</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Generate a unique, single-use link to invite a new officer...
                </p>
                <div className="mt-3 flex items-stretch gap-2">
                    <input
                        type="text"
                        placeholder="Add an optional note..."
                        className="flex-grow px-3 py-2 bg-slate-100 border border-slate-300 rounded-md cursor-not-allowed"
                        disabled
                    />
                    <button
                        disabled
                        className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-company-blue/80 cursor-not-allowed"
                    >
                        Generate Invite Link
                    </button>
                </div>
            </div>
            <div className="pt-4 border-t border-slate-200">
                <h3 className="text-md font-medium text-slate-800">Pending Invite Links</h3>
                 <li className="flex items-center justify-between p-2 bg-slate-50 rounded-md mt-2">
                    <span className="text-sm text-slate-700 italic truncate">For Jane Doe</span>
                    <button disabled className="p-1.5 text-slate-400 cursor-not-allowed">
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </li>
            </div>
        </div>
    </div>
);

const Callout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-4">
        <div className="flex">
            <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
            </div>
            <div className="ml-3">
                <p className="text-sm text-blue-700">{children}</p>
            </div>
        </div>
    </div>
);

// --- Main Help Page Component ---

const HelpPage: React.FC = () => {
    const activeSection = localStorage.getItem('activeSection') as Section | null;
    const isCompany = activeSection === 'company';
    const accentTextColor = isCompany ? 'text-company-blue' : 'text-junior-blue';

    const sections = [
        { id: 'getting-started', title: '1. Getting Started', subSections: [
            { id: 'overview', title: 'App Overview' },
            { id: 'login', title: 'How to Log In' },
            { id: 'section-select', title: 'Choosing Your Section' },
            { id: 'navigation', title: 'Navigating the App' },
        ]},
        { id: 'managing-members', title: '2. Managing Members', subSections: [
            { id: 'home-page', title: 'The Member Roster' },
            { id: 'add-member', title: 'How to Add a Member' },
            { id: 'edit-member', title: 'How to Edit a Member' },
            { id: 'squad-leader', title: 'How to Set a Squad Leader' },
            { id: 'delete-member', title: 'How to Delete a Member' },
        ]},
        { id: 'weekly-marks', title: '3. Recording Weekly Marks', subSections: [
            { id: 'accessing-marks', title: 'Accessing the Marks Page' },
            { id: 'selecting-date', title: 'Selecting the Date' },
            { id: 'marking-attendance', title: 'Marking Attendance' },
            { id: 'entering-marks', title: 'Entering Marks' },
            { id: 'saving-marks', title: 'Saving Marks' },
        ]},
        { id: 'viewing-records', title: '4. Viewing & Correcting', subSections: [
            { id: 'member-history', title: 'Viewing a Member\'s History' },
            { id: 'correcting-marks', title: 'Correcting a Past Mark' },
        ]},
        { id: 'dashboard', title: '5. Dashboard & Reporting' },
        { id: 'administration', title: '6. App Administration', subSections: [
            { id: 'audit-log', title: 'The Audit Log' },
            { id: 'reverting-actions', title: 'How to Revert an Action' },
            { id: 'settings-page', title: 'Changing Settings' },
            { id: 'sign-out', title: 'Signing Out' },
        ]},
        { id: 'inviting-officers', title: '7. Inviting New Officers', subSections: [
            { id: 'sending-invite', title: 'How to Invite an Officer' },
            { id: 'creating-account-invite', title: 'Signing Up with an Invitation Link' },
        ]},
        { id: 'offline-use', title: '8. Offline Use' },
    ];

    return (
        <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col lg:flex-row gap-12">
                {/* Table of Contents */}
                <aside className="lg:w-1/4 lg:sticky lg:top-28 self-start">
                    <h2 className="text-xl font-bold text-slate-900 mb-4 border-b pb-2">Table of Contents</h2>
                    <nav>
                        <ul className="space-y-2">
                            {sections.map(section => (
                                <li key={section.id}>
                                    <a href={`#${section.id}`} className={`font-semibold ${accentTextColor} hover:underline`}>{section.title}</a>
                                    {section.subSections && (
                                        <ul className="pl-4 mt-1 space-y-1">
                                            {section.subSections.map(sub => (
                                                <li key={sub.id}>
                                                    <a href={`#${sub.id}`} className="text-slate-600 hover:text-slate-900 hover:underline text-sm">{sub.title}</a>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="lg:w-3/4 space-y-16">
                    <div className="text-center border-b pb-8">
                        <img src="https://i.postimg.cc/FHrS3pzD/full-colour-boxed-logo.png" alt="Boys' Brigade Logo" className="h-20 mx-auto" />
                        <h1 className="text-4xl font-bold text-slate-900 mt-4">User Guide</h1>
                        <p className="mt-2 text-lg text-slate-600">Your step-by-step guide to using the BB Manager app.</p>
                    </div>
                
                    {/* Getting Started */}
                    <section id="getting-started" className="space-y-8 scroll-mt-24">
                        <h2 className="text-3xl font-bold text-slate-800 border-b pb-2">1. Getting Started</h2>
                        
                        <div id="overview" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">App Overview</h3>
                            <p>Welcome! This app is designed to make managing your Boys' Brigade section simple and efficient. You can add members, track weekly marks, and view performance data, all in one place. Best of all, it works offline, so you can use it on parade night even without an internet connection.</p>
                        </div>
                        
                        <div id="login" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">How to Log In</h3>
                            <p>You will be given a unique email and password to access the app. Simply enter these credentials on the login screen to get started. If you are a new officer who has been invited, see Section 7.</p>
                            <LoginPreview />
                        </div>

                        <div id="section-select" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">Choosing Your Section</h3>
                            <p>After logging in, you'll be asked to choose between the <strong className="text-company-blue">Company Section</strong> and the <strong className="text-junior-blue">Junior Section</strong>. All data is kept separate for each section. Simply tap on the section you wish to manage.</p>
                            <SectionSelectPreview />
                        </div>
                        
                        <div id="navigation" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">Navigating the App</h3>
                            <p>The header at the top of the page is your main navigation tool. It allows you to switch between different pages, manage settings, and sign out. Its key areas are:</p>
                            <ul className="list-disc list-inside space-y-1 pl-4">
                                <li><strong>App & Section Logos:</strong> Click the main BB logo to always return to the Home page.</li>
                                <li><strong>Navigation Links:</strong> (e.g., Home, Dashboard) Quickly jump to the main pages of the app.</li>
                                <li><strong>Tools & Actions:</strong> Icons for Help (<QuestionMarkCircleIcon className="inline h-4 w-4 align-text-bottom"/>), Settings (<CogIcon className="inline h-4 w-4 align-text-bottom"/>), and Switching Sections (<SwitchHorizontalIcon className="inline h-4 w-4 align-text-bottom"/>).</li>
                                <li><strong>Sign Out:</strong> Your email is displayed next to the sign out button.</li>
                            </ul>
                            <HeaderAnatomy />
                        </div>
                    </section>

                    {/* Managing Members */}
                    <section id="managing-members" className="space-y-8 scroll-mt-24">
                        <h2 className="text-3xl font-bold text-slate-800 border-b pb-2">2. Managing Members</h2>

                        <div id="home-page" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">The Member Roster (Home Page)</h3>
                            <p>The Home page lists all members, grouped by squad. From here you can search for members, see squad performance, and access actions for each individual. The main components are:</p>
                             <ul className="list-disc list-inside space-y-1 pl-4">
                                <li><strong>Search Bar:</strong> Quickly find a member by typing their name.</li>
                                <li><strong>Squad Header:</strong> Shows the squad number and its total marks for the year.</li>
                                <li><strong>Member Card:</strong> Displays the member's name, year, and key stats.</li>
                                <li><strong>Action Buttons:</strong>
                                    <ul className="list-['-_'] list-inside pl-6">
                                        <li><ChartBarIcon className="inline h-4 w-4 align-text-bottom"/> View a member's full mark history.</li>
                                        <li><PencilIcon className="inline h-4 w-4 align-text-bottom"/> Edit a member's details.</li>
                                        <li><TrashIcon className="inline h-4 w-4 align-text-bottom"/> Delete a member.</li>
                                    </ul>
                                </li>
                            </ul>
                            <HomePageAnatomy />
                        </div>
                        
                        <div id="add-member" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">How to Add a Member</h3>
                            <p>Click the <strong className={`${accentTextColor}`}>+ Add Boy</strong> button at the top of the Home page. A form will appear where you can enter the member's name, school year, and squad. Click "Add Boy" to save.</p>
                            <AddMemberFormPreview />
                        </div>
                        
                        <div id="edit-member" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">How to Edit a Member</h3>
                            <p>On the Home page, find the member you want to edit and click the <strong className="text-slate-600">pencil icon</strong> (<PencilIcon className="inline h-4 w-4 align-text-bottom"/>). The same form will appear, allowing you to update their details.</p>
                        </div>
                        
                        <div id="squad-leader" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">How to Set a Squad Leader</h3>
                            <p>When adding or editing a boy, check the "Set as Squad Leader" box. This will display a <span className="text-xs font-semibold uppercase tracking-wider bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">Leader</span> badge next to their name on the Home page and Dashboard.</p>
                        </div>
                        
                        <div id="delete-member" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">How to Delete a Member</h3>
                            <p>Click the <strong className="text-red-600">trash can icon</strong> (<TrashIcon className="inline h-4 w-4 align-text-bottom"/>) next to a member's name. You will be asked to confirm. Don't worry, if you make a mistake, this can be undone from the Audit Log.</p>
                        </div>
                    </section>
                    
                    {/* Weekly Marks */}
                    <section id="weekly-marks" className="space-y-8 scroll-mt-24">
                        <h2 className="text-3xl font-bold text-slate-800 border-b pb-2">3. Recording Weekly Marks</h2>
                        
                        <div id="accessing-marks" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">Accessing the Marks Page</h3>
                            <p>Click on "Weekly Marks" in the header. This page lists all members by squad, ready for you to input their scores for the night. Each member's row consists of:</p>
                            <ul className="list-disc list-inside space-y-1 pl-4">
                                <li><strong>Member Details:</strong> Their name and school year.</li>
                                <li><strong>Attendance Toggle:</strong> A button to switch between "Present" and "Absent".</li>
                                <li><strong>Score Input(s):</strong> One or more fields to enter their marks for the night.</li>
                            </ul>
                            <WeeklyMarksAnatomy />
                        </div>
                        
                        <div id="selecting-date" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">Selecting the Date</h3>
                            <p>The page defaults to the nearest upcoming meeting day (which you can set in Settings). If you're entering marks for a past date, simply click the date selector at the top to choose the correct day.</p>
                        </div>
                        
                        <div id="marking-attendance" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">Marking Attendance</h3>
                            <p>By default, everyone is marked as "Present". If a member is absent, click the <strong className="text-white bg-green-600 px-1 rounded">Present</strong> button to toggle it to <strong className="text-white bg-red-600 px-1 rounded">Absent</strong>. This will disable the score inputs for that member.</p>
                        </div>
                        
                        <div id="entering-marks" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">Entering Marks</h3>
                            <ul className="list-disc list-inside space-y-2 pl-4">
                                <li><strong>Company Section:</strong> Enter a single score out of 10 for each member.</li>
                                <li><strong>Junior Section:</strong> Enter two scores: one for Uniform (out of 10) and one for Behaviour (out of 5). The app will automatically calculate the total.</li>
                            </ul>
                             <Callout>If you leave a score blank for a present member, it will be saved as 0.</Callout>
                        </div>
                        
                        <div id="saving-marks" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">Saving Marks</h3>
                            <p>As soon as you make a change, a floating save button will appear in the bottom-right corner. Click this to save all marks for the selected date. It will turn green briefly to confirm the save was successful.</p>
                            <div className="flex justify-center">
                                <button disabled className={`w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center bg-green-500`}>
                                    <SaveIcon className="h-7 w-7" />
                                </button>
                            </div>
                        </div>
                    </section>
                    
                     {/* Viewing Records */}
                    <section id="viewing-records" className="space-y-8 scroll-mt-24">
                        <h2 className="text-3xl font-bold text-slate-800 border-b pb-2">4. Viewing & Correcting Records</h2>
                        
                        <div id="member-history" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">Viewing a Member's Full Mark History</h3>
                            <p>From the Home page, click the <strong className="text-slate-600">bar chart icon</strong> (<ChartBarIcon className="inline h-4 w-4 align-text-bottom"/>) next to any member. This will take you to their personal marks page, showing a complete history of their attendance and scores for the year.</p>
                        </div>
                        
                        <div id="correcting-marks" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">Correcting a Past Mark</h3>
                            <p>On a member's individual marks page, you can directly edit any score from a previous week. You can also change their attendance or delete a mark entry entirely using the trash can icon (<TrashIcon className="inline h-4 w-4 text-red-600 align-text-bottom"/>). Just like the Weekly Marks page, a save button will appear when you make changes.</p>
                        </div>
                    </section>
                    
                    {/* Dashboard */}
                    <section id="dashboard" className="space-y-4 scroll-mt-24">
                        <h2 className="text-3xl font-bold text-slate-800 border-b pb-2">5. Dashboard & Reporting</h2>
                        <p>The Dashboard gives you a bird's-eye view of your section's performance. It displays a table with all members, showing their total marks for each month and their all-time total for the session. This is great for tracking progress and identifying top performers.</p>
                        <div className="shadow-md rounded-lg overflow-hidden border border-slate-200">
                             <table className="min-w-full bg-white text-sm">
                                <thead className="bg-slate-100">
                                <tr>
                                    <th className="py-2 px-2 text-left font-semibold text-slate-900">Name</th>
                                    <th className="px-2 py-2 text-center font-semibold text-slate-900">Sep 2024</th>
                                    <th className="px-2 py-2 text-center font-semibold text-slate-900">Oct 2024</th>
                                    <th className="px-2 py-2 text-center font-semibold text-slate-900">Total</th>
                                </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="py-2 px-2 font-medium text-red-600">John Smith</td>
                                        <td className="px-2 py-2 text-center text-slate-500">35</td>
                                        <td className="px-2 py-2 text-center text-slate-500">42</td>
                                        <td className="px-2 py-2 text-center font-semibold text-slate-900">77</td>
                                    </tr>
                                </tbody>
                             </table>
                        </div>
                    </section>
                    
                    {/* Administration */}
                    <section id="administration" className="space-y-8 scroll-mt-24">
                        <h2 className="text-3xl font-bold text-slate-800 border-b pb-2">6. App Administration</h2>
                        
                        <div id="audit-log" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">The Audit Log</h3>
                            <p>The Audit Log is a complete history of every action taken in the app, such as creating a member, updating marks, or deleting a boy. It shows what the action was, who did it, and when. This provides accountability and makes it easy to track changes.</p>
                        </div>
                        
                        <div id="reverting-actions" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">How to Revert an Action</h3>
                            <p>Made a mistake? No problem. In the Audit Log, most actions have a <strong className={`${accentTextColor}`}>Revert</strong> button (<UndoIcon className="inline h-4 w-4 align-text-bottom"/>). Clicking this will undo the action. For example, if you accidentally delete a member, reverting the action will restore them with all their previous marks intact.</p>
                        </div>
                        
                        <div id="settings-page" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">Changing Settings</h3>
                            <p>On the Settings page (<CogIcon className="inline h-4 w-4 align-text-bottom"/>), you can customize the app's behavior. Currently, you can set your section's official meeting day. This will make the Weekly Marks page automatically select the correct date for you.</p>
                        </div>
                        
                        <div id="sign-out" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">Signing Out</h3>
                            <p>When you're finished, click the "Sign Out" button in the header to securely log out of your account.</p>
                        </div>
                    </section>
                    
                    {/* Inviting Officers */}
                    <section id="inviting-officers" className="space-y-8 scroll-mt-24">
                        <h2 className="text-3xl font-bold text-slate-800 border-b pb-2">7. Inviting New Officers</h2>
                        <p>To improve security and streamline onboarding, new officers must be invited via a unique link before they can create an account.</p>
                        
                        <div id="sending-invite" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">How to Invite an Officer</h3>
                            <ol className="list-decimal list-inside space-y-2 pl-4">
                                <li>Navigate to the <strong>Settings</strong> page using the cog icon (<CogIcon className="inline h-4 w-4 align-text-bottom"/>) in the header.</li>
                                <li>Find the "Invite New Officer" section.</li>
                                <li>Optionally, add a note to remember who the link is for (e.g., "For John Smith").</li>
                                <li>Click the <strong className={`${accentTextColor}`}>Generate Invite Link</strong> button.</li>
                                <li>A pop-up will appear with the unique, single-use link. Click the copy icon (<ClipboardIcon className="inline h-4 w-4 align-text-bottom"/>) to copy it.</li>
                                <li>Send this link to the new officer via text, email, or any other method.</li>
                            </ol>
                            <Callout>You can see all your unused links in the "Pending Invite Links" list and revoke one at any time by clicking the trash can icon.</Callout>
                            <SettingsInvitePreview />
                        </div>

                        <div id="creating-account-invite" className="space-y-4 scroll-mt-24">
                            <h3 className="text-2xl font-semibold text-slate-700">Signing Up with an Invitation Link</h3>
                            <p>A new officer who receives a link should follow these steps:</p>
                            <ol className="list-decimal list-inside space-y-2 pl-4">
                                <li>Click the invitation link. They will be taken directly to the account creation page.</li>
                                <li>On the sign-up page, they must enter their email address and a secure password.</li>
                                <li>Click "Create Account". They will be logged in and can start using the app. The link they used will now be invalid.</li>
                            </ol>
                            <SignUpPreview />
                        </div>
                    </section>

                    {/* Offline Use */}
                    <section id="offline-use" className="space-y-4 scroll-mt-24">
                        <h2 className="text-3xl font-bold text-slate-800 border-b pb-2">8. Offline Use & Data Syncing</h2>
                        <p>The app is designed to work without an internet connection. All your data is saved securely in your browser. You can add members, enter marks, and make any other changes while offline.</p>
                        <p>When your device reconnects to the internet, the app will automatically sync all the changes you made with the central database, ensuring all officers have the most up-to-date information.</p>
                    </section>

                </main>
            </div>
        </div>
    );
};

export default HelpPage;