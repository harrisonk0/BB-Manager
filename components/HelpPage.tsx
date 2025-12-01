import React from 'react';
import { LoginPreview, DashboardPreview } from './help/HelpPreviews';

const HelpPage: React.FC = () => {
    return (
        <div className="bg-white rounded-lg shadow-xl flex flex-col h-full p-6">
            <h1 className="text-2xl font-bold mb-4">User Guide</h1>
            <div className="space-y-8 overflow-y-auto">
                <section>
                    <h2 className="text-xl font-bold">1. Getting Started</h2>
                    <p>Welcome! This app helps you manage your section.</p>
                    <LoginPreview />
                </section>
                <section>
                    <h2 className="text-xl font-bold">5. Dashboard</h2>
                    <p>View stats and trends.</p>
                    <DashboardPreview />
                </section>
                {/* Other sections would follow similarly */}
            </div>
        </div>
    );
};

export default HelpPage;